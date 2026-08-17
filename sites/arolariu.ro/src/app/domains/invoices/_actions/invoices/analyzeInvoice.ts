"use server";

/**
 * @fileoverview Server action for enqueueing invoice analysis.
 * @module app/domains/invoices/_actions/invoices/analyzeInvoice
 *
 * @remarks
 * This action sends only the profile and capability overrides to the backend.
 * The authenticated principal identifies the tenant server-side; request payloads
 * must never carry a user identifier.
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "@/lib/utils.server";
import {
  InvoiceAnalysisOptions,
  isAnalysisAcceptedResponse,
  isAnalyzeInvoiceRequest,
  type AnalysisAcceptedResponse,
  type AnalyzeInvoiceRequest,
  type InvoiceAnalysisOptions as LegacyInvoiceAnalysisOption,
} from "@/types/invoices";

/**
 * Input accepted by the invoice analysis enqueue action.
 */
type InvoiceAnalysisRequestInput = Readonly<{
  /** UUID of the invoice to enqueue. */
  readonly invoiceIdentifier: string;
  /** Exact profile-and-overrides payload for the invoice analysis API. */
  readonly request: AnalyzeInvoiceRequest;
}>;

/**
 * Temporary input retained while legacy analysis controls are migrated.
 *
 * @deprecated Use {@link InvoiceAnalysisRequestInput} with an explicit profile
 * and overrides request instead.
 */
type LegacyInvoiceAnalysisInput = Readonly<{
  /** UUID of the invoice to enqueue. */
  readonly invoiceIdentifier: string;
  /** Legacy numeric option selected by the existing analysis controls. */
  readonly analysisOptions: LegacyInvoiceAnalysisOption;
}>;

type ServerActionInputType = InvoiceAnalysisRequestInput | LegacyInvoiceAnalysisInput;

/**
 * Result returned from an invoice analysis enqueue request.
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

function isLegacyInvoiceAnalysisInput(input: ServerActionInputType): input is LegacyInvoiceAnalysisInput {
  return "analysisOptions" in input;
}

function resolveLegacyRequest(analysisOptions: LegacyInvoiceAnalysisOption): AnalyzeInvoiceRequest | null {
  switch (analysisOptions) {
    case InvoiceAnalysisOptions.CompleteAnalysis:
      return {profile: "comprehensive", overrides: {}};
    case InvoiceAnalysisOptions.InvoiceOnly:
    case InvoiceAnalysisOptions.InvoiceItemsOnly:
      return {profile: "balanced", overrides: {}};
    case InvoiceAnalysisOptions.InvoiceMerchantOnly:
      return {profile: "fast", overrides: {}};
    case InvoiceAnalysisOptions.NoAnalysis:
      return null;
  }
}

/**
 * Enqueues asynchronous analysis for one invoice.
 *
 * @remarks
 * The backend must answer with HTTP 202 and a complete
 * {@link AnalysisAcceptedResponse}. This action validates both caller input and
 * backend JSON before returning it, uses a 15-second enqueue timeout, and does
 * not log the request payload or response body.
 *
 * @param input - The target invoice UUID and exact analysis enqueue request.
 * @returns The durable accepted-run acknowledgement, or a standardized error result.
 */
export async function analyzeInvoice(input: ServerActionInputType): ServerActionOutputType {
  const {invoiceIdentifier} = input;
  const request = isLegacyInvoiceAnalysisInput(input) ? resolveLegacyRequest(input.analysisOptions) : input.request;

  return withSpan("api.actions.invoices.analyzeInvoice", async () => {
    try {
      validateStringIsGuidType(invoiceIdentifier, "invoiceIdentifier");
    } catch (error) {
      return createValidationResult(error instanceof Error ? error.message : "Invoice identifier is invalid.");
    }

    if (request === null || !isAnalyzeInvoiceRequest(request)) {
      return createValidationResult("Invoice analysis request is invalid.");
    }

    try {
      addSpanEvent("bff.invoice.analyze.enqueue.start");
      logWithTrace("debug", "Enqueueing invoice analysis.", undefined, "server");

      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      const response = await fetchWithTimeout(
        `/rest/v1/invoices/${invoiceIdentifier}/analyze`,
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
        addSpanEvent("bff.invoice.analyze.enqueue.rejected", {"http.response.status_code": response.status});
        return {
          success: false,
          error: {
            code: mapHttpStatusToErrorCode(response.status),
            message: "Invoice analysis request was not accepted.",
            status: response.status,
          },
        } as const;
      }

      const responseData: unknown = await response.json();
      if (
        !isAnalysisAcceptedResponse(responseData)
        || responseData.targetType !== "invoice"
        || responseData.targetId !== invoiceIdentifier
      ) {
        addSpanEvent("bff.invoice.analyze.enqueue.invalid-response");
        return {
          success: false,
          error: {
            code: "UNKNOWN_ERROR",
            message: "Invoice analysis returned an invalid acceptance response.",
          },
        } as const;
      }

      addSpanEvent("bff.invoice.analyze.enqueue.accepted");
      return {success: true, data: responseData} as const;
    } catch (error) {
      addSpanEvent("bff.invoice.analyze.enqueue.error");
      logWithTrace("error", "Invoice analysis enqueue failed.", undefined, "server");
      return createErrorResult(error, "Unable to enqueue invoice analysis.");
    }
  }) satisfies ServerActionOutputType;
}
