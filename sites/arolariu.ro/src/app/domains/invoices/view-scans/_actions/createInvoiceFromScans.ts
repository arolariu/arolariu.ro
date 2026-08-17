"use server";

/**
 * @fileoverview Creates invoice records from selected scans and durably enqueues analysis.
 * @module app/domains/invoices/view-scans/_actions/createInvoiceFromScans
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionErrorCode, type ServerActionResult} from "@/lib/utils.server";
import {AnalysisProfile, type CreateInvoiceDtoPayload, type CreateInvoiceScanDtoPayload, type Invoice} from "@/types/invoices";
import {type Scan, ScanMetadataKey, ScanMetadataStatus} from "@/types/scans";
import {analyzeInvoice} from "../../_actions/invoices";
import {updateScan} from "../../_actions/scans";
import {scanTypeToInvoiceScanType} from "../../_utils/mimeTypeUtilities";

/** Client-safe message for an unavailable invoice-creation operation. */
const CREATE_INVOICES_FAILURE_MESSAGE = "Unable to create invoices. Please try again.";
/** Client-safe message for unauthenticated invoice creation. */
const CREATE_INVOICES_AUTH_MESSAGE = "You must be authenticated to create invoices.";

/**
 * Input parameters for creating invoices from scans.
 */
type CreateInvoiceFromScansInput = Readonly<{
  /** The scans to convert to invoices. */
  scans: ReadonlyArray<Scan>;
  /** Whether scans create individual invoices or one invoice with attachments. */
  mode: "single" | "batch";
}>;

/**
 * Safe per-scan creation failure returned to the client.
 *
 * Backend error bodies, exception messages, OCR output, and scan locations are
 * deliberately excluded from this contract.
 */
type ScanCreationFailure = Readonly<{
  /** Identifier of the selected scan that could not be converted. */
  scanId: string;
  /** Stable category of the failed operation. */
  code: ServerActionErrorCode;
}>;

/**
 * Safe durable-enqueue outcome for a created invoice.
 */
type AnalysisEnqueueOutcome =
  | Readonly<{
      /** Created invoice identifier. */
      invoiceIdentifier: string;
      /** The analysis service durably accepted the work with HTTP 202. */
      status: "queued";
    }>
  | Readonly<{
      /** Created invoice identifier. */
      invoiceIdentifier: string;
      /** The invoice exists, but its analysis request was not accepted. */
      status: "not_queued";
      /** Stable category of the enqueue rejection. */
      errorCode: ServerActionErrorCode;
    }>;

/**
 * Successful invoice-conversion data.
 */
type CreateInvoicesFromScansData = Readonly<{
  /** Invoices created by the operation. */
  invoices: ReadonlyArray<Invoice>;
  /** Selected scan IDs that were successfully attached to invoices. */
  convertedScanIds: ReadonlyArray<string>;
  /** Client-safe per-scan creation or attachment failures. */
  errors: ReadonlyArray<ScanCreationFailure>;
  /** Durable analysis enqueue outcome for each created invoice. */
  analysis: ReadonlyArray<AnalysisEnqueueOutcome>;
}>;

/** Result for the create-invoices-from-scans server action. */
type CreateInvoiceFromScansOutput = ServerActionResult<CreateInvoicesFromScansData>;

/**
 * Internal result for one invoice-creation request.
 */
type InvoiceRequestResult = Readonly<{success: true; invoice: Invoice}> | Readonly<{success: false; code: ServerActionErrorCode}>;

/**
 * Internal aggregate used while processing one mode.
 */
type CreationResult = {
  invoices: Invoice[];
  convertedScanIds: string[];
  errors: ScanCreationFailure[];
  analysis: AnalysisEnqueueOutcome[];
};

/**
 * Logs a bounded operation event without input, response-body, or exception data.
 *
 * @param level - Structured log severity.
 * @param operation - Bounded operation name.
 * @param attributes - Safe HTTP status and error-code attributes.
 */
