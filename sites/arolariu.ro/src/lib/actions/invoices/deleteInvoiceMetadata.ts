"use server";

/**
 * @fileoverview Server action for removing metadata keys from existing invoices.
 * @module lib/actions/invoices/deleteInvoiceMetadata
 *
 * @remarks
 * Removes one metadata key from an invoice by forwarding the deletion request to
 * the BFF invoices endpoint. The backend accepts a collection of keys, but this
 * server action intentionally exposes a single-key API for UI metadata controls.
 *
 * **Constraints**:
 * - Only the invoice owner can delete metadata keys
 * - Metadata keys must be non-empty strings
 * - The invoice identifier must be a valid GUID
 *
 * @see {@link deleteInvoiceScan} for the sibling scan deletion action pattern
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {fetchWithTimeout} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input parameters for deleting a metadata key from an invoice.
 *
 * @property invoiceId - UUIDv4 of the target invoice
 * @property key - The metadata key to delete
 */
type ServerActionInputType = Readonly<{
  /** The ID of the invoice containing the metadata key. */
  readonly invoiceId: string;
  /** The metadata key to delete from the invoice. */
  readonly key: string;
}>;

/**
 * Output type indicating async completion with no return value.
 */
type ServerActionOutputType = Promise<void>;

/**
 * Deletes a metadata key from an existing invoice entity.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches JWT from Clerk auth service.
 *
 * **Deletion Behavior**:
 * - Removes the requested metadata key from the invoice entity
 * - Sends the backend DTO shape as `{keys: [key]}`
 * - Preserves all other invoice metadata keys
 *
 * **Side Effects**:
 * - Emits OpenTelemetry spans for tracing
 * - Updates invoice aggregate metadata on the backend
 *
 * **Error Handling**: Throws on validation, auth, or API failures.
 *
 * @param input - The invoice ID and metadata key
 * @param input.invoiceId - UUIDv4 of the invoice containing the metadata key
 * @param input.key - The non-empty metadata key to delete
 * @returns Promise that resolves when the metadata key is successfully deleted
 * @throws {Error} When invoiceId is not a valid GUID
 * @throws {Error} When key is empty or whitespace-only
 * @throws {Error} When authentication fails
 * @throws {Error} When API returns non-OK status
 *
 * @example
 * ```typescript
 * import {deleteInvoiceMetadata} from "@/lib/actions/invoices/deleteInvoiceMetadata";
 *
 * await deleteInvoiceMetadata({
 *   invoiceId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
 *   key: "color"
 * });
 * ```
 */
export async function deleteInvoiceMetadata({invoiceId, key}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{deleteInvoiceMetadata}}, with:", {invoiceId, key});

  return withSpan("api.actions.invoices.deleteInvoiceMetadata", async () => {
    try {
      // Step 0. Validate input is correct
      logWithTrace("info", "Validating input for deleteInvoiceMetadata", {invoiceId, key}, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      if (typeof key !== "string" || key.trim().length === 0) {
        throw new Error("deleteInvoiceMetadata: 'key' must be a non-empty string.");
      }

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to delete the metadata key
      addSpanEvent("bff.request.delete-metadata.start");
      logWithTrace("info", "Making API request to delete invoice metadata", {invoiceId, key}, "server");

      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/metadata`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({keys: [key]}),
      });
      addSpanEvent("bff.request.delete-metadata.complete");

      if (!response.ok) {
        addSpanEvent("bff.request.delete-metadata.error");
        const errorText = await response.text();
        logWithTrace(
          "error",
          "BFF delete invoice metadata request failed",
          {status: response.status, statusText: response.statusText, errorText},
          "server",
        );
        throw new Error(`BFF delete invoice metadata request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      logWithTrace("info", "Successfully deleted invoice metadata", {invoiceId, key}, "server");
    } catch (error) {
      addSpanEvent("bff.request.delete-metadata.error");
      logWithTrace("error", "Error deleting invoice metadata", {error, invoiceId, key}, "server");
      console.error("Error deleting invoice metadata:", error);
      throw error;
    }
  });
}
