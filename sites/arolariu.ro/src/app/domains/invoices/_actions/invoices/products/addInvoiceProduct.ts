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
 * - Optional: quantityUnit, productCode, detectedAllergens
 * - Server-generated: totalPrice, metadata
 *
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
 * Input parameters for the addInvoiceProduct server action.
 *
 * @remarks
 * The invoiceId must be a valid UUIDv4 GUID.
 * The product must include all required fields.
 */
type ServerActionInputType = Readonly<{
  /** The unique identifier of the invoice. Must be a valid UUIDv4 GUID. */
  readonly invoiceId: string;
  /** The product to add. Must include required fields: name, category, quantity, price. */
  readonly product: Omit<Product, "classification"> & Readonly<{classification?: ClassificationSelection | null}>;
}>;

/**
 * Output result type for the addInvoiceProduct server action.
 *
 * @remarks
 * Returns a ServerActionResult with the created product (including server-generated fields) on success.
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

function isAddInvoiceProductInput(value: unknown): value is ServerActionInputType {
  if (!isRecord(value) || typeof value["invoiceId"] !== "string" || !isProductInput(value["product"])) {
    return false;
  }

  const classification = value["product"]["classification"];
  return classification === undefined || classification === null || isClassificationSelection(classification);
}

function toProduct(input: ServerActionInputType["product"], response: ProductMutationResponse): Product {
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
 *     category: ProductCategory.DAIRY,
 *     quantity: 2,
 *     quantityUnit: "pcs",
 *     price: 8.99,
 *     detectedAllergens: [
 *       {
 *         name: "Lactose",
 *         description: "Milk sugar",
 *         learnMoreAddress: "https://example.com/allergens/lactose"
 *       }
 *     ]
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
export async function addInvoiceProduct(input: unknown): ServerActionOutputType {
  return withSpan("api.actions.invoices.addInvoiceProduct", async () => {
    try {
      if (!isAddInvoiceProductInput(input)) {
        addSpanEvent("bff.request.add-invoice-product.validation-error");
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Product update request is invalid.",
          },
        };
      }

      const {invoiceId, product} = input;
      // Step 0. Validate invoice identifier is valid GUID
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to add the product
      addSpanEvent("bff.request.add-invoice-product.start");
      const requestBody = {
        name: product.name,
        classification: product.classification ?? null,
        quantity: product.quantity,
        quantityUnit: product.quantityUnit,
        productCode: product.productCode,
        price: product.price,
      };
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/products`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });
      addSpanEvent("bff.request.add-invoice-product.complete");

      if (response.ok) {
        const createdProduct: unknown = await response.json();
        if (!isProductMutationResponse(createdProduct)) {
          addSpanEvent("bff.request.add-invoice-product.invalid-response");
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
          data: toProduct(product, createdProduct),
        } as const;
      }

      addSpanEvent("bff.request.add-invoice-product.error");
      const internalMessage = `Failed to add product: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, {httpStatus: response.status}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to add the product. Please check your input and try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error) {
      addSpanEvent("bff.request.add-invoice-product.error");
      logWithTrace("error", "Product creation request failed.", undefined, "server");
      return createErrorResult(error, "Unable to add the product. Please try again.");
    }
  }) satisfies ServerActionOutputType;
}
