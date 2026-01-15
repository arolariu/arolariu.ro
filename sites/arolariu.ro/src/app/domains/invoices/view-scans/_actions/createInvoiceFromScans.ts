"use server";

/**
 * @fileoverview Server action for creating invoices from selected scans.
 * @module app/domains/invoices/view-scans/_actions/createInvoiceFromScans
 *
 * @remarks
 * This is a composite server action specific to the view-scans workflow.
 * It converts standalone scans into invoice entities. Supports two modes:
 * - **Single mode**: Each scan becomes a separate invoice
 * - **Batch mode**: Multiple scans combined into one invoice
 *
 * **Workflow**:
 * 1. User selects scans in `/view-scans`
 * 2. User chooses single or batch mode
 * 3. This action creates invoice(s) using existing scan URLs
 * 4. Scans are marked as archived after successful creation
 *
 * @see {@link fetchScans} for retrieving scans
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {API_URL} from "@/lib/utils.server";
import {type CreateInvoiceDtoPayload, type CreateInvoiceScanDtoPayload, type Invoice, InvoiceScanType} from "@/types/invoices";
import {type Scan, ScanType} from "@/types/scans";

/**
 * Input parameters for creating invoices from scans.
 */
type CreateInvoiceFromScansInput = Readonly<{
  /** The scans to convert to invoices. */
  scans: ReadonlyArray<Scan>;
  /**
   * Creation mode:
   * - "single": Each scan becomes a separate invoice
   * - "batch": All scans combined into one invoice
   */
  mode: "single" | "batch";
}>;

/**
 * Response from the create invoice operation.
 */
type CreateInvoiceFromScansOutput = Promise<
  Readonly<{
    /** Successfully created invoices */
    invoices: Invoice[];
    /** IDs of scans that were successfully converted */
    convertedScanIds: string[];
    /** Errors encountered during creation */
    errors: Array<{scanId: string; error: string}>;
  }>
>;

/**
 * Maps ScanType to InvoiceScanType enum.
 */
function scanTypeToInvoiceScanType(scanType: ScanType): InvoiceScanType {
  switch (scanType) {
    case ScanType.JPEG:
      return InvoiceScanType.JPEG;
    case ScanType.PNG:
      return InvoiceScanType.PNG;
    case ScanType.PDF:
      return InvoiceScanType.PDF;
    default:
      return InvoiceScanType.OTHER;
  }
}

/**
 * Creates a single invoice from a scan.
 */
