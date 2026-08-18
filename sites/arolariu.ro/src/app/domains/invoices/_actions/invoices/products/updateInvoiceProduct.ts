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
 * **Update Strategy:**
 * - The target product is located by `originalProductName` using a
 *   **case-insensitive substring match** on the backend
 *   (`String.Contains` with `InvariantCultureIgnoreCase`). Pass the full name
 *   to avoid matching the wrong item when names share a common substring.
 * - The backend implements "update" as a **delete + add** sequence: the matched
 *   product is removed and a brand-new product is constructed from the
 *   `updatedProduct` payload via `UpdateProductRequestDto.ToProduct()`. No
 *   server-side edit flag (`metadata.isEdited`) is set on this code path — the
 *   new product gets fresh default metadata.
 * - Therefore the payload must contain **all** product fields you want
 *   preserved; any field omitted will revert to its default value
 *   (empty string, `0`, empty allergen list, etc.).
 * - The endpoint responds with HTTP **202 Accepted** + the updated product.
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
     * The current name of the product to update. Backend performs a
     * case-insensitive substring match (`String.Contains` with
     * `InvariantCultureIgnoreCase`); pass the full product name to avoid
     * accidentally matching an unrelated item.
     */
    readonly originalProductName: string;
    /**
     * The complete updated product data. All fields you want preserved must
     * be present — the backend constructs a fresh product from this payload
     * (delete + add), so omitted fields revert to defaults.
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
 * Products are located by `originalProductName` using a **case-insensitive
 * substring match** on the backend (`String.Contains` with
 * `InvariantCultureIgnoreCase`). The first item whose name contains the
 * supplied string wins. Pass the full product name to avoid accidentally
 * targeting an unrelated item that shares a substring.
 *
 * **Update Strategy:**
 * - Backend implements update as **delete + add**: the matched product is
 *   removed from the invoice and a new product is built from the payload via
 *   `UpdateProductRequestDto.ToProduct()`, then added back.
 * - Because the new product is constructed from scratch, **all** fields you
 *   want preserved must be present in `updatedProduct`. Omitted fields land
 *   on their default values (empty string, `0`, empty allergen list).
 * - The new product carries fresh default metadata. There is no server-side
 *   `metadata.isEdited` flag set on this code path.
 * - Product name may change (`updatedProduct.name` can differ from
 *   `originalProductName`).
 * - The response status is HTTP **202 Accepted**.
 *
 * **Wire Format:**
 * The backend DTO (`UpdateProductRequestDto`) is **flat**, not nested. This
 * action flattens the input `payload` before sending so the wire body looks
 * like `{ originalProductName, name, category, quantity, quantityUnit,
 * productCode, price, detectedAllergens }`.
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
 * @param params.payload.originalProductName - The current product name used for the backend's case-insensitive substring match.
 * @param params.payload.updatedProduct - The complete updated product data; omitted fields are reset by the backend's delete-and-add flow.
 * @returns A result object containing the updated product on success, or an error result when validation, authorization, or the backend request fails.
 *
 * @example
 * ```typescript
 * // Update product allergens
 * const result = await updateInvoiceProduct({
 *   invoiceId: "123e4567-e89b-12d3-a456-426614174000",
 *   payload: {
 *     originalProductName: "Zuzu Milk 2% 1 Liter",
 *     updatedProduct: {
 *       name: "Zuzu Milk 2% 1 Liter",
 *       category: ProductCategory.DAIRY,
 *       quantity: 2,
 *       quantityUnit: "pcs",
 *       price: 8.99,
 *       detectedAllergens: [
 *         { name: "Lactose", description: "Milk sugar", learnMoreAddress: "" },
 *         { name: "Milk Protein", description: "Casein and whey proteins", learnMoreAddress: "" }
 *       ]
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
 * // Update product category and price
 * const categoryResult = await updateInvoiceProduct({
 *   invoiceId: "123e4567-e89b-12d3-a456-426614174000",
 *   payload: {
 *     originalProductName: "Gala Apples",
 *     updatedProduct: {
 *       name: "Organic Gala Apples", // Name can be changed
 *       category: ProductCategory.FRUITS,
 *       quantity: 3,
 *       quantityUnit: "kg",
 *       price: 15.99, // Price updated
 *       detectedAllergens: []
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