function logSafeOperation(
  level: "info" | "warn" | "error",
  operation: string,
  attributes: Readonly<{httpStatus?: number; errorCode?: ServerActionErrorCode}> = {},
): void {
  logWithTrace(level, operation, attributes, "server");
}

/**
 * Resolves a stable client-safe message for an action-level creation failure.
 *
 * @param code - Stable error category.
 * @returns A client-safe message with no backend content.
 */
function createSafeFailureMessage(code: ServerActionErrorCode): string {
  if (code === "AUTH_ERROR") {
    return CREATE_INVOICES_AUTH_MESSAGE;
  }

  if (code === "VALIDATION_ERROR") {
    return "Unable to create invoices with the provided details.";
  }

  if (code === "SERVER_ERROR") {
    return "Invoice creation is temporarily unavailable. Please try again.";
  }

  return CREATE_INVOICES_FAILURE_MESSAGE;
}

/**
 * Creates the request body for an invoice's first scan.
 *
 * @param scan - Scan selected by the authenticated user.
 * @param userIdentifier - Authenticated user identifier.
 * @returns Backend invoice-create payload.
 */
function createInvoicePayload(scan: Scan, userIdentifier: string): CreateInvoiceDtoPayload {
  return {
    userIdentifier,
    initialScan: {
      scanType: scanTypeToInvoiceScanType(scan.scanType),
      location: scan.blobUrl,
      metadata: {
        sourceScanId: scan.metadata.scanId,
        sourceOwnerId: scan.metadata.ownerId,
        documentKind: scan.metadata.documentKind,
        documentRole: scan.metadata.documentRole,
        uploadedAt: scan.metadata.uploadedAt.toISOString(),
      },
    },
    metadata: {
      isImportant: "false",
      requiresAnalysis: "true",
      sourceScanId: scan.id,
    },
  };
}

/**
 * Creates one invoice without exposing backend error content.
 *
 * @param scan - Scan that becomes the invoice's initial attachment.
 * @param userIdentifier - Authenticated user identifier.
 * @param authToken - Authenticated API token.
 * @returns The created invoice or a stable failure code.
 */
async function createSingleInvoice(scan: Scan, userIdentifier: string, authToken: string): Promise<InvoiceRequestResult> {
  try {
    const response = await fetchWithTimeout("/rest/v1/invoices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createInvoicePayload(scan, userIdentifier)),
    });

    if (!response.ok) {
      const code = mapHttpStatusToErrorCode(response.status);
      logSafeOperation("warn", "invoice.create.rejected", {httpStatus: response.status, errorCode: code});
      return {success: false, code};
    }

    return {success: true, invoice: (await response.json()) as Invoice};
  } catch {
    logSafeOperation("error", "invoice.create.failed", {errorCode: "NETWORK_ERROR"});
    return {success: false, code: "NETWORK_ERROR"};
  }
}

/**
 * Attaches a selected scan to an already-created batch invoice.
 *
 * @param invoiceIdentifier - Invoice receiving the attachment.
 * @param scan - Scan to attach.
 * @param authToken - Authenticated API token.
 * @returns A stable success or failure result.
 */
