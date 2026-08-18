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
import {
  isClassificationSelection,
  type ClassificationSelection,
  type Invoice,
  type InvoiceCategory,
  type PaymentInformation,
  type Product,
  type Recipe,
} from "@/types/invoices";
import {revalidatePath} from "next/cache";

type ServerActionInputType = Readonly<{
  /** The identifier of the invoice to patch. */
  readonly invoiceId: string;
  /** The partial update payload. */
  readonly payload: {
    readonly name?: string;
    readonly description?: string;
    /**
     * A manual ECOICOP selection. Null is deliberately excluded: the backend
     * treats null as "no change" for invoice PATCH requests and cannot clear it.
     */
    readonly classification?: ClassificationSelection;
    readonly category?: InvoiceCategory;
    readonly paymentInformation?: PaymentInformation;
    readonly merchantReference?: string;
    readonly isImportant?: boolean;
    readonly sharedWith?: string[];
    readonly additionalMetadata?: Record<string, unknown>;
    readonly items?: Product[];
    readonly possibleRecipes?: Recipe[];
  };
}>;

type ServerActionOutputType = ServerActionResult<Readonly<Invoice>>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPatchInvoicePayload(value: unknown): value is ServerActionInputType["payload"] {
  if (!isRecord(value)) {
    return false;
  }

  const classification = value["classification"];
  return classification === undefined || isClassificationSelection(classification);
}

function isPatchInvoiceInput(value: unknown): value is ServerActionInputType {
  return isRecord(value) && typeof value["invoiceId"] === "string" && isPatchInvoicePayload(value["payload"]);
}

function isInvoiceResponse(value: unknown): value is Invoice {
  return (
    isRecord(value) && typeof value["id"] === "string" && typeof value["name"] === "string" && typeof value["description"] === "string"
  );
}

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
export async function patchInvoice(input: unknown): ServerActionOutputType {
  return withSpan("api.actions.invoices.patchInvoice", async () => {
    try {
      if (!isPatchInvoiceInput(input)) {
        addSpanEvent("bff.request.patch-invoice.validation-error");
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invoice patch request is invalid.",
          },
        };
      }

      const {invoiceId, payload} = input;
      // Step 0. Validate invoice identifier is valid GUID
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to patch the invoice
      addSpanEvent("bff.request.patch-invoice.start");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      addSpanEvent("bff.request.patch-invoice.complete");

      if (response.ok) {
        const invoice: unknown = await response.json();
        if (!isInvoiceResponse(invoice)) {
          addSpanEvent("bff.request.patch-invoice.invalid-response");
          return {
            success: false,
            error: {
              code: "SERVER_ERROR",
              message: "The invoice update response was invalid. Please try again.",
            },
          };
        }

        revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
        revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
        return {success: true, data: invoice} as const;
      }

      addSpanEvent("bff.request.patch-invoice.error");
      const internalMessage = `Failed to update invoice: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, {httpStatus: response.status}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to update the invoice. Please check your input and try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error) {
      addSpanEvent("bff.request.patch-invoice.error");
      logWithTrace("error", "Invoice patch request failed.", undefined, "server");
      return createErrorResult(error, "Unable to update the invoice. Please try again.");
    }
  }) satisfies ServerActionOutputType;
}
