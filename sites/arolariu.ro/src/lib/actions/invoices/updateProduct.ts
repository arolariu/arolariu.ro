"use server";

/**
 * @fileoverview Server action for updating an existing product in an invoice (HTTP PUT).
 * @module lib/actions/invoices/updateProduct
 *
 * @remarks
 * Provides a PUT endpoint wrapper for updating a single product within an invoice's
 * items array. This operation modifies one product without requiring reconstruction
 * of the entire items collection.
 *
 * This action supports:
 * - Single product update identified by originalProductName
 * - Full or partial product data updates
 * - Optional fields (all product fields are optional except identifier)
 * - Automatic metadata marking (isEdited = true)
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import type {Allergen, Product, ProductCategory} from "@/types/invoices";
import {fetchWithTimeout} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Payload for updating an existing product in an invoice.
 *
 * @remarks
 * The originalProductName field identifies which product to update.
 * All other fields are optional and only provided fields will be updated.
 *
 * @property originalProductName - Identifies the product to update (required)
 * @property rawName - The raw OCR-extracted product name (optional)
 * @property genericName - Normalized human-readable name (optional)
 * @property category - Product category classification (optional)
 * @property quantity - Quantity purchased (optional)
 * @property quantityUnit - Unit of measurement (optional)
 * @property productCode - Barcode/EAN code (optional)
 * @property price - Unit price (optional)
 * @property detectedAllergens - List of allergens detected in product (optional)
 */
type UpdateProductPayload = Readonly<{
  originalProductName: string;
  rawName: string;
  genericName?: string;
  category: ProductCategory;
  quantity: number;
  quantityUnit?: string;
  productCode?: string;
  price: number;
  detectedAllergens?: Allergen[];
}>;

/**
 * Result type for product update operations.
 *
 * @property success - Whether the operation succeeded
 * @property product - The updated product (present on success)
 * @property error - Error message (present on failure)
 */
type UpdateProductResult = Readonly<{success: true; product: Product} | {success: false; error: string}>;

type ServerActionInputType = Readonly<{
  /** The identifier of the invoice containing the product. */
  invoiceId: string;
  /** The product update payload. */
  payload: UpdateProductPayload;
}>;

type ServerActionOutputType = Promise<UpdateProductResult>;

/**
 * Server action that updates an existing product in an invoice.
 *
 * @remarks
 * **HTTP Method**: PUT
 * **Endpoint**: `/rest/v1/invoices/{invoiceId}/products`
 *
 * **Request Body**:
 * The payload is sent as JSON in the request body containing the originalProductName
 * (identifier) and the fields to update.
 *
 * **Product Identification**:
 * Products are identified by their `originalProductName` field, which should match
 * the current `rawName` of the product to be updated.
 *
 * **Partial Updates**:
 * Only provided fields are updated. The backend automatically marks the product
 * as edited (metadata.isEdited = true).
 *
 * **Error Handling**:
 * Returns a result object with `success` flag instead of throwing,
 * making it easier to handle errors in UI components.
 *
 * @param input - The invoice ID and product update payload
 * @returns A result object containing the updated product or error message
 *
 * @example
 * ```typescript
 * // Update product allergens only
 * const result = await updateProduct({
 *   invoiceId: "abc-123",
 *   payload: {
 *     originalProductName: "LAPTE ZUZU 2% 1L",
 *     rawName: "LAPTE ZUZU 2% 1L",
 *     genericName: "Zuzu Milk 2% 1 Liter",
 *     category: ProductCategory.DAIRY,
 *     quantity: 2,
 *     price: 8.99,
 *     detectedAllergens: [
 *       { name: "Lactose", description: "...", learnMoreAddress: "" },
 *       { name: "Milk", description: "...", learnMoreAddress: "" }
 *     ]
 *   }
 * });
 *
 * if (result.success) {
 *   console.log("Updated product:", result.product);
 * } else {
 *   console.error("Failed:", result.error);
 * }
 *
 * // Update product category
 * const categoryResult = await updateProduct({
 *   invoiceId: "abc-123",
 *   payload: {
 *     originalProductName: "MERE GALA",
 *     rawName: "MERE GALA",
 *     genericName: "Gala Apples",
 *     category: ProductCategory.FRUITS,
 *     quantity: 3,
 *     price: 12.50
 *   }
 * });
 * ```
 */
export default async function updateProduct({invoiceId, payload}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action::updateProduct, with:", {invoiceId, payload});

  return withSpan("api.actions.invoices.updateProduct", async () => {
    try {
      // Step 0. Validate input is correct
      validateStringIsGuidType(invoiceId, "invoiceId");

      if (!payload || !payload.originalProductName) {
        return {success: false, error: "Product payload must include originalProductName"};
      }

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to update the product
      addSpanEvent("bff.request.update-product.start");
      logWithTrace("info", "Making API request to update product in invoice", {invoiceId}, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/products`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      addSpanEvent("bff.request.update-product.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully updated product in invoice", {invoiceId}, "server");
        const product = (await response.json()) as Product;
        return {success: true, product};
      }

      const errorText = await response.text();
      const errorMessage = `Failed to update product: ${response.status} ${response.statusText}`;
      logWithTrace("warn", errorMessage, {invoiceId, errorText}, "server");
      return {success: false, error: errorMessage};
    } catch (error) {
      addSpanEvent("bff.request.update-product.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error updating product in invoice", {error, invoiceId}, "server");
      console.error("Error updating product in invoice:", error);
      return {success: false, error: errorMessage};
    }
  });
}