async function attachScanToInvoice(
  invoiceIdentifier: string,
  scan: Scan,
  authToken: string,
): Promise<Readonly<{success: true}> | Readonly<{success: false; code: ServerActionErrorCode}>> {
  const payload: CreateInvoiceScanDtoPayload = {
    type: scanTypeToInvoiceScanType(scan.scanType),
    location: scan.blobUrl,
    additionalMetadata: {
      sourceScanId: scan.metadata.scanId,
      sourceOwnerId: scan.metadata.ownerId,
      documentKind: scan.metadata.documentKind,
      documentRole: scan.metadata.documentRole,
      attachedAt: new Date().toISOString(),
    },
  };

  try {
    const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceIdentifier}/scans`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const code = mapHttpStatusToErrorCode(response.status);
      logSafeOperation("warn", "invoice.scan.attach.rejected", {httpStatus: response.status, errorCode: code});
      return {success: false, code};
    }

    return {success: true};
  } catch {
    logSafeOperation("error", "invoice.scan.attach.failed", {errorCode: "NETWORK_ERROR"});
    return {success: false, code: "NETWORK_ERROR"};
  }
}

/**
 * Awaits only the analysis service's durable HTTP 202 acknowledgement.
 *
 * @param invoiceIdentifier - Created invoice for which to enqueue analysis.
 * @returns A client-safe enqueue outcome; this never waits for worker completion.
 */
async function enqueueInvoiceAnalysis(invoiceIdentifier: string): Promise<AnalysisEnqueueOutcome> {
  try {
    const result = await analyzeInvoice({
      invoiceIdentifier,
      request: {profile: AnalysisProfile.Comprehensive, overrides: {}},
    });

    if (result.success) {
      logSafeOperation("info", "invoice.analysis.enqueue.accepted");
      return {invoiceIdentifier, status: "queued"};
    }

    logSafeOperation("warn", "invoice.analysis.enqueue.rejected", {errorCode: result.error.code});
    return {invoiceIdentifier, status: "not_queued", errorCode: result.error.code};
  } catch {
    logSafeOperation("error", "invoice.analysis.enqueue.failed", {errorCode: "NETWORK_ERROR"});
    return {invoiceIdentifier, status: "not_queued", errorCode: "NETWORK_ERROR"};
  }
}

/**
 * Persists attachment metadata without allowing a non-critical metadata update
 * to change the completed invoice or durable analysis result.
 *
 * @param scan - Attached scan.
 * @param invoice - Invoice that owns the scan.
 * @param userIdentifier - Authenticated user identifier.
 */
function persistAttachmentMetadata(scan: Scan, invoice: Invoice, userIdentifier: string): void {
  void updateScan({
    scanId: scan.id,
    metadataAdd: {
      status: ScanMetadataStatus.ATTACHED,
      attachedAt: new Date(),
      attachedBy: userIdentifier,
      attachedTo: invoice.id,
    },
    metadataRemove: [
      ScanMetadataKey.DETACHED_AT,
      ScanMetadataKey.DETACHED_BY,
      ScanMetadataKey.DETACHED_FROM,
      ScanMetadataKey.ARCHIVED_AT,
      ScanMetadataKey.ARCHIVED_BY,
    ],
  })
    .then((result) => {
      if (!result.success) {
        logSafeOperation("warn", "scan.attachment-metadata.rejected", {errorCode: result.error.code});
      }
    })
    .catch(() => {
      logSafeOperation("warn", "scan.attachment-metadata.failed", {errorCode: "NETWORK_ERROR"});
    });
}

/**
 * Processes selected scans as independent invoices.
 *
 * @param scans - Selected scans.
 * @param userIdentifier - Authenticated user identifier.
 * @param authToken - Authenticated API token.
 * @returns Successful creations, safe per-scan failures, and enqueue outcomes.
 */
async function createInvoicesInSingleMode(scans: ReadonlyArray<Scan>, userIdentifier: string, authToken: string): Promise<CreationResult> {
  const result: CreationResult = {invoices: [], convertedScanIds: [], errors: [], analysis: []};

  for (const scan of scans) {
    const invoiceResult = await createSingleInvoice(scan, userIdentifier, authToken);
    if (!invoiceResult.success) {
      result.errors.push({scanId: scan.id, code: invoiceResult.code});
      continue;
    }

    const analysis = await enqueueInvoiceAnalysis(invoiceResult.invoice.id);
    result.invoices.push(invoiceResult.invoice);
    result.convertedScanIds.push(scan.id);
    result.analysis.push(analysis);
    persistAttachmentMetadata(scan, invoiceResult.invoice, userIdentifier);
  }

  return result;
}

/**
 * Processes selected scans as one invoice with additional attachments.
 *
 * @param scans - Selected scans.
 * @param userIdentifier - Authenticated user identifier.
 * @param authToken - Authenticated API token.
 * @returns Successful creation, safe per-scan failures, and enqueue outcome.
 */
async function createInvoicesInBatchMode(scans: ReadonlyArray<Scan>, userIdentifier: string, authToken: string): Promise<CreationResult> {
  const firstScan = scans[0];
  if (!firstScan) {
    return {
      invoices: [],
      convertedScanIds: [],
      errors: [],
      analysis: [],
    };
  }

  const initialInvoice = await createSingleInvoice(firstScan, userIdentifier, authToken);
  if (!initialInvoice.success) {
    return {
      invoices: [],
      convertedScanIds: [],
      errors: scans.map((scan) => ({scanId: scan.id, code: initialInvoice.code})),
      analysis: [],
    };
  }

  const result: CreationResult = {
    invoices: [initialInvoice.invoice],
    convertedScanIds: [firstScan.id],
    errors: [],
    analysis: [],
  };

  for (const scan of scans.slice(1)) {
    const attachment = await attachScanToInvoice(initialInvoice.invoice.id, scan, authToken);
    if (attachment.success) {
      result.convertedScanIds.push(scan.id);
    } else {
      result.errors.push({scanId: scan.id, code: attachment.code});
    }
  }

  result.analysis.push(await enqueueInvoiceAnalysis(initialInvoice.invoice.id));
  for (const scan of scans.filter((candidate) => result.convertedScanIds.includes(candidate.id))) {
    persistAttachmentMetadata(scan, initialInvoice.invoice, userIdentifier);
  }

  return result;
}

/**
 * Creates invoices from selected scans and awaits each durable analysis enqueue acknowledgement.
 *
 * @remarks
 * This action waits for the invoice API and the analysis API's HTTP 202 response,
 * but it never polls or waits for OCR, provider, or worker completion. It returns
 * an explicit failure result for authentication and request-level failures; a
 * rejected analysis enqueue remains a partial success because the invoice exists.
 *
 * @param input - Selected scans and invoice-creation mode.
 * @returns Created invoices, safe conversion failures, and durable enqueue outcomes.
 */
export async function createInvoiceFromScans({scans, mode}: CreateInvoiceFromScansInput): CreateInvoiceFromScansOutput {
  return withSpan("api.actions.scans.createInvoiceFromScans", async () => {
    try {
      addSpanEvent("bff.invoices.create.start");
      const {userIdentifier, userJwt: authToken} = await fetchBFFUserFromAuthService();
      if (!userIdentifier) {
        addSpanEvent("bff.invoices.create.auth-error");
        logSafeOperation("warn", "invoice.create-from-scans.unauthenticated", {errorCode: "AUTH_ERROR"});
        return {
          success: false,
          error: {code: "AUTH_ERROR", message: CREATE_INVOICES_AUTH_MESSAGE},
        } as const;
      }

      if (mode === "batch" && scans.length === 0) {
        return {
          success: false,
          error: {code: "VALIDATION_ERROR", message: "Select at least one scan to create an invoice."},
        } as const;
      }

      const result =
        mode === "single"
          ? await createInvoicesInSingleMode(scans, userIdentifier, authToken)
          : await createInvoicesInBatchMode(scans, userIdentifier, authToken);

      if (result.invoices.length === 0 && result.errors.length > 0) {
        const firstFailure = result.errors[0];
        const errorCode = firstFailure?.code ?? "UNKNOWN_ERROR";
        addSpanEvent("bff.invoices.create.rejected", {errorCode});
        logSafeOperation("warn", "invoice.create-from-scans.rejected", {errorCode});
        return {
          success: false,
          error: {code: errorCode, message: createSafeFailureMessage(errorCode)},
        } as const;
      }

      addSpanEvent("bff.invoices.create.complete");
      logSafeOperation("info", "invoice.create-from-scans.complete");
      return {success: true, data: result} as const;
    } catch {
      addSpanEvent("bff.invoices.create.error");
      logSafeOperation("error", "invoice.create-from-scans.failed", {errorCode: "NETWORK_ERROR"});
      return {
        success: false,
        error: {code: "NETWORK_ERROR", message: CREATE_INVOICES_FAILURE_MESSAGE},
      } as const;
    }
  }) satisfies CreateInvoiceFromScansOutput;
}
