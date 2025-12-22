"use server";

/**
 * @fileoverview Server action for attaching additional scans to existing invoices.
 * @module lib/actions/invoices/attachInvoiceScan
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

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {API_URL} from "@/lib/utils.server";
import type {CreateInvoiceScanDtoPayload} from "@/types/invoices";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

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
type ServerActionOutputType = Promise<void>;

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
 * **Error Handling**: Throws on validation, auth, or API failures.
 *
 * @param input - The invoice ID and scan payload
 * @param input.invoiceId - UUIDv4 of the invoice to attach scan to
 * @param input.payload - Scan details: type, Azure Blob URL, optional metadata
 * @returns Promise that resolves when scan is successfully attached
 * @throws {Error} When invoiceId is not a valid GUID
 * @throws {Error} When authentication fails
 * @throws {Error} When API returns non-OK status (e.g., 400, 404)
 *
 * @example
 * ```typescript
 * import {attachInvoiceScan} from "@/lib/actions/invoices/attachInvoiceScan";
 * import {InvoiceScanType} from "@/types/invoices";
 *
 * await attachInvoiceScan({
 *   invoiceId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
 *   payload: {
 *     type: InvoiceScanType.Photo,
 *     location: "https://storage.blob.core.windows.net/invoices/scan.jpg",
 *     additionalMetadata: { page: "2" }
 *   }
 * });
 * ```
 *
 * @see {@link createInvoiceScan} for uploading the scan file first
 */
export async function attachInvoiceScan({invoiceId, payload}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{attachInvoiceScan}}, with:", {invoiceId, payload});

  return withSpan("api.actions.invoices.attachInvoiceScan", async () => {
    try {
      // Step 0. Validate input is correct
      logWithTrace("info", "Validating input for attachInvoiceScan", {invoiceId, payload}, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to attach the invoice scan
      addSpanEvent("bff.request.attach-scan.start");
      logWithTrace("info", "Making API request to attach invoice scan", {invoiceId}, "server");
      const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceId}/scans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      addSpanEvent("bff.request.attach-scan.complete");

      if (!response.ok) {
        addSpanEvent("bff.request.attach-scan.error");
        const errorText = await response.text();
        logWithTrace(
          "error",
          "BFF attach invoice scan request failed",
          {status: response.status, statusText: response.statusText, errorText},
          "server",
        );
        throw new Error(`BFF attach invoice scan request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (error) {
      addSpanEvent("bff.request.attach-scan.error");
      logWithTrace("error", "Error attaching the invoice scan", {error, invoiceId}, "server");
      console.error("Error attaching the invoice scan:", error);
      throw error;
    }
  });
}