async function createSingleInvoice(scan: Scan, userIdentifier: string, authToken: string): Promise<Invoice> {
  const payload: CreateInvoiceDtoPayload = {
    userIdentifier,
    initialScan: {
      scanType: scanTypeToInvoiceScanType(scan.scanType),
      location: scan.blobUrl,
      metadata: {},
    },
    metadata: {
      isImportant: "false",
      requiresAnalysis: "true",
      sourceScanId: scan.id,
    },
  };

  const response = await fetch(`${API_URL}/rest/v1/invoices`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create invoice: ${response.status} - ${errorText}`);
  }

  return response.json() as Promise<Invoice>;
}

/** Result type for invoice creation operations */
type CreationResult = {
  invoices: Invoice[];
  convertedScanIds: string[];
  errors: Array<{scanId: string; error: string}>;
};

/**
 * Attaches an additional scan to an existing invoice.
 */
async function attachScanToInvoice(invoiceId: string, scan: Scan, authToken: string): Promise<void> {
  const payload: CreateInvoiceScanDtoPayload = {
    type: scanTypeToInvoiceScanType(scan.scanType),
    location: scan.blobUrl,
    additionalMetadata: {
      sourceScanId: scan.id,
      attachedAt: new Date().toISOString(),
    },
  };

  const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceId}/scans`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to attach scan to invoice: ${response.status} - ${errorText}`);
  }
}

/**
 * Process a single scan to create an individual invoice.
 * Returns success/failure result without throwing.
 */
async function processSingleScan(
  scan: Scan,
  userIdentifier: string,
  authToken: string,
): Promise<{success: true; invoice: Invoice} | {success: false; error: string}> {
  try {
    const invoice = await createSingleInvoice(scan, userIdentifier, authToken);
    logWithTrace("info", `Created invoice ${invoice.id} from scan ${scan.id}`, {}, "server");
    return {success: true, invoice};
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logWithTrace("error", `Failed to create invoice from scan ${scan.id}`, {error}, "server");
    return {success: false, error: errorMessage};
  }
}

/**
 * Creates invoices in single mode - one invoice per scan.
 */
async function createInvoicesInSingleMode(
  scans: ReadonlyArray<Scan>,
  userIdentifier: string,
  authToken: string,
): Promise<CreationResult> {
  addSpanEvent("bff.invoices.create.single.start");
  logWithTrace("info", `Creating ${scans.length} individual invoices`, {count: scans.length}, "server");

  const invoices: Invoice[] = [];
  const convertedScanIds: string[] = [];
  const errors: Array<{scanId: string; error: string}> = [];

  for (const scan of scans) {
    const result = await processSingleScan(scan, userIdentifier, authToken);
    if (result.success) {
      invoices.push(result.invoice);
      convertedScanIds.push(scan.id);
    } else {
      errors.push({scanId: scan.id, error: result.error});
    }
  }

  addSpanEvent("bff.invoices.create.single.complete");
  return {invoices, convertedScanIds, errors};
}

/**
 * Attaches remaining scans to an invoice in batch mode.
 */
async function attachRemainingScans(
  invoiceId: string,
  scans: ReadonlyArray<Scan>,
  authToken: string,
): Promise<{convertedScanIds: string[]; errors: Array<{scanId: string; error: string}>}> {
  const convertedScanIds: string[] = [];
  const errors: Array<{scanId: string; error: string}> = [];

  for (let i = 1; i < scans.length; i++) {
    const scan = scans[i];
    if (scan) {
      try {
        await attachScanToInvoice(invoiceId, scan, authToken);
        convertedScanIds.push(scan.id);
        logWithTrace("info", `Attached scan ${scan.id} to invoice ${invoiceId}`, {}, "server");
      } catch (attachError) {
        const attachErrorMessage = attachError instanceof Error ? attachError.message : "Unknown error";
        errors.push({scanId: scan.id, error: attachErrorMessage});
        logWithTrace("error", `Failed to attach scan ${scan.id} to invoice ${invoiceId}`, {error: attachError}, "server");
      }
    }
  }

  return {convertedScanIds, errors};
}

/**
 * Creates a single invoice with multiple scans in batch mode.
 */
async function createInvoicesInBatchMode(
  scans: ReadonlyArray<Scan>,
  userIdentifier: string,
  authToken: string,
): Promise<CreationResult> {
  addSpanEvent("bff.invoice.create.batch.start");
  logWithTrace("info", `Creating batch invoice from ${scans.length} scans`, {count: scans.length}, "server");

  const [firstScan] = scans;
  if (!firstScan) {
    throw new Error("No scans provided for batch creation");
  }

  try {
    // Create invoice with first scan
    const invoice = await createSingleInvoice(firstScan, userIdentifier, authToken);
    logWithTrace("info", `Created invoice ${invoice.id} with initial scan ${firstScan.id}`, {}, "server");

    // Attach remaining scans
    const {convertedScanIds, errors} = await attachRemainingScans(invoice.id, scans, authToken);

    logWithTrace(
      "info",
      `Created batch invoice ${invoice.id} with ${convertedScanIds.length + 1} scans attached`,
      {invoiceId: invoice.id, scansAttached: convertedScanIds.length + 1},
      "server",
    );

    addSpanEvent("bff.invoice.create.batch.complete");
    return {
      invoices: [invoice],
      convertedScanIds: [firstScan.id, ...convertedScanIds],
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logWithTrace("error", "Failed to create batch invoice", {error}, "server");

    // In batch mode, initial creation failure affects all scans
    const errors = scans.map((scan) => ({scanId: scan.id, error: errorMessage}));
    addSpanEvent("bff.invoice.create.batch.complete");
    return {invoices: [], convertedScanIds: [], errors};
  }
}

/**
 * Creates invoices from selected scans.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches user from auth service.
 *
 * **Single Mode**:
 * Each scan becomes an independent invoice. If one fails, others continue.
 *
 * **Batch Mode**:
 * Creates a single invoice with the first scan as the initial scan,
 * then attaches all additional scans to the same invoice. If an attachment
 * fails, the error is logged but other attachments continue.
 *
 * **Error Handling**:
 * In single mode, errors are collected per scan. Successfully created
 * invoices are returned even if some fail.
 *
 * **Side Effects**: Emits OpenTelemetry spans for tracing.
 *
 * @param input - Creation parameters
 * @returns Object with created invoices, converted scan IDs, and errors
 *
 * @example
 * ```typescript
 * // Single mode - one invoice per scan
 * const result = await createInvoiceFromScans({
 *   scans: selectedScans,
 *   mode: "single"
 * });
 *
 * // Archive converted scans
 * scansStore.archiveScans(result.convertedScanIds);
 *
 * // Add new invoices to store
 * result.invoices.forEach(inv => invoicesStore.upsertInvoice(inv));
 * ```
 */
export async function createInvoiceFromScans({scans, mode}: CreateInvoiceFromScansInput): CreateInvoiceFromScansOutput {
  console.info(">>> Executing server action::createInvoiceFromScans");

  return withSpan("api.actions.scans.createInvoiceFromScans", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userIdentifier, userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      if (!userIdentifier) {
        throw new Error("User must be authenticated to create invoices");
      }

      // Step 2. Create invoices based on mode
      const result =
        mode === "single"
          ? await createInvoicesInSingleMode(scans, userIdentifier, authToken)
          : await createInvoicesInBatchMode(scans, userIdentifier, authToken);

      logWithTrace(
        "info",
        `Completed invoice creation: ${result.invoices.length} created, ${result.errors.length} errors`,
        {created: result.invoices.length, errors: result.errors.length},
        "server",
      );

      return result;
    } catch (error) {
      addSpanEvent("bff.invoices.create.error");
      logWithTrace("error", "Error creating invoices from scans", {error}, "server");
      console.error("Error creating invoices from scans:", error);
      throw error;
    }
  });
}
