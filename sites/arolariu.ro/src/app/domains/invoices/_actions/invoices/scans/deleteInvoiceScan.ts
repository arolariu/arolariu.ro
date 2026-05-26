"use server";

/**
 * @fileoverview Server action for removing scan references from invoices.
 * @module app/domains/invoices/_actions/invoices/scans/deleteInvoiceScan
 *
 * @remarks
 * Removes scan references from invoice entities via the backend API. The actual blob
 * in Azure Blob Storage is marked for deletion and cleaned up asynchronously by a
 * background job after a retention period for audit and recovery purposes.
 *
 * **Key Features:**
 * - Server-side execution with authentication
 * - GUID validation for invoice identifiers
 * - URL encoding for blob location query parameters
 * - Automatic cache revalidation for edit/view pages
 * - OpenTelemetry instrumentation for observability
 * - Structured error handling with context-specific user messages
 *
 * **Business Constraints:**
 * - Invoices must retain at least one scan (deletion fails for last scan)
 * - Only invoice owner can delete scans (enforced by backend)
 *
 * **Deletion Strategy:**
 * - Removes scan reference from invoice entity immediately
 * - Azure blob marked for cleanup (not immediately deleted)
 * - Background job cleans up orphaned blobs after retention period
 * - Soft deletion allows recovery within retention window
 *
 * @see {@link attachInvoiceScan} - Sibling action for adding scans
 * @see {@link createInvoiceScan} - Action for uploading new scans
 * @see {@link ServerActionResult} - Standard result wrapper type
 */

import { addSpanEvent, logWithTrace, withSpan } from "@/instrumentation.server";
import { fetchBFFUserFromAuthService } from "@/lib/actions/user/fetchUser";
import { validateStringIsGuidType } from "@/lib/utils.generic";
import { createErrorResult, fetchWithTimeout, type ServerActionResult } from "@/lib/utils.server";
import { revalidatePath } from "next/cache";

/**
 * Input parameters for the deleteInvoiceScan server action.
 *
 * @remarks
 * The invoiceId must be a valid UUIDv4 GUID.
 * The scanLocation is the full blob URL which will be URL-encoded for the API request.
 */
type ServerActionInputType = Readonly<{
  /** The unique identifier of the invoice. Must be a valid UUIDv4 GUID. */
  readonly invoiceId: string;
  /** The full blob URL of the scan to delete (e.g., "https://storage.blob.core.windows.net/invoices/scan.jpg"). */
  readonly scanLocation: string;
}>;

/**
 * Output result type for the deleteInvoiceScan server action.
 *
 * @remarks
 * Returns a ServerActionResult with void data on success.
 * On failure, includes error details and context-specific user-friendly message.
 */
type ServerActionOutputType = ServerActionResult<void>;

