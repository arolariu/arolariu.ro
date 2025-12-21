"use server";

/**
 * @fileoverview Server action for partial invoice updates (HTTP PATCH).
 * @module lib/actions/invoices/patchInvoice
 *
 * @remarks
 * Provides a generic PATCH endpoint wrapper for updating specific invoice fields
 * without replacing the entire resource. Follows HTTP PATCH semantics where
 * only provided fields are updated.
 *
 * This action supports:
 * - Partial updates (only specified fields are modified)
 * - Sharing management (via `sharedWith` field)
 * - Metadata merging (via `additionalMetadata` field)
 * - All standard invoice fields (name, description, category, etc.)
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import type {Invoice, InvoiceCategory, PaymentInformation} from "@/types/invoices";
import {API_URL} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Payload for partial invoice update operations.
 *
 * @remarks
 * All fields are optional. Only provided fields will be updated.
 * Null or undefined values indicate "no change" for that field.
 *
 * @property name - Optional new name for the invoice
 * @property description - Optional new description
 * @property category - Optional new category classification
 * @property paymentInformation - Optional new payment details
 * @property merchantReference - Optional new merchant reference GUID
 * @property isImportant - Optional importance flag
 * @property sharedWith - Optional list of user GUIDs to share with (replaces existing)
 * @property additionalMetadata - Optional metadata entries to merge
 */
export type PatchInvoicePayload = Readonly<{
  name?: string;
  description?: string;
  category?: InvoiceCategory;
  paymentInformation?: PaymentInformation;
  merchantReference?: string;
  isImportant?: boolean;
  sharedWith?: string[];
  additionalMetadata?: Record<string, unknown>;
}>;

/**
 * Result type for patch operations with additional status information.
 *
 * @property success - Whether the operation succeeded
 * @property invoice - The updated invoice (present on success)
 * @property error - Error message (present on failure)
 */
export type PatchInvoiceResult = Readonly<{success: true; invoice: Invoice} | {success: false; error: string}>;

type ServerActionInputType = Readonly<{
  /** The identifier of the invoice to patch. */
  invoiceId: string;
  /** The partial update payload. */
  payload: PatchInvoicePayload;
}>;

type ServerActionOutputType = Promise<PatchInvoiceResult>;

/**
 * Server action that performs a partial update (PATCH) on an invoice.
 *
 * @remarks
 * **HTTP Method**: PATCH
 * **Endpoint**: `/rest/v1/invoices/{invoiceId}`
 *
 * **Patch Semantics**:
 * - Only provided fields are updated
 * - Null/undefined values preserve existing data
 * - `sharedWith` replaces the entire list when provided
 * - `additionalMetadata` merges with existing metadata
 *
 * **Error Handling**:
 * Returns a result object with `success` flag instead of throwing,
 * making it easier to handle errors in UI components.
 *
 * @param input - The invoice ID and patch payload
 * @returns A result object containing the updated invoice or error message
 *
 * @example
 * ```typescript
 * // Update only the name
 * const result = await patchInvoice({
 *   invoiceId: "abc-123",
 *   payload: { name: "New Invoice Name" }
 * });
 *
 * if (result.success) {
 *   console.log("Updated:", result.invoice);
 * } else {
 *   console.error("Failed:", result.error);
 * }
 *
 * // Update sharing settings
 * const shareResult = await patchInvoice({
 *   invoiceId: "abc-123",
 *   payload: { sharedWith: ["user-guid-1", "user-guid-2"] }
 * });
 * ```
 */
export default async function patchInvoice({invoiceId, payload}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action::patchInvoice, with:", {invoiceId, payload});

  return withSpan("api.actions.invoices.patchInvoice", async () => {
    try {
      // Validate input
      if (!invoiceId || invoiceId.trim() === "") {
        return {success: false, error: "Invoice ID is required"};
      }

      if (!payload || Object.keys(payload).length === 0) {
        return {success: false, error: "Patch payload cannot be empty"};
      }

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to patch the invoice
      addSpanEvent("bff.request.patch-invoice.start");
      logWithTrace("info", "Making API request to patch invoice", {invoiceId}, "server");
      const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      addSpanEvent("bff.request.patch-invoice.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully patched invoice", {invoiceId}, "server");
        const invoice = (await response.json()) as Invoice;
        return {success: true, invoice};
      }

      const errorText = await response.text();
      const errorMessage = `Failed to update invoice: ${response.status} ${response.statusText}`;
      logWithTrace("warn", errorMessage, {invoiceId, errorText}, "server");
      return {success: false, error: errorMessage};
    } catch (error) {
      addSpanEvent("bff.request.patch-invoice.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error patching the invoice", {error, invoiceId}, "server");
      console.error("Error patching the invoice:", error);
      return {success: false, error: errorMessage};
    }
  });
}
