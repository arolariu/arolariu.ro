"use server";

/**
 * @fileoverview Server action for triggering AI-powered merchant analysis.
 * @module app/domains/invoices/_actions/analysis/analyzeMerchant
 *
 * @remarks
 * Submits a merchant to the backend AI analysis pipeline by posting a flat
 * capability request (profile + optional overrides). Identity is resolved
 * server-side from the JWT — the body carries no user identifier.
 *
 * Returns the Azure queue message id on `202 Accepted`.
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import {buildAnalysisRequest, type AnalysisProfile, type MerchantAnalysisCapabilities} from "@/types/invoices/Analysis";
import {parseAnalysisAcceptedResponse, tryParse} from "@/types/invoices/transport";

type ServerActionInputType = Readonly<{
  /** The identifier of the merchant to be analyzed. */
  readonly merchantIdentifier: string;
  /** The named analysis profile to use. Never "custom". */
  readonly profile: AnalysisProfile;
  /** Optional capability overrides relative to the profile preset. */
  readonly overrides?: Partial<MerchantAnalysisCapabilities>;
}>;

type ServerActionOutputType = ServerActionResult<string>;

/**
 * Submits a merchant to the AI-powered analysis pipeline.
 *
 * @param input - The merchant identifier, analysis profile, and optional overrides.
 * @param input.merchantIdentifier - UUIDv4 of the target merchant.
 * @param input.profile - The analysis profile. Never "custom".
 * @param input.overrides - Optional capability overrides relative to the profile.
 * @returns The Azure queue message id on success, or an error result.
 */
export async function analyzeMerchant({merchantIdentifier, profile, overrides}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{analyzeMerchant}}, with:", {merchantIdentifier, profile});

  return withSpan("api.actions.invoices.analyzeMerchant", async () => {
    try {
      logWithTrace("info", "Validating merchant identifier is valid...", {merchantIdentifier}, "server");
      validateStringIsGuidType(merchantIdentifier, "merchantIdentifier");

      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      addSpanEvent("bff.merchant.analyze.start");
      logWithTrace("info", "Making API request to analyze merchant...", {merchantIdentifier}, "server");
      const requestBody = buildAnalysisRequest("merchant", profile, overrides);
      const response = await fetchWithTimeout(
        `/rest/v1/merchants/${merchantIdentifier}/analyze`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
        60_000,
      );
      addSpanEvent("bff.merchant.analyze.complete");

      if (response.ok) {
        const payload: unknown = await response.json();
        const parsed = tryParse(parseAnalysisAcceptedResponse, payload);
        if (!parsed.ok) {
          addSpanEvent("bff.merchant.analyze.invalid");
          logWithTrace("error", "Merchant analysis response failed transport validation", {path: parsed.error.path}, "server");
          return createErrorResult(parsed.error, "The server returned an unexpected response. Please try again later.");
        }
        logWithTrace("info", "Successfully queued merchant analysis...", {merchantIdentifier}, "server");
        return {success: true, data: parsed.value} as const;
      }

      addSpanEvent("bff.merchant.analyze.error");
      const errorText = await response.text();
      const internalMessage = `Failed to analyze merchant: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, {merchantIdentifier, errorText}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred during analysis. Please try again later."
          : "Failed to analyze the merchant. Please try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.merchant.analyze.error");
      const errorMessage = error instanceof Error ? error.message : "Unknown analysis error";
      logWithTrace("error", "Error analyzing merchant...", {error: errorMessage, merchantIdentifier}, "server");
      console.error("analyzeMerchant failed:", errorMessage, error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
