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
import type {CreateInvoiceDtoPayload, CreateInvoiceScanDtoPayload, Invoice} from "@/types/invoices";
import {InvoiceScanType} from "@/types/invoices";
import type {Scan} from "@/types/scans";
import {ScanType} from "@/types/scans";

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
    const invoices: Invoice[] = [];
    const convertedScanIds: string[] = [];
    const errors: Array<{scanId: string; error: string}> = [];

    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userIdentifier, userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      if (!userIdentifier) {
        throw new Error("User must be authenticated to create invoices");
      }

      if (mode === "single") {
        // Single mode: Create one invoice per scan
        addSpanEvent("bff.invoices.create.single.start");
        logWithTrace("info", `Creating ${scans.length} individual invoices`, {count: scans.length}, "server");

        for (const scan of scans) {
          try {
            const invoice = await createSingleInvoice(scan, userIdentifier, authToken);
            invoices.push(invoice);
            convertedScanIds.push(scan.id);
            logWithTrace("info", `Created invoice ${invoice.id} from scan ${scan.id}`, {}, "server");
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            errors.push({scanId: scan.id, error: errorMessage});
            logWithTrace("error", `Failed to create invoice from scan ${scan.id}`, {error}, "server");
          }
        }

        addSpanEvent("bff.invoices.create.single.complete");
      } else {
        // Batch mode: Create one invoice with first scan, attach others
        addSpanEvent("bff.invoice.create.batch.start");
        logWithTrace("info", `Creating batch invoice from ${scans.length} scans`, {count: scans.length}, "server");

        const firstScan = scans[0];
        if (!firstScan) {
          throw new Error("No scans provided for batch creation");
        }

        try {
          // Create invoice with first scan
          const invoice = await createSingleInvoice(firstScan, userIdentifier, authToken);
          invoices.push(invoice);
          convertedScanIds.push(firstScan.id);
          logWithTrace("info", `Created invoice ${invoice.id} with initial scan ${firstScan.id}`, {}, "server");

          // Attach remaining scans to the invoice
          for (let i = 1; i < scans.length; i++) {
            const scan = scans[i];
            if (scan) {
              try {
                await attachScanToInvoice(invoice.id, scan, authToken);
                convertedScanIds.push(scan.id);
                logWithTrace("info", `Attached scan ${scan.id} to invoice ${invoice.id}`, {}, "server");
              } catch (attachError) {
                // Log the error but continue with other scans
                const attachErrorMessage = attachError instanceof Error ? attachError.message : "Unknown error";
                errors.push({scanId: scan.id, error: attachErrorMessage});
                logWithTrace("error", `Failed to attach scan ${scan.id} to invoice ${invoice.id}`, {error: attachError}, "server");
              }
            }
          }

          logWithTrace(
            "info",
            `Created batch invoice ${invoice.id} with ${convertedScanIds.length} scans attached`,
            {invoiceId: invoice.id, scansAttached: convertedScanIds.length},
            "server",
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error";
          // In batch mode, initial creation failure affects all scans
          for (const scan of scans) {
            errors.push({scanId: scan.id, error: errorMessage});
          }
          logWithTrace("error", "Failed to create batch invoice", {error}, "server");
        }

        addSpanEvent("bff.invoice.create.batch.complete");
      }

      logWithTrace(
        "info",
        `Completed invoice creation: ${invoices.length} created, ${errors.length} errors`,
        {created: invoices.length, errors: errors.length},
        "server",
      );
      return {invoices, convertedScanIds, errors} as const;
    } catch (error) {
      addSpanEvent("bff.invoices.create.error");
      logWithTrace("error", "Error creating invoices from scans", {error}, "server");
      console.error("Error creating invoices from scans:", error);
      throw error;
    }
  });
}
