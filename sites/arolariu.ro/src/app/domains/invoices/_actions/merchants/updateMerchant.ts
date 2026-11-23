"use server";

/**
 * @fileoverview Server action for updating client-editable merchant fields.
 * @module app/domains/invoices/_actions/merchants/updateMerchant
 *
 * @remarks
 * Category-only edits do not echo unrelated merchant fields.
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, createHttpErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import type {Merchant, MerchantCategory} from "@/types/invoices";
import {isCategoryIntentInput, parseMerchantResponse, tryParse} from "@/types/invoices/transport";

type ServerActionInputType = Readonly<{merchantId: string}>
  & (Readonly<{category: MerchantCategory | null; merchant?: never}> | Readonly<{category?: MerchantCategory | null; merchant: Merchant}>);

type ServerActionOutputType = ServerActionResult<Readonly<Merchant>>;

/**
 * Updates a merchant, either with a category-only change or a full edit.
 *
 * @remarks
 * **HTTP Method**: PUT
 * **Endpoint**: `/rest/v1/merchants/{merchantId}`
 * **Response**: `202 Accepted` with the updated merchant body.
 *
 * @param input - The merchant ID and the edit. Omit category to preserve it, or send null to clear it.
 * @returns A result object containing the updated merchant, or an error result.
 */
export async function updateMerchant({merchantId, merchant, category}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{updateMerchant}}, with:", {merchantId, merchantName: merchant?.name});

  return withSpan("api.actions.invoices.updateMerchant", async () => {
    try {
      logWithTrace("info", "Validating merchant identifier is valid...", {merchantId}, "server");
      validateStringIsGuidType(merchantId, "merchantId");
      if (!isCategoryIntentInput(category)) {
        return createHttpErrorResult(400, "Invalid merchant category.");
      }

      if (merchant === undefined && typeof category === "undefined") {
        return createHttpErrorResult(400, "A merchant update is required.");
      }

      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      addSpanEvent("bff.request.update-merchant.start");
      logWithTrace("info", "Making API request to update merchant...", {merchantId}, "server");
      const requestDto = {
        ...(category !== undefined ? {category} : {}),
        ...(merchant === undefined
          ? {}
          : {
              name: merchant.name,
              description: merchant.description,
              address: merchant.address,
              additionalMetadata: null,
            }),
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
      return createHttpErrorResult(response.status, userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.update-merchant.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error updating the merchant", {error, merchantId}, "server");
      console.error("Error updating the merchant:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
