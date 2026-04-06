"use server";

/**
 * @fileoverview Server action for deleting a product from an invoice (HTTP DELETE).
 * @module lib/actions/invoices/deleteProduct
 *
 * @remarks
 * Provides a DELETE endpoint wrapper for removing a single product from an invoice's
 * items array. This operation removes one product without requiring reconstruction
 * of the entire items collection.
 *
 * This action supports:
 * - Single product deletion identified by productName
 * - Soft delete (product is marked as deleted but retained for audit)
 * - Automatic recalculation of invoice totals
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {revalidatePath} from "next/cache";
import {fetchWithTimeout} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Payload for deleting a product from an invoice.
 *
 * @remarks
 * Products are identified by their productName field.
 *
 * @property productName - The name of the product to delete (required)
 */
type DeleteProductPayload = Readonly<{
  productName: string;
}>;

/**
 * Result type for product deletion operations.
 *
 * @property success - Whether the operation succeeded
 * @property error - Error message (present on failure)
 */
type DeleteProductResult = Readonly<{success: true} | {success: false; error: string}>;

type ServerActionInputType = Readonly<{
  /** The identifier of the invoice containing the product. */
  invoiceId: string;
  /** The product deletion payload. */
  payload: DeleteProductPayload;
}>;

type ServerActionOutputType = Promise<DeleteProductResult>;

/**
 * Server action that deletes a product from an invoice.
 *
 * @remarks
 * **HTTP Method**: DELETE
 * **Endpoint**: `/rest/v1/invoices/{invoiceId}/products`
 *
 * **Request Body**:
 * The payload is sent as JSON in the request body containing the productName
 * to identify which product to delete.
 *
 * **Product Identification**:
 * Products are identified by their `productName` field, which should match
 * the `name` of the product to be deleted.
 *
 * **Soft Delete**:
 * The backend performs a soft delete by marking the product's metadata.isSoftDeleted
 * flag as true. The product remains in the data for audit purposes but is excluded
 * from totals and reports.
 *
 * **Error Handling**:
 * Returns a result object with `success` flag instead of throwing,
 * making it easier to handle errors in UI components.
 *
 * @param input - The invoice ID and product deletion payload
 * @returns A result object indicating success or error message
 *
 * @example
 * ```typescript
 * // Delete a product
 * const result = await deleteProduct({
 *   invoiceId: "abc-123",
 *   payload: {
 *     productName: "Zuzu Milk 2% 1 Liter"
 *   }
 * });
 *
 * if (result.success) {
 *   console.log("Product deleted successfully");
 * } else {
 *   console.error("Failed:", result.error);
 * }
 * ```
 */
export default async function deleteProduct({invoiceId, payload}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action::deleteProduct, with:", {invoiceId, payload});

  return withSpan("api.actions.invoices.deleteProduct", async () => {
    try {
      // Step 0. Validate input is correct
      validateStringIsGuidType(invoiceId, "invoiceId");

      if (!payload || !payload.productName) {
        return {success: false, error: "Product payload must include productName"};
      }

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to delete the product
      addSpanEvent("bff.request.delete-product.start");
      logWithTrace("info", "Making API request to delete product from invoice", {invoiceId}, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/products`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      addSpanEvent("bff.request.delete-product.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully deleted product from invoice", {invoiceId}, "server");
        revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
        revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
        return {success: true};
      }

      const errorText = await response.text();
      const internalMessage = `Failed to delete product: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, {invoiceId, errorText}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to update the invoice. Please check your input and try again.";
      return {success: false, error: userMessage};
    } catch (error) {
      addSpanEvent("bff.request.delete-product.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error deleting product from invoice", {error, invoiceId}, "server");
      console.error("Error deleting product from invoice:", error);
      return {success: false, error: errorMessage};
    }
  });
}
