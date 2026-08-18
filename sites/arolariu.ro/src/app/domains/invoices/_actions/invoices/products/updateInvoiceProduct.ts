"use server";

/**
 * @fileoverview Server action for updating existing products in invoice line items.
 * @module app/domains/invoices/_actions/invoices/products/updateInvoiceProduct
 *
 * @remarks
 * Provides server-side product management for one persisted invoice line item.
 *
 * **Key Features:**
 * - Server-side execution with authentication
 * - GUID validation for invoice identifiers
 * - Product identification by normalized original name
 * - Automatic cache revalidation for edit/view pages
 * - OpenTelemetry instrumentation for observability
 * - Structured error handling with user-friendly messages
 *
 * **Classification Preservation:**
 * - Callers submit only an optional `{system, code}` GS1 GPC selection.
 * - A null selection retains the persisted canonical classification, including
 *   server-owned version, evidence, provenance, and confidence fields.
 * - The backend mutates the selected line item in place, retaining analysis and
 *   workflow state while marking the item as manually edited.
 *
 * @see {@link addInvoiceProduct} - Sibling action for adding products
 * @see {@link deleteInvoiceProduct} - Sibling action for deleting products
 * @see {@link Product} - Product type definition
 * @see {@link ServerActionResult} - Standard result wrapper type
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import {
  isClassificationSelection,
  isStandardClassification,
  type ClassificationSelection,
  type Product,
  type StandardClassification,
} from "@/types/invoices";
import {revalidatePath} from "next/cache";

/**
 * Input parameters for the updateInvoiceProduct server action.
 *
 * @remarks
 * The invoiceId must be a valid UUIDv4 GUID.
 * The payload contains both the identifier (originalProductName) and the updated product data.
 */
type ServerActionInputType = Readonly<{
  /** The unique identifier of the invoice. Must be a valid UUIDv4 GUID. */
  readonly invoiceId: string;
  /** The product update payload containing identifier and new data. */
  readonly payload: Readonly<{
    /**
     * The current product name used by the backend's normalized exact matcher.
     */
    readonly originalProductName: string;
    /**
     * Client-editable product values and an optional reduced GS1 GPC selection.
     * Server-owned analysis and workflow state is retained by the backend.
     */
    readonly updatedProduct: Omit<Product, "classification"> & Readonly<{classification?: ClassificationSelection | null}>;
  }>;
}>;

/**
 * Output result type for the updateInvoiceProduct server action.
 *
 * @remarks
 * Returns a ServerActionResult with the updated product (including server-generated metadata) on success.
 * On failure, includes error details and user-friendly message.
 */
interface ProductMutationResponse {
  readonly name: string;
  readonly classification: StandardClassification | null;
  readonly quantity: number;
  readonly quantityUnit: string;
  readonly productCode: string;
  readonly price: number;
  readonly totalPrice: number;
  readonly metadata: Product["metadata"];
}

type ServerActionOutputType = ServerActionResult<Readonly<Product>>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProductInput(value: unknown): value is Product {
  if (
    !isRecord(value)
    || typeof value["name"] !== "string"
    || typeof value["category"] !== "number"
    || typeof value["quantity"] !== "number"
    || typeof value["quantityUnit"] !== "string"
    || typeof value["productCode"] !== "string"
    || typeof value["price"] !== "number"
    || typeof value["totalPrice"] !== "number"
    || !Array.isArray(value["detectedAllergens"])
    || !isRecord(value["metadata"])
  ) {
    return false;
  }

  const metadata = value["metadata"];
  return (
    typeof metadata["isEdited"] === "boolean"
    && typeof metadata["isComplete"] === "boolean"
    && typeof metadata["isSoftDeleted"] === "boolean"
    && typeof metadata["confidence"] === "number"
  );
}

