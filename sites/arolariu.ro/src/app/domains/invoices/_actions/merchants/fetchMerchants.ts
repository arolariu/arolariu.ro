"use server";

/**
 * @fileoverview Safe server action for retrieving accessible merchants.
 * @module app/domains/invoices/_actions/merchants/fetchMerchants
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import type {Merchant} from "@/types/invoices";
import {parseMerchantTransport} from "@/types/invoices/transport";

/**
 * Fetches and strictly revives all accessible merchant responses.
 *
 * @returns Date-rich merchants or a fixed client-safe error result.
 */
export async function fetchMerchants(_input?: Readonly<Record<string, never>>): ServerActionResult<ReadonlyArray<Merchant>> {
  return withSpan("api.actions.invoices.fetchMerchants", async () => {
    try {
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout("/rest/v1/merchants", {
        headers: {Authorization: `Bearer ${authToken}`, "Content-Type": "application/json"},
      });

      if (!response.ok) {
        const code = mapHttpStatusToErrorCode(response.status);
        addSpanEvent("bff.merchants.fetch.rejected", {httpStatus: response.status, errorCode: code});
        logWithTrace("warn", "merchants.fetch.rejected", {httpStatus: response.status, errorCode: code}, "server");
        return {success: false, error: {code, message: "Unable to fetch merchants. Please try again.", status: response.status}};
      }

      const responseBody: unknown = await response.json();
      if (!Array.isArray(responseBody)) {
        return {success: false, error: {code: "SERVER_ERROR", message: "The merchant response was invalid. Please try again."}};
      }

      const merchants: Merchant[] = [];
      for (const candidate of responseBody) {
        const merchant = parseMerchantTransport(candidate);
        if (merchant === null) {
          return {success: false, error: {code: "SERVER_ERROR", message: "The merchant response was invalid. Please try again."}};
        }
        merchants.push(merchant);
      }

      addSpanEvent("bff.merchants.fetch.complete");
      logWithTrace("info", "merchants.fetch.complete", undefined, "server");
      return {success: true, data: merchants};
    } catch (error) {
      addSpanEvent("bff.merchants.fetch.failed");
      logWithTrace("error", "merchants.fetch.failed", {errorCode: "NETWORK_ERROR"}, "server");
      return createErrorResult(error, "Unable to fetch merchants. Please try again.");
    }
  });
}
