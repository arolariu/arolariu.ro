"use server";

/**
 * @fileoverview Server action for attaching additional scans to existing invoices.
 * @module app/domains/invoices/_actions/invoices/scans/attachInvoiceScan
 *
 * @remarks
 * Allows users to add supplementary scans to an invoice after initial creation.
 * This is useful for:
 * - Multi-page invoices
 * - Receipt attachments
 * - Supporting documentation
 *
 * **Workflow**:
 * 1. Upload scan to Azure Blob via {@link createInvoiceScan}
 * 2. Attach the uploaded scan URL to the invoice via this action
 *
 * @see {@link createInvoiceScan} for uploading new scans
 * @see {@link CreateInvoiceScanDtoPayload} for scan payload structure
 */

import { addSpanEvent, logWithTrace, withSpan } from "@/instrumentation.server";
import { fetchBFFUserFromAuthService } from "@/lib/actions/user/fetchUser";
import { validateStringIsGuidType } from "@/lib/utils.generic";
import { createErrorResult, fetchWithTimeout, type ServerActionResult } from "@/lib/utils.server";
import type { CreateInvoiceScanDtoPayload } from "@/types/invoices";

/**
 * Input parameters for attaching a scan to an invoice.
 *
 * @property invoiceId - UUIDv4 of the target invoice
 * @property payload - Scan details including type, location URL, and metadata
 */
type ServerActionInputType = Readonly<{
  /** The ID of the invoice to attach the scan to. */
  readonly invoiceId: string;
  /** The scan payload containing type, location, and metadata. */
  readonly payload: CreateInvoiceScanDtoPayload;
}>;

/**
 * Output type indicating async completion with no return value.
 */
type ServerActionOutputType = ServerActionResult<void>;

/**
 * Attaches a new scan to an existing invoice entity.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches JWT from Clerk auth service.
 *
 * **Scan Types**:
 * - `Photo`: Camera capture of physical receipt
 * - `Document`: PDF or scanned document
 * - `Screenshot`: Digital receipt capture
 *
 * **Side Effects**:
 * - Emits OpenTelemetry spans for tracing
 * - Updates invoice aggregate with new scan reference
 * - May trigger re-analysis if configured
 *
 * **Error Handling**: Returns a `ServerActionResult<void>` instead of throwing directly.
 *
 * @param input - The invoice ID and scan payload.
 * @param input.invoiceId - UUIDv4 of the invoice to attach the scan to.
 * @param input.payload - Scan details, including type, Azure Blob URL, and optional metadata.
 * @returns A result object with void data on success, or an error result when validation, authorization, or the backend request fails.
 *
 * @example
 * ```typescript
 * import {attachInvoiceScan} from "@/lib/actions/invoices/attachInvoiceScan";
 * import {InvoiceScanType} from "@/types/invoices";
 *
 * const result = await attachInvoiceScan({
 *   invoiceId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
 *   payload: {
 *     type: InvoiceScanType.Photo,
 *     location: "https://storage.blob.core.windows.net/invoices/scan.jpg",
 *     additionalMetadata: { page: "2" }
 *   }
 * });
 *
 * if (!result.success) {
 *   console.error("Failed to attach scan:", result.error);
 * }
 * ```
 *
 * @see {@link createInvoiceScan} for uploading the scan file first
 */
export async function attachInvoiceScan({ invoiceId, payload }: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{attachInvoiceScan}}, with:", { invoiceId, payload });

  return withSpan("api.actions.invoices.attachInvoiceScan", async () => {
    try {
      // Step 0. Validate invoice identifier is valid GUID
      logWithTrace("info", "Validating identifier is valid...", { invoiceId }, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const { userJwt: authToken } = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to attach the invoice scan
      addSpanEvent("bff.request.attach-scan.start");
      logWithTrace("info", "Making API request to attach invoice scan...", { invoiceId }, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/scans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      addSpanEvent("bff.request.attach-scan.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully attached scan to invoice...", { invoiceId }, "server");
        return { success: true, data: undefined } as const;
      }

      addSpanEvent("bff.request.attach-scan.error");
      const errorText = await response.text();
      const internalMessage = `Failed to attach invoice scan: ${response.status} ${response.statusText}`;
      const userMessage = response.status === 404
        ? "Invoice not found. Please refresh and try again."
        : response.status === 400
          ? "Invalid scan data. Please check the scan details and try again."
          : "An unexpected error occurred while attaching the scan. Please try again.";
      logWithTrace("error", internalMessage, { invoiceId, errorText }, "server");
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.attach-scan.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error attaching the invoice scan", { error: errorMessage, invoiceId }, "server");
      console.error("Error attaching the invoice scan:", errorMessage, error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
