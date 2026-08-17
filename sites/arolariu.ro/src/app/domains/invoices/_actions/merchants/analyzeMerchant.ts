"use server";

/**
 * @fileoverview Server action for enqueueing merchant analysis.
 * @module app/domains/invoices/_actions/merchants/analyzeMerchant
 *
 * @remarks
 * The backend derives tenancy from the authentication token, so this action sends
 * only the requested profile and merchant-only capability overrides.
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import {
  isAnalysisAcceptedResponse,
  isAnalyzeMerchantRequest,
  type AnalysisAcceptedResponse,
  type AnalyzeMerchantRequest,
} from "@/types/invoices";

/**
 * Input accepted by the merchant analysis enqueue action.
 */
type ServerActionInputType = Readonly<{
  /** UUID of the merchant to enqueue. */
  readonly merchantIdentifier: string;
  /** Exact profile-and-overrides payload for the merchant analysis API. */
  readonly request: AnalyzeMerchantRequest;
}>;

/**
 * Result returned from a merchant analysis enqueue request.
 */
type ServerActionOutputType = ServerActionResult<AnalysisAcceptedResponse>;

function createValidationResult(message: string): Awaited<ServerActionOutputType> {
  return {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message,
    },
  };
}

/**
 * Enqueues asynchronous analysis for one merchant.
 *
 * @remarks
 * The backend must answer with HTTP 202 and a complete
 * {@link AnalysisAcceptedResponse}. This action uses a 15-second enqueue timeout
 * and does not log request payloads or response bodies.
 *
 * @param input - The target merchant UUID and exact merchant-analysis request.
 * @returns The durable accepted-run acknowledgement, or a standardized error result.
 */
export async function analyzeMerchant({merchantIdentifier, request}: ServerActionInputType): ServerActionOutputType {
  return withSpan("api.actions.invoices.analyzeMerchant", async () => {
    try {
      validateStringIsGuidType(merchantIdentifier, "merchantIdentifier");
    } catch (error) {
      return createValidationResult(error instanceof Error ? error.message : "Merchant identifier is invalid.");
    }

    if (!isAnalyzeMerchantRequest(request)) {
      return createValidationResult("Merchant analysis request is invalid.");
    }

    try {
      addSpanEvent("bff.merchant.analyze.enqueue.start");
      logWithTrace("debug", "Enqueueing merchant analysis.", undefined, "server");

      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout(
        `/rest/v1/merchants/${merchantIdentifier}/analyze`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(request),
        },
        15_000,
      );

      if (!response.ok || response.status !== 202) {
        addSpanEvent("bff.merchant.analyze.enqueue.rejected", {"http.response.status_code": response.status});
        return {
          success: false,
          error: {
            code: mapHttpStatusToErrorCode(response.status),
            message: "Merchant analysis request was not accepted.",
            status: response.status,
          },
        } as const;
      }

      const responseData: unknown = await response.json();
      if (
        !isAnalysisAcceptedResponse(responseData)
        || responseData.targetType !== "merchant"
        || responseData.targetId !== merchantIdentifier
      ) {
        addSpanEvent("bff.merchant.analyze.enqueue.invalid-response");
        return {
          success: false,
          error: {
            code: "UNKNOWN_ERROR",
            message: "Merchant analysis returned an invalid acceptance response.",
          },
        } as const;
      }

      addSpanEvent("bff.merchant.analyze.enqueue.accepted");
      return {success: true, data: responseData} as const;
    } catch (error) {
      addSpanEvent("bff.merchant.analyze.enqueue.error");
      logWithTrace("error", "Merchant analysis enqueue failed.", undefined, "server");
      return createErrorResult(error, "Unable to enqueue merchant analysis.");
    }
  }) satisfies ServerActionOutputType;
}