function isProductMutationResponse(value: unknown): value is ProductMutationResponse {
  if (
    !isRecord(value)
    || typeof value["name"] !== "string"
    || (value["classification"] !== null && !isStandardClassification(value["classification"]))
    || typeof value["quantity"] !== "number"
    || typeof value["quantityUnit"] !== "string"
    || typeof value["productCode"] !== "string"
    || typeof value["price"] !== "number"
    || typeof value["totalPrice"] !== "number"
    || !isRecord(value["metadata"])
  ) {
    return false;
  }

  const metadata = value["metadata"];
  return (
    typeof metadata["isEdited"] === "boolean"
    && typeof metadata["isComplete"] === "boolean"
    && typeof metadata["isSoftDeleted"] === "boolean"
    && typeof metadata["confidence"] === "number"
  );
}

function isUpdateInvoiceProductInput(value: unknown): value is ServerActionInputType {
  if (
    !isRecord(value)
    || typeof value["invoiceId"] !== "string"
    || !isRecord(value["payload"])
    || typeof value["payload"]["originalProductName"] !== "string"
    || !isProductInput(value["payload"]["updatedProduct"])
  ) {
    return false;
  }

  const classification = value["payload"]["updatedProduct"]["classification"];
  return classification === undefined || classification === null || isClassificationSelection(classification);
}

function toProduct(input: ServerActionInputType["payload"]["updatedProduct"], response: ProductMutationResponse): Product {
  return {
    ...input,
    name: response.name,
    classification: response.classification,
    quantity: response.quantity,
    quantityUnit: response.quantityUnit,
    productCode: response.productCode,
    price: response.price,
    totalPrice: response.totalPrice,
    metadata: response.metadata,
  };
}

/**
 * Updates an existing product in an invoice's line items via the backend API.
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
 * **API Communication:** Makes PUT request to `/rest/v1/invoices/{id}/products`
 * endpoint with both originalProductName and updatedProduct in request body as JSON.
 *
 * **Product Identification:**
 * Products are located by a normalized exact match on `originalProductName`.
 *
 * **Update Strategy:**
 * - The backend changes only client-editable commercial fields in the matched
 *   persisted product and marks it as edited.
 * - The optional reduced selection is canonicalized server-side. A null
 *   selection preserves the existing canonical classification and its evidence.
 * - Product name may change (`updatedProduct.name` can differ from
 *   `originalProductName`).
 * - The response status is HTTP **202 Accepted**.
 *
 * **Wire Format:**
 * The backend DTO (`UpdateProductRequestDto`) is **flat**, not nested. This
 * action flattens the input `payload` before sending the safe DTO:
 * `{ originalProductName, name, classification, quantity, quantityUnit,
 * productCode, price }`. Category, allergen, metadata, and canonical
 * classification-display fields are server-owned and never sent on this wire.
 *
 * **Cache Revalidation:**
 * On successful update, automatically revalidates Next.js cache for:
 * - Edit invoice page: `/domains/invoices/edit-invoice/{id}`
 * - View invoice page: `/domains/invoices/view-invoice/{id}`
 *
 * **Observability:** Instrumented with OpenTelemetry spans and events:
 * - `api.actions.invoices.updateInvoiceProduct` - Parent span
 * - `bff.user.jwt.fetch.start/complete` - Auth events
 * - `bff.request.update-invoice-product.start/complete` - API request events
 * - `bff.request.update-invoice-product.error` - Error event
 *
 * **Error Handling:**
 * - GUID validation failures are caught and returned as error results
 * - HTTP 5xx errors return user message about server issues
 * - HTTP 4xx errors return validation/input error message
 * - Network/unexpected errors are caught and wrapped in ServerActionResult
 *
 * **Side Effects:**
 * - Removes the matched product and inserts the new payload in the backend database
 * - Revalidates Next.js cache for invoice pages
 * - Emits telemetry spans and logs
 *
 * @param params - The input parameters object.
 * @param params.invoiceId - The UUID of the invoice containing the product. Must be a valid UUIDv4 string.
 * @param params.payload - The update payload containing originalProductName and updatedProduct.
 * @param params.payload.originalProductName - Current product name used by the normalized backend matcher.
 * @param params.payload.updatedProduct - Client-editable product data and an optional `{system, code}` GS1 GPC selection.
 * @returns A result object containing the updated product on success, or an error result when validation, authorization, or the backend request fails.
 *
 * @example
 * ```typescript
 * // Correct commercial fields and select a canonical GS1 GPC code
 * const result = await updateInvoiceProduct({
 *   invoiceId: "123e4567-e89b-12d3-a456-426614174000",
 *   payload: {
 *     originalProductName: "Zuzu Milk 2% 1 Liter",
 *     updatedProduct: {
 *       name: "Zuzu Milk 2% 1 Liter",
 *       quantity: 2,
 *       quantityUnit: "pcs",
 *       productCode: "5941234567890",
 *       price: 8.99,
 *       classification: {system: ClassificationSystem.Gs1Gpc, code: "10000111"}
 *     }
 *   }
 * });
 *
 * if (result.success) {
 *   console.log("Updated product:", result.data);
 * } else {
 *   console.error("Failed to update product:", result.error);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Correct a price without replacing a server-owned classification
 * const priceResult = await updateInvoiceProduct({
 *   invoiceId: "123e4567-e89b-12d3-a456-426614174000",
 *   payload: {
 *     originalProductName: "Gala Apples",
 *     updatedProduct: {
 *       name: "Organic Gala Apples", // Name can be changed
 *       quantity: 3,
 *       quantityUnit: "kg",
 *       productCode: "",
 *       price: 15.99,
 *       classification: null
 *     }
 *   }
 * });
 * ```
 *
 * @see {@link addInvoiceProduct} - Sibling action for adding products
 * @see {@link deleteInvoiceProduct} - Sibling action for deleting products
 * @see {@link fetchBFFUserFromAuthService} - Authentication token retrieval
 * @see {@link validateStringIsGuidType} - GUID validation utility
 * @see {@link ServerActionResult} - Result type wrapper
 * @see {@link Product} - Product type definition
 */
