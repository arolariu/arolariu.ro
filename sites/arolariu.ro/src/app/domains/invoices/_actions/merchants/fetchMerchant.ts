"use server";

/**
 * @fileoverview Safe server action for retrieving one merchant.
 * @module app/domains/invoices/_actions/merchants/fetchMerchant
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import type {Merchant} from "@/types/invoices";
import {parseMerchantTransport} from "@/types/invoices/transport";

type FetchMerchantInput = Readonly<{readonly merchantId: string}>;

/**
 * Fetches and strictly revives one merchant response.
 *
 * @param input - Merchant UUID.
 * @returns A Date-rich merchant or a fixed client-safe error result.
 */
export async function fetchMerchant({merchantId}: FetchMerchantInput): ServerActionResult<Readonly<Merchant>> {
  return withSpan("api.actions.invoices.fetchMerchant", async () => {
    try {
      validateStringIsGuidType(merchantId, "merchantId");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout(`/rest/v1/merchants/${merchantId}`, {
        headers: {Authorization: `Bearer ${authToken}`, "Content-Type": "application/json"},
      });

      if (!response.ok) {
        const code = mapHttpStatusToErrorCode(response.status);
        addSpanEvent("bff.merchant.fetch.rejected", {httpStatus: response.status, errorCode: code});
        logWithTrace("warn", "merchant.fetch.rejected", {httpStatus: response.status, errorCode: code}, "server");
        return {success: false, error: {code, message: "Unable to fetch the merchant. Please try again.", status: response.status}};
      }

      const responseBody: unknown = await response.json();
      const merchant = parseMerchantTransport(responseBody);
      if (merchant === null) {
        return {success: false, error: {code: "SERVER_ERROR", message: "The merchant response was invalid. Please try again."}};
      }

      addSpanEvent("bff.merchant.fetch.complete");
      logWithTrace("info", "merchant.fetch.complete", undefined, "server");
      return {success: true, data: merchant};
    } catch (error) {
      addSpanEvent("bff.merchant.fetch.failed");
      logWithTrace("error", "merchant.fetch.failed", {errorCode: "NETWORK_ERROR"}, "server");
      return createErrorResult(error, "Unable to fetch the merchant. Please try again.");
    }
  });
}
