"use server";

/**
 * @fileoverview Server action for updating client-editable merchant fields.
 * @module app/domains/invoices/_actions/merchants/updateMerchant
 *
 * @remarks
 * Performs a full PUT on a merchant resource, replacing name, description,
 * address, and optional manual classification. Analysis-derived classifications
 * are never echoed back — `resolveClassificationCodeForWrite` returns null for
 * them so the backend preserves the persisted classification untouched.
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import type {Merchant} from "@/types/invoices";
import {resolveClassificationCodeForWrite} from "@/types/invoices/Classification";
import {parseMerchantResponse, tryParse} from "@/types/invoices/transport";

type ServerActionInputType = Readonly<{
  /** The identifier of the merchant to update. */
  readonly merchantId: string;
  /** The merchant data to apply. */
  readonly merchant: Merchant;
}>;

type ServerActionOutputType = ServerActionResult<Readonly<Merchant>>;

/**
 * Performs a full update (PUT) on a merchant resource.
 *
 * @remarks
 * **HTTP Method**: PUT
 * **Endpoint**: `/rest/v1/merchants/{merchantId}`
 * **Response**: `202 Accepted` with the updated merchant body.
 *
 * Classification provenance is preserved: analysis-derived codes are sent as
 * null so the backend keeps its persisted value; only manual codes travel.
 *
 * @param input - The merchant id and updated merchant data.
 * @returns A result object containing the updated merchant, or an error result.
 */
export async function updateMerchant({merchantId, merchant}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{updateMerchant}}, with:", {merchantId, merchantName: merchant?.name});

  return withSpan("api.actions.invoices.updateMerchant", async () => {
    try {
      logWithTrace("info", "Validating merchant identifier is valid...", {merchantId}, "server");
      validateStringIsGuidType(merchantId, "merchantId");

      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      addSpanEvent("bff.request.update-merchant.start");
      logWithTrace("info", "Making API request to update merchant...", {merchantId}, "server");
      const requestDto = {
        name: merchant.name,
        description: merchant.description,
        classificationCode: resolveClassificationCodeForWrite(merchant.classification),
        address: merchant.address,
        parentCompanyId: merchant.parentCompanyId ?? null,
        // Null preserves the persisted metadata; the frontend Merchant model does not
        // carry additionalMetadata, so it must never be sent as an empty overwrite.
        additionalMetadata: null,
      };
      const response = await fetchWithTimeout(`/rest/v1/merchants/${merchantId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestDto),
      });
      addSpanEvent("bff.request.update-merchant.complete");

      if (response.ok) {
        const responseBody: unknown = await response.json();
        const parsed = tryParse(parseMerchantResponse, responseBody);
        if (!parsed.ok) {
          addSpanEvent("bff.request.update-merchant.invalid");
          logWithTrace("error", "Update merchant response failed transport validation", {path: parsed.error.path}, "server");
          return createErrorResult(parsed.error, "The server returned unexpected data. Please try again later.");
        }
        logWithTrace("info", "Successfully updated merchant", {merchantId}, "server");
        return {success: true, data: parsed.value} as const;
      }

      addSpanEvent("bff.request.update-merchant.error");
      const errorText = await response.text();
      const internalMessage = `Failed to update merchant: ${response.status} ${response.statusText} - ${errorText}`;
      logWithTrace("warn", internalMessage, {merchantId, errorText}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to update the merchant. Please check your input and try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.update-merchant.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error updating the merchant", {error, merchantId}, "server");
      console.error("Error updating the merchant:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}