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

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {API_URL} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

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
type ServerActionOutputType = Promise<Readonly<void>>;

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
export default async function deleteInvoice({invoiceId}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{deleteInvoice}}, with:", {invoiceId});

  return withSpan("api.actions.invoices.deleteInvoice", async () => {
    try {
      // Step 0. Validate input is correct
      logWithTrace("info", "Validating input for deleteInvoice", {invoiceId}, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to delete the invoice
      addSpanEvent("bff.request.delete-invoice.start");
      logWithTrace("info", "Making API request to delete invoice", {invoiceId}, "server");
      const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.delete-invoice.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully deleted invoice", {invoiceId}, "server");
        return;
      }

      const errorText = await response.text();
      throw new Error(`BFF delete invoice request failed: ${response.status} ${response.statusText} - ${errorText}`);
    } catch (error) {
      addSpanEvent("bff.request.delete-invoice.error");
      logWithTrace("error", "Error deleting the invoice from the server", {error, invoiceId}, "server");
      console.error("Error deleting the invoice from the server:", error);
      throw error;
    }
  });
}
