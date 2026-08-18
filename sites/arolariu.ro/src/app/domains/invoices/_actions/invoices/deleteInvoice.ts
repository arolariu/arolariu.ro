"use server";

/**
 * @fileoverview Safe server action for soft-deleting one invoice.
 * @module app/domains/invoices/_actions/invoices/deleteInvoice
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import {revalidatePath} from "next/cache";

type DeleteInvoiceInput = Readonly<{readonly invoiceId: string}>;

/**
 * Deletes one invoice without reading or exposing rejected response bodies.
 *
 * @param input - Invoice UUID.
 * @returns A safe mutation result.
 */
export async function deleteInvoice({invoiceId}: DeleteInvoiceInput): ServerActionResult<void> {
  return withSpan("api.actions.invoices.deleteInvoice", async () => {
    try {
      validateStringIsGuidType(invoiceId, "invoiceId");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}`, {
        method: "DELETE",
        headers: {Authorization: `Bearer ${authToken}`, "Content-Type": "application/json"},
      });

      if (!response.ok) {
        const code = mapHttpStatusToErrorCode(response.status);
        addSpanEvent("bff.invoice.delete.rejected", {httpStatus: response.status, errorCode: code});
        logWithTrace("warn", "invoice.delete.rejected", {httpStatus: response.status, errorCode: code}, "server");
        return {success: false, error: {code, message: "Unable to delete the invoice. Please try again.", status: response.status}};
      }

      revalidatePath(`/domains/invoices/edit-invoice/${invoiceId}`, "page");
      revalidatePath(`/domains/invoices/view-invoice/${invoiceId}`, "page");
      addSpanEvent("bff.invoice.delete.complete");
      logWithTrace("info", "invoice.delete.complete", undefined, "server");
      return {success: true, data: undefined};
    } catch (error) {
      addSpanEvent("bff.invoice.delete.failed");
      logWithTrace("error", "invoice.delete.failed", {errorCode: "NETWORK_ERROR"}, "server");
      return createErrorResult(error, "Unable to delete the invoice. Please try again.");
    }
  });
}
