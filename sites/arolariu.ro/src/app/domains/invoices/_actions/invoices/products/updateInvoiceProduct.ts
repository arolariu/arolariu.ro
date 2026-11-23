"use server";

/**
 * @fileoverview Server action for updating existing products in invoice line items.
 * @module app/domains/invoices/_actions/invoices/products/updateInvoiceProduct
 *
 * @remarks
 * Provides server-side product management functionality for modifying existing line items
 * in invoices. This operation updates a single product within the invoice's items collection
 * without requiring full collection reconstruction.
 *
 * **Key Features:**
 * - Server-side execution with authentication
 * - GUID validation for invoice identifiers
 * - Product identification by original name (case-insensitive substring match)
 * - Automatic cache revalidation for edit/view pages
 * - OpenTelemetry instrumentation for observability
 * - Structured error handling with user-friendly messages
 *
 * Category edits use one conditional write. Existing full edits retain their transport.
 *
 * @see {@link addInvoiceProduct} - Sibling action for adding products
 * @see {@link deleteInvoiceProduct} - Sibling action for deleting products
 * @see {@link Product} - Product type definition
 * @see {@link ServerActionResult} - Standard result wrapper type
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {isProductCategory} from "@/lib/categories/categoryCatalog";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, createHttpErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import type {Product, ProductCategory} from "@/types/invoices";
import {parseProductResponse, tryParse} from "@/types/invoices/transport";
import {revalidatePath} from "next/cache";

/**
 * Input parameters for the updateInvoiceProduct server action.
 *
 * @remarks
 * The invoiceId must be a valid UUIDv4 GUID.
 * The payload contains both the identifier (originalProductName) and the updated product data.
 */
type ServerActionInputType = Readonly<{
  invoiceId: string;
  payload: Readonly<{originalProductName: string}>
    & (
      | Readonly<{category: ProductCategory | null; updatedProduct?: never}>
      | Readonly<{category?: ProductCategory | null; updatedProduct: Product}>
    );
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
 * Updates the exact-name product selected by the current invoice owner.
 * An explicit category, including null, uses the API's conditional write.
 * @param input - Invoice, product name, and category or full product edit.
 * @returns The saved product or the API's classified failure.
 */
export async function updateInvoiceProduct({invoiceId, payload}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{updateInvoiceProduct}}, with:", {invoiceId});

  return withSpan("api.actions.invoices.updateInvoiceProduct", async () => {
    try {
      // Step 0. Validate input is correct
      logWithTrace("info", "Validating input for updateInvoiceProduct", {invoiceId}, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");
      if (payload.category !== undefined && payload.category !== null && !isProductCategory(payload.category)) {
        return createHttpErrorResult(400, "Invalid product category.");
      }

      if (
        typeof payload.originalProductName !== "string"
        || payload.originalProductName.trim() === ""
        || (payload.updatedProduct === undefined && typeof payload.category === "undefined")
      ) {
        return createHttpErrorResult(400, "A product name and update are required.");
      }

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      const {originalProductName, updatedProduct, category} = payload;
      const requestBody = {
        originalProductName,
        ...(category !== undefined ? {category} : {}),
        ...(updatedProduct === undefined
          ? {}
          : {
              name: updatedProduct.name,
              quantity: updatedProduct.quantity,
              quantityUnit: updatedProduct.quantityUnit,
              productCode: updatedProduct.productCode,
              price: updatedProduct.price,
              allergenAssessment: updatedProduct.allergenAssessment,
            }),
      };

      addSpanEvent("bff.request.update-invoice-product.start");
      logWithTrace("info", "Making API request to update product in invoice", {invoiceId}, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/products`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
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
