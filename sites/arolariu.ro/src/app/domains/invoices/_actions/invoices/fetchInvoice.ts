"use server";

/**
 * @fileoverview Safe server action for retrieving one invoice.
 * @module app/domains/invoices/_actions/invoices/fetchInvoice
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import type {Invoice} from "@/types/invoices";
import {parseInvoiceTransport} from "@/types/invoices/transport";

type FetchInvoiceInput = Readonly<{readonly invoiceId: string}>;

function createSafeFetchInvoiceMessage(status: number): string {
  if (status === 404) return "Invoice not found or you do not have access to it.";
  if (status === 401 || status === 403) return "You are not authorized to view this invoice.";
  return "Unable to fetch the invoice. Please try again.";
}

/**
 * Fetches and strictly revives one invoice response.
 *
 * @param input - Invoice UUID.
 * @returns A Date-rich invoice or fixed client-safe error result.
 */
export async function fetchInvoice({invoiceId}: FetchInvoiceInput): ServerActionResult<Readonly<Invoice>> {
  return withSpan("api.actions.invoices.fetchInvoice", async () => {
    try {
      validateStringIsGuidType(invoiceId, "invoiceId");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}`, {
        headers: {Authorization: `Bearer ${authToken}`, "Content-Type": "application/json"},
      });

      if (!response.ok) {
        const code = mapHttpStatusToErrorCode(response.status);
        addSpanEvent("bff.invoice.fetch.rejected", {httpStatus: response.status, errorCode: code});
        logWithTrace("warn", "invoice.fetch.rejected", {httpStatus: response.status, errorCode: code}, "server");
        return {success: false, error: {code, message: createSafeFetchInvoiceMessage(response.status), status: response.status}};
      }

      const responseBody: unknown = await response.json();
      const invoice = parseInvoiceTransport(responseBody);
      if (invoice === null) {
        addSpanEvent("bff.invoice.fetch.invalid-response");
        logWithTrace("warn", "invoice.fetch.invalid-response", undefined, "server");
        return {success: false, error: {code: "SERVER_ERROR", message: "The invoice response was invalid. Please try again."}};
      }

      addSpanEvent("bff.invoice.fetch.complete");
      logWithTrace("info", "invoice.fetch.complete", undefined, "server");
      return {success: true, data: invoice};
    } catch (error) {
      addSpanEvent("bff.invoice.fetch.failed");
      logWithTrace("error", "invoice.fetch.failed", {errorCode: "NETWORK_ERROR"}, "server");
      return createErrorResult(error, "Unable to fetch the invoice. Please try again.");
    }
  });
}
