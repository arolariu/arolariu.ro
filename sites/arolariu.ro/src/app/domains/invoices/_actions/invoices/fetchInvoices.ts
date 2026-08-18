"use server";

/**
 * @fileoverview Safe server action for retrieving accessible invoices.
 * @module app/domains/invoices/_actions/invoices/fetchInvoices
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import type {Invoice} from "@/types/invoices";
import {parseInvoiceTransport} from "@/types/invoices/transport";

/**
 * Fetches and strictly revives all accessible invoices.
 *
 * @returns Date-rich invoices or a fixed client-safe error result.
 */
export async function fetchInvoices(): ServerActionResult<ReadonlyArray<Invoice>> {
  return withSpan("api.actions.invoices.fetchInvoices", async () => {
    try {
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout("/rest/v1/invoices", {
        headers: {Authorization: `Bearer ${authToken}`, "Content-Type": "application/json"},
      });

      if (!response.ok) {
        const code = mapHttpStatusToErrorCode(response.status);
        addSpanEvent("bff.invoices.fetch.rejected", {httpStatus: response.status, errorCode: code});
        logWithTrace("warn", "invoices.fetch.rejected", {httpStatus: response.status, errorCode: code}, "server");
        return {success: false, error: {code, message: "Unable to fetch invoices. Please try again.", status: response.status}};
      }

      const responseBody: unknown = await response.json();
      if (!Array.isArray(responseBody)) {
        return {success: false, error: {code: "SERVER_ERROR", message: "The invoice response was invalid. Please try again."}};
      }

      const invoices: Invoice[] = [];
      for (const candidate of responseBody) {
        const invoice = parseInvoiceTransport(candidate);
        if (invoice === null) {
          return {success: false, error: {code: "SERVER_ERROR", message: "The invoice response was invalid. Please try again."}};
        }
        invoices.push(invoice);
      }

      addSpanEvent("bff.invoices.fetch.complete");
      logWithTrace("info", "invoices.fetch.complete", undefined, "server");
      return {success: true, data: invoices};
    } catch (error) {
      addSpanEvent("bff.invoices.fetch.failed");
      logWithTrace("error", "invoices.fetch.failed", {errorCode: "NETWORK_ERROR"}, "server");
      return createErrorResult(error, "Unable to fetch invoices. Please try again.");
    }
  });
}
