"use server";

/**
 * @fileoverview Server action for updating existing products in invoice line items.
 * @module app/domains/invoices/_actions/invoices/products/updateInvoiceProduct
 *
 * @remarks
 * Supports category-only changes and full edits to one existing product line.
 * Both save the edited receipt in one replacement.
 *
 * @see {@link addInvoiceProduct} - Sibling action for adding products
 * @see {@link deleteInvoiceProduct} - Sibling action for deleting products
 * @see {@link Product} - Product type definition
 * @see {@link ServerActionResult} - Standard result wrapper type
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, createHttpErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import type {Product} from "@/types/invoices";
import {parseProductResponse, serializeCategoryUpdate, tryParse} from "@/types/invoices/transport";
import {revalidatePath} from "next/cache";

/**
 * Input parameters for the updateInvoiceProduct server action.
 *
 * @remarks
 * The `originalProductName` is the current, complete name, even when a full
 * edit renames the line. A category-only edit supplies only `updatedProduct.category`.
 */
type ServerActionInputType = Readonly<{
  /** Valid GUID identifying the containing invoice. */
  invoiceId: string;
  payload: Readonly<{
    originalProductName: string;
    updatedProduct:
      | Readonly<
          Pick<Product, "category"> & {
            name?: never;
            quantity?: never;
            quantityUnit?: never;
            productCode?: never;
            price?: never;
            allergenAssessment?: never;
          }
        >
      | Readonly<
          Pick<Product, "name" | "quantity" | "price">
            & Partial<Pick<Product, "category" | "quantityUnit" | "productCode" | "allergenAssessment">>
        >;
  }>;
}>;

/**
 * Output result type for the updateInvoiceProduct server action.
 *
 * @remarks
 * Returns a ServerActionResult with the updated product (including server-generated metadata) on success.
 * On failure, includes error details and user-friendly message.
 */
type ServerActionOutputType = ServerActionResult<Readonly<Product>>;

/**
 * Updates one existing product in an invoice's line items.
 *
 * @remarks
 * **Authorization and transport:** Validates the invoice GUID,
 * obtains a server-derived BFF JWT, then sends a bounded `PUT` request to
 * `/rest/v1/invoices/{id}/products`. The API checks the caller's access to the
 * invoice and requires exactly one `originalProductName` match using
 * `StringComparison.OrdinalIgnoreCase`. The replacement stays in the same
 * position.
 *
 * **Request body:** A category-only update sends `{originalProductName, category}`
 * and preserves the other product fields. A full edit flattens `updatedProduct`
 * to its editable fields (including `name`, `quantity`, and `price`), not a nested
 * object or a copy of server-owned metadata. The category comes from `updatedProduct`;
 * an omitted category preserves the stored value, while null sends the API's
 * `-1` clear command.
 *
 * **Result and side effects:** The API responds with `202 Accepted` and the
 * updated product. After parsing the response, this action revalidates both
 * the edit and view invoice pages. OpenTelemetry traces JWT retrieval and the
 * upstream request.
 *
 * **Failure behavior:** An invalid body or ambiguous name yields HTTP 400, a
 * missing product or invoice yields 404.
 * The action preserves the API status, maps malformed successful responses to
 * `SERVER_ERROR`, and does not retry. Refresh before retrying an uncertain
 * network outcome.
 *
 * @param input - The invoice GUID and the product selector with its update.
 * @returns The parsed saved product or a structured failure.
 *
 * @example
 * ```ts
 * await updateInvoiceProduct({
 *   invoiceId: "11111111-1111-4111-8111-111111111111",
 *   payload: {originalProductName: "Milk 1L", updatedProduct: {category: 1014}},
 * });
 * ```
 *
 * @example
 * ```ts
 * // Edit the product's price while keeping its current category.
 * await updateInvoiceProduct({
 *   invoiceId: "11111111-1111-4111-8111-111111111111",
 *   payload: {originalProductName: product.name, updatedProduct: {...product, price: 8.99}},
 * });
 * ```
 *
 * @see {@link fetchBFFUserFromAuthService} - Server-derived identity and token.
 * @see {@link fetchWithTimeout} - Bounded upstream HTTP transport.
 */
export async function updateInvoiceProduct({invoiceId, payload}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{updateInvoiceProduct}}, with:", {invoiceId});

  return withSpan("api.actions.invoices.updateInvoiceProduct", async () => {
    try {
      // Step 0. Validate input is correct
      logWithTrace("info", "Validating input for updateInvoiceProduct", {invoiceId}, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      const {originalProductName, updatedProduct} = payload;
      const requestBody = {
        originalProductName,
        name: updatedProduct?.name,
        category: updatedProduct?.category,
        quantity: updatedProduct?.quantity,
        quantityUnit: updatedProduct?.quantityUnit,
        productCode: updatedProduct?.productCode,
        price: updatedProduct?.price,
        allergenAssessment: updatedProduct?.allergenAssessment,
      };

      addSpanEvent("bff.request.update-invoice-product.start");
      logWithTrace("info", "Making API request to update product in invoice", {invoiceId}, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/products`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: serializeCategoryUpdate(requestBody),
      });
      addSpanEvent("bff.request.update-invoice-product.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully updated product in invoice", {invoiceId}, "server");
        const responseBody: unknown = await response.json();
        const parsed = tryParse(parseProductResponse, responseBody);
        if (!parsed.ok) {
          addSpanEvent("bff.request.update-invoice-product.invalid");
          logWithTrace("error", "Update product response failed transport validation", {path: parsed.error.path}, "server");
          return createErrorResult(parsed.error, "The server returned unexpected data. Please try again later.");
        }
        revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
        revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
        return {
          success: true,
          data: parsed.value,
        } as const;
      }

      addSpanEvent("bff.request.update-invoice-product.error");
      const errorText = await response.text();
      const internalMessage = `Failed to update product: ${response.status} ${response.statusText} - ${errorText}`;
      logWithTrace("warn", internalMessage, {invoiceId, errorText}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to update the product. Please check your input and try again.";
      return createHttpErrorResult(response.status, userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.update-invoice-product.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error updating product in invoice", {error, invoiceId}, "server");
      console.error("Error updating product in invoice:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
