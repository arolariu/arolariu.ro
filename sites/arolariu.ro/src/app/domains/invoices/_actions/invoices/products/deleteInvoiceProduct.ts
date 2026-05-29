"use server";

/**
 * @fileoverview Server action for deleting products from invoice line items.
 * @module app/domains/invoices/_actions/invoices/products/deleteInvoiceProduct
 *
 * @remarks
 * Provides server-side product management functionality for removing line items
 * from existing invoices. This operation removes a single product from the invoice's
 * items collection without requiring full collection reconstruction.
 *
 * **Key Features:**
 * - Server-side execution with authentication
 * - GUID validation for invoice identifiers
 * - Product identification by name (case-insensitive substring match — see caveat below)
 * - Automatic cache revalidation for edit/view pages
 * - OpenTelemetry instrumentation for observability
 * - Structured error handling with user-friendly messages
 *
 * **Deletion Behavior:**
 * - Products identified by `productName` using **case-insensitive substring matching**
 *   on the backend (`String.Contains` with `InvariantCultureIgnoreCase`). Passing
 *   `"milk"` will match and delete a product named `"Zuzu Milk 2% 1 Liter"`.
 *   Callers should pass the full product name to avoid unintended deletions when
 *   multiple items share a common substring.
 * - Backend performs a **hard delete**: the product is removed from the invoice's
 *   items collection. There is no soft-delete / `isSoftDeleted` flag for this path.
 * - Invoice totals are recalculated by the update cycle that persists the trimmed
 *   items collection.
 *
 * @see {@link addInvoiceProduct} - Sibling action for adding products
 * @see {@link ServerActionResult} - Standard result wrapper type
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import {revalidatePath} from "next/cache";

/**
 * Input parameters for the deleteInvoiceProduct server action.
 *
 * @remarks
 * The invoiceId must be a valid UUIDv4 GUID.
 * The productName should be the full display name to avoid unintended substring matches.
 */
type ServerActionInputType = Readonly<{
  /** The unique identifier of the invoice. Must be a valid UUIDv4 GUID. */
  readonly invoiceId: string;
  /**
   * Name of the product to delete. Backend performs a case-insensitive
   * substring match (`String.Contains` with `InvariantCultureIgnoreCase`),
   * so passing the full product name is recommended to avoid matching
   * unrelated items that share a common substring.
   */
  readonly productName: string;
}>;

/**
 * Output result type for the deleteInvoiceProduct server action.
 *
 * @remarks
 * Returns a ServerActionResult with void data on success.
 * On failure, includes error details and user-friendly message.
 */
type ServerActionOutputType = ServerActionResult<void>;

/**
 * Removes a product from an invoice's line items via the backend API.
 *
 * @remarks
 * **Execution Context:** Server-side only (Next.js server action).
 *
 * **Authentication:** Automatically fetches JWT token from auth service
 * via `fetchBFFUserFromAuthService`. Requires valid authenticated session.
 *
 * **Validation:** Validates invoice identifier is a valid GUID before
 * making API requests to prevent malformed requests.
 *
 * **API Communication:** Makes DELETE request to `/rest/v1/invoices/{id}/products`
 * endpoint with the productName in request body as JSON.
 *
 * **Product Identification:**
 * Products are identified by their `productName` field using a
 * **case-insensitive substring match** on the backend
 * (`String.Contains` with `InvariantCultureIgnoreCase`). The first item whose
 * name contains the supplied string wins. Pass the full product name to
 * avoid accidentally deleting an unrelated item that shares a substring.
 *
 * **Deletion Strategy:**
 * - Backend performs a **hard delete**: the matching product is removed from
 *   the invoice's items collection entirely. There is no soft-delete flag
 *   (`metadata.isSoftDeleted`) applied on this path.
 * - Invoice totals are recalculated by the subsequent update cycle that
 *   persists the trimmed items collection.
 * - If no product matches, the backend responds with HTTP 404 and the action
 *   returns an error result.
 *
 * **Cache Revalidation:**
 * On successful deletion, automatically revalidates Next.js cache for:
 * - Edit invoice page: `/domains/invoices/edit-invoice/{id}`
 * - View invoice page: `/domains/invoices/view-invoice/{id}`
 *
 * **Observability:** Instrumented with OpenTelemetry spans and events:
 * - `api.actions.invoices.deleteInvoiceProduct` - Parent span
 * - `bff.user.jwt.fetch.start/complete` - Auth events
 * - `bff.request.delete-invoice-product.start/complete` - API request events
 * - `bff.request.delete-invoice-product.error` - Error event
 *
 * **Error Handling:**
 * - GUID validation failures are caught and returned as error results
 * - HTTP 5xx errors return user message about server issues
 * - HTTP 4xx errors return validation/input error message
 * - Network/unexpected errors are caught and wrapped in ServerActionResult
 *
 * **Side Effects:**
 * - Removes the matching product from the invoice in the backend database (hard delete)
 * - Recalculates invoice totals automatically
 * - Revalidates Next.js cache for invoice pages
 * - Emits telemetry spans and logs
 *
 * @param params - The input parameters object.
 * @param params.invoiceId - The UUID of the invoice containing the product. Must be a valid UUIDv4 string.
 * @param params.productName - The product name used to locate the target item.
 *   Matched case-insensitively as a substring by the backend; pass the full name to be safe.
 * @returns A result object with void data on success, or an error result when validation, authorization, or the backend request fails.
 *
 * @example
 * ```typescript
 * // Delete a product from an invoice
 * const result = await deleteInvoiceProduct({
 *   invoiceId: "123e4567-e89b-12d3-a456-426614174000",
 *   productName: "Zuzu Milk 2% 1 Liter"
 * });
 *
 * if (result.success) {
 *   console.log("Product deleted successfully");
 *   // Product has been removed from the invoice; totals will be recalculated.
 * } else {
 *   console.error("Failed to delete product:", result.error);
 * }
 * ```
 *
 * @see {@link addInvoiceProduct} - Sibling action for adding products
 * @see {@link fetchBFFUserFromAuthService} - Authentication token retrieval
 * @see {@link validateStringIsGuidType} - GUID validation utility
 * @see {@link ServerActionResult} - Result type wrapper
 */
export async function deleteInvoiceProduct({invoiceId, productName}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{deleteInvoiceProduct}}, for identifier:", {invoiceId});

  return withSpan("api.actions.invoices.deleteInvoiceProduct", async () => {
    try {
      // Step 0. Validate input is correct
      logWithTrace("info", "Validating identifier is valid...", {invoiceId}, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to delete the product
      addSpanEvent("bff.request.delete-invoice-product.start");
      logWithTrace("info", "Making API request to delete product from invoice...", {invoiceId}, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/products`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({productName}),
      });
      addSpanEvent("bff.request.delete-invoice-product.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully deleted product from invoice...", {invoiceId}, "server");
        revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
        revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
        return {success: true, data: undefined} as const;
      }

      addSpanEvent("bff.request.delete-invoice-product.error");
      const errorText = await response.text();
      const internalMessage = `Failed to delete product: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, {invoiceId, errorText}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to delete the product. Please check your input and try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.delete-invoice-product.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error deleting product from invoice...", {error, invoiceId}, "server");
      console.error("Error deleting product from invoice:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
