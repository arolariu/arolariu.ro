"use server";

/**
 * @fileoverview Server action for triggering AI-powered invoice analysis.
 * @module app/domains/invoices/_actions/invoices/analyzeInvoice
 *
 * @remarks
 * Submits an invoice to the backend AI analysis pipeline by posting a flat
 * capability request (profile + optional overrides). Identity is resolved
 * server-side from the JWT — the body carries no user identifier.
 *
 * Returns the Azure queue message id on `202 Accepted` so callers can trace
 * the queued job if needed.
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import {buildAnalysisRequest, type AnalysisProfile, type InvoiceAnalysisCapabilities} from "@/types/invoices/Analysis";
import {parseAnalysisAcceptedResponse, tryParse} from "@/types/invoices/transport";

type ServerActionInputType = Readonly<{
  /** The identifier of the invoice to be analyzed. */
  readonly invoiceIdentifier: string;
  /** The named analysis profile to use. Never "custom". */
  readonly profile: AnalysisProfile;
  /** Optional capability overrides relative to the profile preset. */
  readonly overrides?: Partial<InvoiceAnalysisCapabilities>;
}>;

type ServerActionOutputType = ServerActionResult<string>;

/**
 * Submits an invoice to the AI-powered analysis pipeline.
 *
 * @param input - The invoice identifier, analysis profile, and optional overrides.
 * @param input.invoiceIdentifier - UUIDv4 of the target invoice.
 * @param input.profile - The analysis profile. Never "custom".
 * @param input.overrides - Optional capability overrides relative to the profile.
 * @returns The Azure queue message id on success, or an error result.
 */
export async function analyzeInvoice({invoiceIdentifier, profile, overrides}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{analyzeInvoice}}, with:", {invoiceIdentifier, profile});

  return withSpan("api.actions.invoices.analyzeInvoice", async () => {
    try {
      logWithTrace("info", "Validating identifier is valid...", {invoiceIdentifier}, "server");
      validateStringIsGuidType(invoiceIdentifier, "invoiceIdentifier");

      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      addSpanEvent("bff.invoice.analyze.start");
      logWithTrace("info", "Making API request to analyze invoice...", {}, "server");
      const requestBody = buildAnalysisRequest("invoice", profile, overrides);
      const response = await fetchWithTimeout(
        `/rest/v1/invoices/${invoiceIdentifier}/analyze`,
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
      addSpanEvent("bff.invoice.analyze.complete");

      if (response.ok) {
        const payload: unknown = await response.json();
        const parsed = tryParse(parseAnalysisAcceptedResponse, payload);
        if (!parsed.ok) {
          addSpanEvent("bff.invoice.analyze.invalid");
          logWithTrace("error", "Analysis response failed transport validation", {path: parsed.error.path}, "server");
          return createErrorResult(parsed.error, "The server returned an unexpected response. Please try again later.");
        }
        logWithTrace("info", "Successfully queued invoice analysis...", {}, "server");
        return {success: true, data: parsed.value} as const;
      }

      addSpanEvent("bff.invoice.analyze.error");
      const errorText = await response.text();
      const internalMessage = `Failed to analyze invoice: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, {invoiceIdentifier, errorText}, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred during analysis. Please try again later."
          : "Failed to analyze the invoice. Please try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.invoice.analyze.error");
      const errorMessage = error instanceof Error ? error.message : "Unknown analysis error";
      logWithTrace("error", "Error analyzing invoice...", {error: errorMessage, invoiceId: invoiceIdentifier}, "server");
      console.error("analyzeInvoice failed:", errorMessage, error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
