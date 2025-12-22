"use server";

/**
 * @fileoverview Server action for full invoice updates (HTTP POST).
 * @module lib/actions/invoices/updateInvoice
 *
 * @remarks
 * Provides a POST endpoint wrapper for replacing an entire invoice resource.
 * Unlike PATCH operations which update specific fields, this action replaces
 * the entire invoice with the provided data.
 *
 * **Use Cases**:
 * - Bulk updates where multiple fields change simultaneously
 * - Form submissions with complete invoice data
 * - Sync operations requiring full resource replacement
 *
 * **Comparison with patchInvoice**:
 * | Aspect          | updateInvoice (POST) | patchInvoice (PATCH) |
 * |-----------------|----------------------|----------------------|
 * | Payload         | Full invoice object  | Partial fields only  |
 * | Semantics       | Replace entire       | Merge with existing  |
 * | Validation      | All fields required  | Optional fields OK   |
 *
 * @see {@link patchInvoice} for partial updates
 * @see {@link fetchInvoice} for retrieving invoice data before update
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {API_URL} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Result type for update operations with additional status information.
 *
 * @property success - Whether the operation succeeded
 * @property invoice - The updated invoice (present on success)
 * @property error - Error message (present on failure)
 */
type UpdateInvoiceResult = Readonly<{success: true; invoice: Invoice} | {success: false; error: string}>;

type ServerActionInputType = Readonly<{
  /** The identifier of the invoice to update. */
  invoiceId: string;
  /** The complete invoice object to replace the existing one. */
  invoice: Invoice;
}>;

type ServerActionOutputType = Promise<UpdateInvoiceResult>;

/**
 * Server action that performs a full update (POST) on an invoice.
 *
 * @remarks
 * **HTTP Method**: POST
 * **Endpoint**: `/rest/v1/invoices/{invoiceId}`
 *
 * **Update Semantics**:
 * - Replaces the entire invoice resource with the provided data
 * - All fields from the provided invoice object are written
 * - The invoice ID in the URL must match `invoice.id`
 *
 * **Validation**:
 * - `invoiceId` must be a valid GUID
 * - `invoice` object must be provided and non-null
 * - `invoice.id` must match the `invoiceId` parameter
 *
 * **Error Handling**:
 * Returns a result object with `success` flag instead of throwing,
 * making it easier to handle errors in UI components.
 *
 * @param input - The invoice ID and complete invoice object
 * @returns A result object containing the updated invoice or error message
 *
 * @throws Never throws directly; all errors returned via result object
 *
 * @example
 * ```typescript
 * // Fetch, modify, and update the entire invoice
 * const invoice = await fetchInvoice(invoiceId);
 * const updatedInvoice = {
 *   ...invoice,
 *   name: "Updated Invoice Name",
 *   description: "New description",
 *   items: [...invoice.items, newItem],
 * };
 *
 * const result = await updateInvoice({
 *   invoiceId: invoice.id,
 *   invoice: updatedInvoice,
 * });
 *
 * if (result.success) {
 *   console.log("Updated:", result.invoice);
 * } else {
 *   console.error("Failed:", result.error);
 * }
 * ```
 *
 * @see {@link patchInvoice} for partial updates (when only changing a few fields)
 * @see {@link fetchInvoice} for retrieving invoice data before update
 */
export default async function updateInvoice({invoiceId, invoice}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action::updateInvoice, with:", {invoiceId, invoiceName: invoice?.name});

  return withSpan("api.actions.invoices.updateInvoice", async () => {
    try {
      // Step 0. Validate input is correct
      validateStringIsGuidType(invoiceId, "invoiceId");

      if (!invoice) {
        return {success: false, error: "Invoice object is required"};
      }

      if (invoice.id !== invoiceId) {
        return {success: false, error: "Invoice ID mismatch: URL parameter does not match invoice.id"};
      }

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to update the invoice
      addSpanEvent("bff.request.update-invoice.start");
      logWithTrace("info", "Making API request to update invoice", {invoiceId}, "server");
      const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invoice),
      });
      addSpanEvent("bff.request.update-invoice.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully updated invoice", {invoiceId}, "server");
        const updatedInvoice = (await response.json()) as Invoice;
        return {success: true, invoice: updatedInvoice};
      }

      const errorText = await response.text();
      const errorMessage = `Failed to update invoice: ${response.status} ${response.statusText}`;
      logWithTrace("warn", errorMessage, {invoiceId, errorText}, "server");
      return {success: false, error: errorMessage};
    } catch (error) {
      addSpanEvent("bff.request.update-invoice.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error updating the invoice", {error, invoiceId}, "server");
      console.error("Error updating the invoice:", error);
      return {success: false, error: errorMessage};
    }
  });
}
