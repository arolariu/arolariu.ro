"use server";

/**
 * @fileoverview Server action for deleting invoice entities.
 * @module lib/actions/invoices/deleteInvoice
 *
 * @remarks
 * Provides soft-delete functionality for invoices. The backend marks invoices
 * as deleted rather than physically removing them, preserving audit history.
 *
 * **Authorization**:
 * - Only the invoice owner can delete their invoices
 * - Shared users cannot delete invoices shared with them
 *
 * **Cascade Behavior**:
 * - Associated scans are marked as deleted
 * - Merchant associations are preserved (merchants may be shared)
 *
 * @see {@link fetchInvoice} - Deleted invoices are excluded from fetch by default
 */

import { addSpanEvent, logWithTrace, withSpan } from "@/instrumentation.server";
import { fetchBFFUserFromAuthService } from "@/lib/actions/user/fetchUser";
import { validateStringIsGuidType } from "@/lib/utils.generic";
import { createErrorResult, fetchWithTimeout, type ServerActionResult } from "@/lib/utils.server";
import { revalidatePath } from "next/cache";

/**
 * Input parameters for invoice deletion.
 *
 * @property invoiceId - UUIDv4 of the invoice to delete
 */
type ServerActionInputType = Readonly<{
  /** The identifier of the invoice to be deleted. */
  readonly invoiceId: string;
}>;

/**
 * Output type indicating async completion with no return value.
 */
type ServerActionOutputType = ServerActionResult<void>;

/**
 * Soft-deletes an invoice from the system.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches JWT from Clerk auth service.
 *
 * **Deletion Semantics**:
 * - Performs soft-delete (invoice marked as deleted, not physically removed)
 * - Deleted invoices excluded from standard queries
 * - Deletion is idempotent (deleting already-deleted invoice succeeds)
 *
 * **Side Effects**:
 * - Emits OpenTelemetry spans for tracing
 * - Updates invoice `isDeleted` flag in database
 * - Cascades to associated scan records
 *
 * **Error Handling**: Throws on validation, auth, or API failures.
 *
 * @param input - The invoice deletion parameters
 * @param input.invoiceId - UUIDv4 of the invoice to delete
 * @returns Promise that resolves when deletion is complete
 * @throws {Error} When invoiceId is not a valid GUID
 * @throws {Error} When authentication fails
 * @throws {Error} When API returns 404 (invoice not found)
 * @throws {Error} When API returns 403 (not authorized to delete)
 *
 * @example
 * ```typescript
 * import deleteInvoice from "@/lib/actions/invoices/deleteInvoice";
 *
 * try {
 *   await deleteInvoice({
 *     invoiceId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
 *   });
 *   console.log("Invoice deleted successfully");
 * } catch (error) {
 *   console.error("Failed to delete invoice:", error);
 * }
 * ```
 *
 * @see {@link fetchInvoices} - Deleted invoices won't appear in list
 */
export async function deleteInvoice({ invoiceId }: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{deleteInvoice}}, with:", { invoiceId });

  return withSpan("api.actions.invoices.deleteInvoice", async () => {
    try {
      // Step 0. Validate invoice identifier is valid GUID
      logWithTrace("info", "Validating identifier is valid...", { invoiceId }, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const { userJwt: authToken } = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to delete the invoice
      addSpanEvent("bff.request.delete-invoice.start");
      logWithTrace("info", "Making API request to delete invoice...", { invoiceId }, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.delete-invoice.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully deleted invoice...", { invoiceId }, "server");
        revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
        revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
        return { success: true, data: undefined } as const;
      }

      const errorText = await response.text();
      const internalMessage = `Failed to delete invoice: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, { invoiceId, errorText }, "server");
      const userMessage =
        response.status === 404
          ? "The invoice was not found. It may have already been deleted."
          : response.status === 403
            ? "You do not have permission to delete this invoice."
            : "An unexpected error occurred while deleting the invoice.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.delete-invoice.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error deleting the invoice from the server", { error, invoiceId }, "server");
      console.error("Error deleting the invoice from the server:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
