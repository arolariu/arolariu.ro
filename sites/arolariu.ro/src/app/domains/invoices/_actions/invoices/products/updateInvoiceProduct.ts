"use server";

/**
 * @fileoverview Exact product update action with identity-free selectors.
 * @module app/domains/invoices/_actions/invoices/products/updateInvoiceProduct
 */

import {addSpanEvent, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import {
  isClassificationSelection,
  isProductUpdateSelector,
  type Product,
  type ProductMutation,
  type ProductUpdateSelector,
} from "@/types/invoices";
import {parseProductTransport} from "@/types/invoices/transport";
import {revalidatePath} from "next/cache";

type UpdateProductInput = Readonly<{
  /** Parent invoice identifier. */
  readonly invoiceId: string;
  /** Deterministic selector and client-editable product values. */
  readonly payload: Readonly<{
    readonly selector: ProductUpdateSelector;
    readonly updatedProduct: ProductMutation;
  }>;
}>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(record);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

function isProductMutation(value: unknown): value is ProductMutation {
  return (
    isRecord(value)
    && hasExactKeys(value, ["name", "classification", "quantity", "quantityUnit", "productCode", "price"])
    && typeof value["name"] === "string"
    && (value["classification"] === null || isClassificationSelection(value["classification"]))
    && typeof value["quantity"] === "number"
    && Number.isFinite(value["quantity"])
    && value["quantity"] > 0
    && typeof value["quantityUnit"] === "string"
    && typeof value["productCode"] === "string"
    && typeof value["price"] === "number"
    && Number.isFinite(value["price"])
  );
}

function isUpdateProductInput(value: unknown): value is UpdateProductInput {
  return (
    isRecord(value)
    && hasExactKeys(value, ["invoiceId", "payload"])
    && typeof value["invoiceId"] === "string"
    && isRecord(value["payload"])
    && hasExactKeys(value["payload"], ["selector", "updatedProduct"])
    && isProductUpdateSelector(value["payload"]["selector"])
    && isProductMutation(value["payload"]["updatedProduct"])
  );
}

/**
 * Updates one selected product without resending server-owned analysis fields.
 *
 * @param input - Invoice ID, immutable original selector, and changed values.
 * @returns The complete parsed product response or a safe action error.
 */
export async function updateInvoiceProduct(input: unknown): ServerActionResult<Readonly<Product>> {
  return withSpan("api.actions.invoices.updateInvoiceProduct", async () => {
    if (!isUpdateProductInput(input)) {
      return {success: false, error: {code: "VALIDATION_ERROR", message: "Product update request is invalid."}};
    }

    try {
      validateStringIsGuidType(input.invoiceId, "invoiceId");
      const {userJwt} = await fetchBFFUserFromAuthService();
      const {selector, updatedProduct} = input.payload;
      const response = await fetchWithTimeout(`/rest/v1/invoices/${input.invoiceId}/products`, {
        method: "PUT",
        headers: {Authorization: `Bearer ${userJwt}`, "Content-Type": "application/json"},
        body: JSON.stringify({
          selector,
          name: updatedProduct.name,
          classification: updatedProduct.classification,
          quantity: updatedProduct.quantity,
          quantityUnit: updatedProduct.quantityUnit,
          productCode: updatedProduct.productCode,
          price: updatedProduct.price,
        }),
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: mapHttpStatusToErrorCode(response.status),
            message:
              response.status >= 500
                ? "A server error occurred. Please try again later."
                : "Failed to update the product. Please check your input and try again.",
            status: response.status,
          },
        };
      }

      const responseBody: unknown = await response.json();
      const product = parseProductTransport(responseBody);
      if (product === null) {
        addSpanEvent("bff.request.update-invoice-product.invalid-response");
        return {success: false, error: {code: "SERVER_ERROR", message: "The product update response was invalid. Please try again."}};
      }

      revalidatePath(`/domains/invoices/edit-invoice/${input.invoiceId}`, "page");
      revalidatePath(`/domains/invoices/view-invoice/${input.invoiceId}`, "page");
      return {success: true, data: product};
    } catch (error) {
      return createErrorResult(error, "Unable to update the product. Please try again.");
    }
  });
}
