"use server";

/**
 * @fileoverview Server action for adding products to invoice line items.
 * @module app/domains/invoices/_actions/invoices/products/addInvoiceProduct
 *
 * @remarks
 * Provides server-side product management functionality for adding new line items
 * to existing invoices. This operation appends a single product to the invoice's
 * items collection without requiring full collection reconstruction.
 *
 * **Key Features:**
 * - Server-side execution with authentication
 * - GUID validation for invoice identifiers
 * - Automatic cache revalidation for edit/view pages
 * - OpenTelemetry instrumentation for observability
 * - Structured error handling with user-friendly messages
 *
 * **Supported Fields:**
 * - Required: name, category, quantity, price
 * - Optional: quantityUnit, productCode
 * - Server-generated: totalPrice, metadata
 *
 * @see {@link Product} - Product type definition
 * @see {@link ServerActionResult} - Standard result wrapper type
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import type {Product} from "@/types/invoices";
import {resolveClassificationCodeForWrite} from "@/types/invoices/Classification";
import {parseProductResponse, tryParse} from "@/types/invoices/transport";
import {revalidatePath} from "next/cache";

/**
 * Input parameters for the addInvoiceProduct server action.
 *
 * @remarks
 * The invoiceId must be a valid UUIDv4 GUID.
 * The product must include all required fields.
 */
type ServerActionInputType = Readonly<{
  /** The unique identifier of the invoice. Must be a valid UUIDv4 GUID. */
  readonly invoiceId: string;
  /** The product to add. Must include required fields: name, quantity, price. */
  readonly product: Product;
}>;

/**
 * Output result type for the addInvoiceProduct server action.
 *
 * @remarks
 * Returns a ServerActionResult with the created product (including server-generated fields) on success.
 * On failure, includes error details and user-friendly message.
 */
type ServerActionOutputType = ServerActionResult<Readonly<Product>>;

/**
 * Adds a new product to an invoice's line items via the backend API.
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
 * **API Communication:** Makes POST request to `/rest/v1/invoices/{id}/products`
 * endpoint with the product payload in request body as JSON.
 *
 * **Server Processing:**
 * - Validates product data (name, category, quantity, price)
 * - Calculates totalPrice (quantity × price)
 * - Appends product to invoice items collection
 * - Returns complete product with server-generated metadata
 *
 * **Cache Revalidation:**
 * On successful creation, automatically revalidates Next.js cache for:
 * - Edit invoice page: `/domains/invoices/edit-invoice/{id}`
 * - View invoice page: `/domains/invoices/view-invoice/{id}`
 *
 * **Observability:** Instrumented with OpenTelemetry spans and events:
 * - `api.actions.invoices.addInvoiceProduct` - Parent span
 * - `bff.user.jwt.fetch.start/complete` - Auth events
 * - `bff.request.add-invoice-product.start/complete` - API request events
 * - `bff.request.add-invoice-product.error` - Error event
 *
 * **Error Handling:**
 * - GUID validation failures are caught and returned as error results
 * - HTTP 5xx errors return user message about server issues
 * - HTTP 4xx errors return validation/input error message
 * - Network/unexpected errors are caught and wrapped in ServerActionResult
 *
 * **Side Effects:**
 * - Adds product to invoice items in backend database
 * - Revalidates Next.js cache for invoice pages
 * - Emits telemetry spans and logs
 *
 * @param params - The input parameters object.
 * @param params.invoiceId - The UUID of the invoice to add the product to. Must be a valid UUIDv4 string.
 * @param params.product - The product payload with required fields (name, category, quantity, price).
 * @returns A result object containing the created product on success, or an error result when validation, authorization, or the backend request fails.
 *
 * @example
 * ```typescript
 * // Add a dairy product to an invoice
 * const result = await addInvoiceProduct({
 *   invoiceId: "123e4567-e89b-12d3-a456-426614174000",
 *   product: {
 *     name: "Zuzu Milk 2% 1 Liter",
 *     quantity: 2,
 *     quantityUnit: "pcs",
 *     price: 8.99,
 *     allergenAssessment: null,
 *   }
 * });
 *
 * if (result.success) {
 *   console.log("Added product:", result.data);
 *   console.log("Total price:", result.data.totalPrice); // Server-calculated
 * } else {
 *   console.error("Failed to add product:", result.error);
 * }
 * ```
 *
 * @see {@link fetchBFFUserFromAuthService} - Authentication token retrieval
 * @see {@link validateStringIsGuidType} - GUID validation utility
 * @see {@link ServerActionResult} - Result type wrapper
 * @see {@link Product} - Product type definition
 */
export async function addInvoiceProduct({invoiceId, product}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{addInvoiceProduct}}, for identifier:", {invoiceId});

  return withSpan("api.actions.invoices.addInvoiceProduct", async () => {
    try {
      // Step 0. Validate invoice identifier is valid GUID
      logWithTrace("info", "Validating identifier is valid...", {invoiceId}, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to add the product
      addSpanEvent("bff.request.add-invoice-product.start");
      logWithTrace("info", "Making API request to add product to invoice...", {invoiceId}, "server");
      const requestDto = {
        name: product.name,
        classificationCode: resolveClassificationCodeForWrite(product.classification),
        quantity: product.quantity,
        quantityUnit: product.quantityUnit,
        productCode: product.productCode,
        price: product.price,
        allergenAssessment: product.allergenAssessment,
      };
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestDto),
      });
      addSpanEvent("bff.request.add-invoice-product.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully added product to invoice...", {invoiceId}, "server");
        const responseBody: unknown = await response.json();
        const parsed = tryParse(parseProductResponse, responseBody);
        if (!parsed.ok) {
          addSpanEvent("bff.request.add-invoice-product.invalid");
          logWithTrace("error", "Add product response failed transport validation", {path: parsed.error.path}, "server");
          return createErrorResult(parsed.error, "The server returned unexpected data. Please try again later.");
        }
        revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
        revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
        return {
          success: true,
          data: parsed.value,
        } as const;
      }

      addSpanEvent("bff.request.add-invoice-product.error");
      const errorText = await response.text();
      const internalMessage = `Failed to add product: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, {invoiceId, errorText}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to add the product. Please check your input and try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.add-invoice-product.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error adding product to invoice...", {error, invoiceId}, "server");
      console.error("Error adding product to invoice:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
