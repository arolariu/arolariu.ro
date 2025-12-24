"use server";

/**
 * @fileoverview Server action for removing scans from existing invoices.
 * @module lib/actions/invoices/deleteInvoiceScan
 *
 * @remarks
 * Removes a scan reference from an invoice. The actual blob in Azure Storage
 * is marked for deletion and cleaned up by a background job after a retention period.
 *
 * **Constraints**:
 * - An invoice must retain at least one scan
 * - Only the invoice owner can delete scans
 *
 * @see {@link attachInvoiceScan} for adding scans to invoices
 * @see {@link DeleteInvoiceScanDtoPayload} for the payload structure
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {API_URL} from "@/lib/utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input parameters for deleting a scan from an invoice.
 *
 * @property invoiceId - UUIDv4 of the target invoice
 * @property scanLocation - The blob URL of the scan to delete
 */
type ServerActionInputType = Readonly<{
  /** The ID of the invoice containing the scan. */
  readonly invoiceId: string;
  /** The blob URL (location) of the scan to delete. */
  readonly scanLocation: string;
}>;

/**
 * Output type indicating async completion with no return value.
 */
type ServerActionOutputType = Promise<void>;

/**
 * Deletes a scan from an existing invoice entity.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches JWT from Clerk auth service.
 *
 * **Deletion Behavior**:
 * - Removes scan reference from invoice entity
 * - Azure blob marked for cleanup (not immediately deleted)
 * - Fails if attempting to delete the last remaining scan
 *
 * **Side Effects**:
 * - Emits OpenTelemetry spans for tracing
 * - Updates invoice aggregate to remove scan reference
 *
 * **Error Handling**: Throws on validation, auth, or API failures.
 *
 * @param input - The invoice ID and scan location
 * @param input.invoiceId - UUIDv4 of the invoice containing the scan
 * @param input.scanLocation - The blob URL of the scan to delete
 * @returns Promise that resolves when scan is successfully deleted
 * @throws {Error} When invoiceId is not a valid GUID
 * @throws {Error} When attempting to delete the last scan
 * @throws {Error} When authentication fails
 * @throws {Error} When API returns non-OK status
 *
 * @example
 * ```typescript
 * import {deleteInvoiceScan} from "@/lib/actions/invoices/deleteInvoiceScan";
 *
 * await deleteInvoiceScan({
 *   invoiceId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
 *   scanLocation: "https://storage.blob.core.windows.net/invoices/scan.jpg"
 * });
 * ```
 *
 * @see {@link attachInvoiceScan} for adding scans
 */
export async function deleteInvoiceScan({invoiceId, scanLocation}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{deleteInvoiceScan}}, with:", {invoiceId, scanLocation});

  return withSpan("api.actions.invoices.deleteInvoiceScan", async () => {
    try {
      // Step 0. Validate input is correct
      logWithTrace("info", "Validating input for deleteInvoiceScan", {invoiceId, scanLocation}, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      if (!scanLocation || typeof scanLocation !== "string") {
        throw new Error("scanLocation must be a non-empty string");
      }

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to delete the scan
      // We encode the scan location as a URL parameter since it contains special characters
      addSpanEvent("bff.request.delete-scan.start");
      logWithTrace("info", "Making API request to delete invoice scan", {invoiceId, scanLocation}, "server");

      const encodedScanLocation = encodeURIComponent(scanLocation);
      const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceId}/scans?location=${encodedScanLocation}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.delete-scan.complete");

      if (!response.ok) {
        addSpanEvent("bff.request.delete-scan.error");
        const errorText = await response.text();
        logWithTrace(
          "error",
          "BFF delete invoice scan request failed",
          {status: response.status, statusText: response.statusText, errorText},
          "server",
        );
        throw new Error(`BFF delete invoice scan request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      logWithTrace("info", "Successfully deleted invoice scan", {invoiceId, scanLocation}, "server");
    } catch (error) {
      addSpanEvent("bff.request.delete-scan.error");
      logWithTrace("error", "Error deleting the invoice scan", {error, invoiceId, scanLocation}, "server");
      console.error("Error deleting the invoice scan:", error);
      throw error;
    }
  });
}