export async function updateInvoiceProduct(input: unknown): ServerActionOutputType {
  return withSpan("api.actions.invoices.updateInvoiceProduct", async () => {
    try {
      if (!isUpdateInvoiceProductInput(input)) {
        addSpanEvent("bff.request.update-invoice-product.validation-error");
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Product update request is invalid.",
          },
        };
      }

      const {invoiceId, payload} = input;
      // Step 0. Validate input is correct
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to update the product.
      // Backend `UpdateProductRequestDto` is a flat record — we must NOT send
      // the nested `{ originalProductName, updatedProduct }` shape directly,
      // because ASP.NET would silently drop `updatedProduct` (unknown member)
      // and bind every other field to its default value, wiping out the product.
      const {originalProductName, updatedProduct} = payload;
      const requestBody = {
        originalProductName,
        name: updatedProduct.name,
        classification: updatedProduct.classification ?? null,
        quantity: updatedProduct.quantity,
        quantityUnit: updatedProduct.quantityUnit,
        productCode: updatedProduct.productCode,
        price: updatedProduct.price,
      } as const;

      addSpanEvent("bff.request.update-invoice-product.start");
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
        const product: unknown = await response.json();
        if (!isProductMutationResponse(product)) {
          addSpanEvent("bff.request.update-invoice-product.invalid-response");
          return {
            success: false,
            error: {
              code: "SERVER_ERROR",
              message: "The product update response was invalid. Please try again.",
            },
          };
        }

        revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
        revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
        return {
          success: true,
          data: toProduct(updatedProduct, product),
        } as const;
      }

      addSpanEvent("bff.request.update-invoice-product.error");
      const internalMessage = `Failed to update product: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, {httpStatus: response.status}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to update the product. Please check your input and try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error) {
      addSpanEvent("bff.request.update-invoice-product.error");
      logWithTrace("error", "Product update request failed.", undefined, "server");
      return createErrorResult(error, "Unable to update the product. Please try again.");
    }
  }) satisfies ServerActionOutputType;
}
