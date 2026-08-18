"use server";

/**
 * @fileoverview Strict identity-free server action for deleting an invoice product.
 * @module app/domains/invoices/_actions/invoices/products/deleteInvoiceProduct
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import {isProductUpdateSelector, type ProductUpdateSelector} from "@/types/invoices";
import {revalidatePath} from "next/cache";

type DeleteProductInput = Readonly<{
  /** Parent invoice UUID. */
  readonly invoiceId: string;
  /** Immutable pre-mutation selector for the one persisted product. */
  readonly selector: ProductUpdateSelector;
}>;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDeleteProductInput(value: unknown): value is DeleteProductInput {
  return (
    isRecord(value)
    && Object.keys(value).length === 2
    && Object.hasOwn(value, "invoiceId")
    && Object.hasOwn(value, "selector")
    && typeof value["invoiceId"] === "string"
    && isProductUpdateSelector(value["selector"])
  );
}

function createSafeDeleteProductMessage(status: number): string {
  return status >= 500
    ? "Product deletion is temporarily unavailable. Please try again."
    : "Unable to delete the product. Please refresh and try again.";
}

/**
 * Deletes exactly one persisted product through the backend selector contract.
 *
 * @param input - Untrusted invoice identifier and exact nested product selector.
 * @returns A safe success or failure result without response-body disclosure.
 */
export async function deleteInvoiceProduct(input: unknown): ServerActionResult<void> {
  return withSpan("api.actions.invoices.deleteInvoiceProduct", async () => {
    if (!isDeleteProductInput(input)) {
      return {success: false, error: {code: "VALIDATION_ERROR", message: "Product deletion request is invalid."}};
    }

    try {
      validateStringIsGuidType(input.invoiceId, "invoiceId");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout(`/rest/v1/invoices/${input.invoiceId}/products`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({selector: input.selector}),
      });

      if (!response.ok) {
        const code = mapHttpStatusToErrorCode(response.status);
        addSpanEvent("bff.invoice.product.delete.rejected", {httpStatus: response.status, errorCode: code});
        logWithTrace("warn", "invoice.product.delete.rejected", {httpStatus: response.status, errorCode: code}, "server");
        return {success: false, error: {code, message: createSafeDeleteProductMessage(response.status), status: response.status}};
      }

      revalidatePath(`/domains/invoices/edit-invoice/${input.invoiceId}`, "page");
      revalidatePath(`/domains/invoices/view-invoice/${input.invoiceId}`, "page");
      addSpanEvent("bff.invoice.product.delete.complete");
      logWithTrace("info", "invoice.product.delete.complete", undefined, "server");
      return {success: true, data: undefined};
    } catch (error) {
      addSpanEvent("bff.invoice.product.delete.failed");
      logWithTrace("error", "invoice.product.delete.failed", {errorCode: "NETWORK_ERROR"}, "server");
      return createErrorResult(error, "Unable to delete the product. Please try again.");
    }
  });
}