/**
 * Removes a scan reference from an invoice via the backend API.
 *
 * @remarks
 * **Execution Context:** Server-side only (Next.js server action).
 *
 * **Authentication:** Automatically fetches JWT token from auth service
 * via `fetchBFFUserFromAuthService`. Requires valid authenticated session.
 *
 * **Validation:** Validates invoice identifier is a valid GUID before
 * making API requests to prevent malformed requests.
 *
 * **API Communication:** Makes DELETE request to `/rest/v1/invoices/{id}/scans?location={encodedUrl}`
 * endpoint with the scan location as a URL-encoded query parameter.
 *
 * **URL Encoding:**
 * The scanLocation (blob URL) contains special characters (://, /, ., etc.) and is URL-encoded
 * before being sent as a query parameter to ensure proper API handling.
 *
 * **Deletion Behavior:**
 * - Removes scan reference from invoice entity in database immediately
 * - Azure blob marked for cleanup (metadata updated, not immediately deleted)
 * - Background job processes orphaned blobs after retention period
 * - Soft deletion allows recovery within retention window (configurable backend)
 * - Fails with HTTP 400 if attempting to delete the last remaining scan
 *
 * **Business Rules:**
 * - **Minimum scan constraint**: Invoices must retain at least one scan
 * - **Ownership constraint**: Only invoice owner can delete scans (HTTP 403 if unauthorized)
 * - **Existence constraint**: Scan must exist on invoice (HTTP 404 if not found)
 *
 * **Cache Revalidation:**
 * On successful deletion, automatically revalidates Next.js cache for:
 * - Edit invoice page: `/domains/invoices/edit-invoice/{id}`
 * - View invoice page: `/domains/invoices/view-invoice/{id}`
 *
 * **Observability:** Instrumented with OpenTelemetry spans and events:
 * - `api.actions.invoices.deleteInvoiceScan` - Parent span
 * - `bff.user.jwt.fetch.start/complete` - Auth events
 * - `bff.request.delete-scan.start/complete` - API request events
 * - `bff.request.delete-scan.error` - Error event
 *
 * **Error Handling:**
 * - GUID validation failures are caught and returned as error results
 * - HTTP 400 returns "Cannot delete the scan. The request was invalid."
 *   (typically: last scan constraint or malformed request)
 * - HTTP 403 returns "You do not have permission to delete this scan."
 *   (user not owner of invoice)
 * - HTTP 404 returns "The specified scan was not found."
 *   (scan URL doesn't match any scan on invoice)
 * - Other errors return generic "Failed to delete the scan. Please try again."
 * - Network/unexpected errors are caught and wrapped in ServerActionResult
 *
 * **Side Effects:**
 * - Removes scan reference from invoice in backend database
 * - Marks Azure blob for deletion (async cleanup)
 * - Revalidates Next.js cache for invoice pages
 * - Emits telemetry spans and logs
 *
 * @param params - The input parameters object.
 * @param params.invoiceId - The UUID of the invoice containing the scan. Must be a valid UUIDv4 string.
 * @param params.scanLocation - The full blob URL of the scan to delete. Will be URL-encoded for the API request.
 * @returns A result object with void data on success, or an error result when validation, authorization, or the backend request fails.
 *
 * @example
 * ```typescript
 * import { deleteInvoiceScan } from "@/app/domains/invoices/_actions/invoices/scans/deleteInvoiceScan";
 *
 * // Delete a scan from an invoice
 * const result = await deleteInvoiceScan({
 *   invoiceId: "123e4567-e89b-12d3-a456-426614174000",
 *   scanLocation: "https://arolariu.blob.core.windows.net/invoices/scan-uuid.jpg"
 * });
 *
 * if (result.success) {
 *   console.log("Scan reference removed successfully");
 *   // Blob will be cleaned up by background job after retention period
 * } else {
 *   console.error("Failed to delete scan:", result.error);
 *   // result.error contains user-friendly message (e.g., "Cannot delete the last scan")
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Handling specific error conditions
 * const result = await deleteInvoiceScan({
 *   invoiceId: invoiceId,
 *   scanLocation: scanUrl
 * });
 *
 * if (!result.success) {
 *   if (result.error.includes("Cannot delete")) {
 *     // Last scan constraint - show message to user
 *     toast.error("Cannot delete the last scan. Upload a new scan first.");
 *   } else if (result.error.includes("permission")) {
 *     // Ownership constraint - redirect or show auth error
 *     toast.error("You don't own this invoice.");
 *   } else if (result.error.includes("not found")) {
 *     // Scan doesn't exist - refresh invoice data
 *     toast.error("Scan already deleted or not found.");
 *   }
 * }
 * ```
 *
 * @see {@link attachInvoiceScan} - Sibling action for adding scans
 * @see {@link createInvoiceScan} - Action for uploading new scans
 * @see {@link fetchBFFUserFromAuthService} - Authentication token retrieval
 * @see {@link validateStringIsGuidType} - GUID validation utility
 * @see {@link ServerActionResult} - Result type wrapper
 */
export async function deleteInvoiceScan({ invoiceId, scanLocation }: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{deleteInvoiceScan}}, with:", { invoiceId, scanLocation });

  return withSpan("api.actions.invoices.deleteInvoiceScan", async () => {
    try {
      // Step 0. Validate invoice identifier is valid GUID
      logWithTrace("info", "Validating identifier is valid...", { invoiceId }, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const { userJwt: authToken } = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to delete the scan
      // We encode the scan location as a URL parameter since it contains special characters
      addSpanEvent("bff.request.delete-scan.start");
      logWithTrace("info", "Making API request to delete invoice scan", { invoiceId, scanLocation }, "server");
      const encodedScanLocation = encodeURIComponent(scanLocation);
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/scans?location=${encodedScanLocation}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.delete-scan.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully deleted invoice scan", { invoiceId, scanLocation }, "server");
        revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
        revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
        return { success: true, data: undefined } as const;
      }

      addSpanEvent("bff.request.delete-scan.error");
      const errorText = await response.text();
      const internalMessage = `Failed to delete invoice scan: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, { invoiceId, scanLocation, errorText }, "server");
      const userMessage =
        response.status === 400
          ? "Cannot delete the scan. The request was invalid."
          : response.status === 404
            ? "The specified scan was not found."
            : response.status === 403
              ? "You do not have permission to delete this scan."
              : "Failed to delete the scan. Please try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.delete-scan.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error deleting the invoice scan", { error, invoiceId, scanLocation }, "server");
      console.error("Error deleting the invoice scan:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
