"use server";

/**
 * @fileoverview Exact product creation action.
 * @module app/domains/invoices/_actions/invoices/products/addInvoiceProduct
 */

import {withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import {isClassificationSelection, type Product, type ProductMutation} from "@/types/invoices";
import {parseProductTransport} from "@/types/invoices/transport";
import {revalidatePath} from "next/cache";

type AddProductInput = Readonly<{
  readonly invoiceId: string;
  readonly product: ProductMutation;
}>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProductMutation(value: unknown): value is ProductMutation {
  const keys = isRecord(value) ? Object.keys(value) : [];
  return (
    isRecord(value)
    && keys.length === 6
    && keys.every((key) => ["name", "classification", "quantity", "quantityUnit", "productCode", "price"].includes(key))
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

function isAddProductInput(value: unknown): value is AddProductInput {
  return (
    isRecord(value)
    && Object.keys(value).length === 2
    && Object.hasOwn(value, "invoiceId")
    && Object.hasOwn(value, "product")
    && typeof value["invoiceId"] === "string"
    && isProductMutation(value["product"])
  );
}

/**
 * Adds an identity-free product using only backend-supported commercial fields.
 *
 * @param input - Parent invoice ID and product mutation fields.
 * @returns Parsed product DTO or a safe action error.
 */
export async function addInvoiceProduct(input: unknown): ServerActionResult<Readonly<Product>> {
  return withSpan("api.actions.invoices.addInvoiceProduct", async () => {
    if (!isAddProductInput(input)) {
      return {success: false, error: {code: "VALIDATION_ERROR", message: "Product creation request is invalid."}};
    }

    try {
      validateStringIsGuidType(input.invoiceId, "invoiceId");
      const {userJwt} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout(`/rest/v1/invoices/${input.invoiceId}/products`, {
        method: "POST",
        headers: {Authorization: `Bearer ${userJwt}`, "Content-Type": "application/json"},
        body: JSON.stringify(input.product),
      });

      if (!response.ok) {
        return {
          success: false,
          error: {
            code: mapHttpStatusToErrorCode(response.status),
            message:
              response.status >= 500
                ? "A server error occurred. Please try again later."
                : "Failed to add the product. Please check your input and try again.",
            status: response.status,
          },
        };
      }

      const responseBody: unknown = await response.json();
      const product = parseProductTransport(responseBody);
      if (product === null) {
        return {success: false, error: {code: "SERVER_ERROR", message: "The product response was invalid. Please try again."}};
      }

      revalidatePath(`/domains/invoices/edit-invoice/${input.invoiceId}`, "page");
      revalidatePath(`/domains/invoices/view-invoice/${input.invoiceId}`, "page");
      return {success: true, data: product};
    } catch (error) {
      return createErrorResult(error, "Unable to add the product. Please try again.");
    }
  });
}
