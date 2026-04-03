"use server";

/**
 * @fileoverview Server action for adding a product to an invoice (HTTP POST).
 * @module lib/actions/invoices/addProduct
 *
 * @remarks
 * Provides a POST endpoint wrapper for adding a new product to an invoice's
 * items array. This operation appends a single product without requiring
 * reconstruction of the entire items collection.
 *
 * This action supports:
 * - Single product addition
 * - Partial product data (minimum: rawName, category, quantity, price)
 * - Optional fields (genericName, quantityUnit, productCode, detectedAllergens)
 * - Automatic metadata population by the backend
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import type {Allergen, Product, ProductCategory} from "@/types/invoices";
import {revalidatePath} from "next/cache";
import {fetchWithTimeout} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Payload for adding a new product to an invoice.
 *
 * @remarks
 * Minimum required fields: rawName, category, quantity, price.
 * Optional fields improve data quality and enable advanced features.
 *
 * @property rawName - The raw OCR-extracted product name (required)
 * @property genericName - Normalized human-readable name (optional)
 * @property category - Product category classification (required)
 * @property quantity - Quantity purchased (required)
 * @property quantityUnit - Unit of measurement (optional, defaults to "pcs")
 * @property productCode - Barcode/EAN code (optional)
 * @property price - Unit price (required)
 * @property detectedAllergens - List of allergens detected in product (optional)
 */
type AddProductPayload = Readonly<{
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
 * Result type for product addition operations.
 *
 * @property success - Whether the operation succeeded
 * @property product - The newly created product (present on success)
 * @property error - Error message (present on failure)
 */
type AddProductResult = Readonly<{success: true; product: Product} | {success: false; error: string}>;

type ServerActionInputType = Readonly<{
  /** The identifier of the invoice to add the product to. */
  invoiceId: string;
  /** The product payload. */
  payload: AddProductPayload;
}>;

type ServerActionOutputType = Promise<AddProductResult>;

/**
 * Server action that adds a new product to an invoice.
 *
 * @remarks
 * **HTTP Method**: POST
 * **Endpoint**: `/rest/v1/invoices/{invoiceId}/products`
 *
 * **Request Body**:
 * The payload is sent as JSON in the request body containing the product fields.
 *
 * **Response**:
 * Returns the created product with server-generated metadata and totalPrice.
 *
 * **Error Handling**:
 * Returns a result object with `success` flag instead of throwing,
 * making it easier to handle errors in UI components.
 *
 * @param input - The invoice ID and product payload
 * @returns A result object containing the created product or error message
 *
 * @example
 * ```typescript
 * // Add a new product
 * const result = await addProduct({
 *   invoiceId: "abc-123",
 *   payload: {
 *     rawName: "LAPTE ZUZU 2% 1L",
 *     genericName: "Zuzu Milk 2% 1 Liter",
 *     category: ProductCategory.DAIRY,
 *     quantity: 2,
 *     quantityUnit: "pcs",
 *     price: 8.99,
 *     detectedAllergens: [{ name: "Lactose", description: "...", learnMoreAddress: "" }]
 *   }
 * });
 *
 * if (result.success) {
 *   console.log("Added product:", result.product);
 * } else {
 *   console.error("Failed:", result.error);
 * }
 * ```
 */
export default async function addProduct({invoiceId, payload}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action::addProduct, with:", {invoiceId, payload});

  return withSpan("api.actions.invoices.addProduct", async () => {
    try {
      // Step 0. Validate input is correct
      validateStringIsGuidType(invoiceId, "invoiceId");

      if (!payload || !payload.rawName || !payload.category || payload.quantity === undefined || payload.price === undefined) {
        return {success: false, error: "Product payload must include rawName, category, quantity, and price"};
      }

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to add the product
      addSpanEvent("bff.request.add-product.start");
      logWithTrace("info", "Making API request to add product to invoice", {invoiceId}, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      addSpanEvent("bff.request.add-product.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully added product to invoice", {invoiceId}, "server");
        const product = (await response.json()) as Product;
        revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
        revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
        return {success: true, product};
      }

      const errorText = await response.text();
      const internalMessage = `Failed to add product: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, {invoiceId, errorText}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to update the invoice. Please check your input and try again.";
      return {success: false, error: userMessage};
    } catch (error) {
      addSpanEvent("bff.request.add-product.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error adding product to invoice", {error, invoiceId}, "server");
      console.error("Error adding product to invoice:", error);
      return {success: false, error: errorMessage};
    }
  });
}
