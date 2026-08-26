"use server";

/**
 * @fileoverview Server action for partial invoice updates (HTTP PATCH).
 * @module app/domains/invoices/_actions/invoices/patchInvoice
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
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import type {Invoice, PaymentInformation, Product, RecipeSuggestion} from "@/types/invoices";
import {parseInvoiceResponse, tryParse} from "@/types/invoices/transport";
import {revalidatePath} from "next/cache";

type ServerActionInputType = Readonly<{
  /** The identifier of the invoice to patch. */
  invoiceId: string;
  /** The partial update payload. */
  payload: {
    name?: string;
    description?: string;
    classificationCode?: string;
    paymentInformation?: PaymentInformation;
    merchantReference?: string;
    isImportant?: boolean;
    sharedWith?: string[];
    additionalMetadata?: Record<string, unknown>;
    items?: Product[];
    possibleRecipes?: RecipeSuggestion[];
  };
}>;

type ServerActionOutputType = ServerActionResult<Readonly<Invoice>>;

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
 * @param input - The invoice ID and patch payload.
 * @param input.invoiceId - UUIDv4 of the invoice to patch.
 * @param input.payload - Partial invoice fields to update; omitted fields are left unchanged.
 * @returns A result object containing the updated invoice, or an error result when validation, authorization, or the backend request fails.
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
 *   console.log("Updated:", result.data);
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
export async function patchInvoice({invoiceId, payload}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{patchInvoice}}, with:", {invoiceId, payload});

  // Keep status-specific failure copy at the request site, as requested during review.
  // eslint-disable-next-line sonarjs/cognitive-complexity
  return withSpan("api.actions.invoices.patchInvoice", async () => {
    try {
      // Step 0. Validate invoice identifier is valid GUID
      logWithTrace("info", "Validating identifier is valid...", {invoiceId}, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to patch the invoice
      addSpanEvent("bff.request.patch-invoice.start");
      logWithTrace("info", "Making API request to patch invoice...", {invoiceId}, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(payload.name !== undefined ? {name: payload.name} : {}),
          ...(payload.description !== undefined ? {description: payload.description} : {}),
          ...(payload.classificationCode !== undefined ? {classificationCode: payload.classificationCode} : {}),
          ...(payload.paymentInformation !== undefined ? {paymentInformation: payload.paymentInformation} : {}),
          ...(payload.merchantReference !== undefined ? {merchantReference: payload.merchantReference} : {}),
          ...(payload.isImportant !== undefined ? {isImportant: payload.isImportant} : {}),
          ...(payload.sharedWith !== undefined ? {sharedWith: payload.sharedWith} : {}),
          ...(payload.additionalMetadata !== undefined ? {additionalMetadata: payload.additionalMetadata} : {}),
          // possibleRecipes is opt-in: only sent when caller explicitly provides it.
          // null / omitted → backend PRESERVES existing; [] → CLEARS; [...] → REPLACES.
          ...(payload.possibleRecipes !== undefined ? {possibleRecipes: payload.possibleRecipes} : {}),
        }),
      });
      addSpanEvent("bff.request.patch-invoice.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully patched invoice...", {invoiceId}, "server");
        const responseBody: unknown = await response.json();
        const parsed = tryParse(parseInvoiceResponse, responseBody);
        if (!parsed.ok) {
          addSpanEvent("bff.request.patch-invoice.invalid");
          logWithTrace("error", "Patch invoice response failed transport validation", {path: parsed.error.path}, "server");
          return createErrorResult(parsed.error, "The server returned unexpected data. Please try again later.");
        }
        revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
        revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
        return {success: true, data: parsed.value} as const;
      }

      addSpanEvent("bff.request.patch-invoice.error");
      const errorText = await response.text();
      const internalMessage = `Failed to update invoice: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, {invoiceId, errorText}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to update the invoice. Please check your input and try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.patch-invoice.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error patching the invoice", {error, invoiceId}, "server");
      console.error("Error patching the invoice:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
