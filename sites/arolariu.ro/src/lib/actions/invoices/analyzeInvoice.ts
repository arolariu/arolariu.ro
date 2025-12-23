"use server";

/**
 * @fileoverview Server action for triggering AI-powered invoice analysis.
 * @module lib/actions/invoices/analyzeInvoice
 *
 * @remarks
 * This action submits an invoice to the backend AI analysis pipeline.
 * The analysis extracts structured data from invoice scans including:
 * - Merchant identification and categorization
 * - Line item extraction with product matching
 * - Total amount verification
 * - Date and payment term extraction
 *
 * **Analysis Types**:
 * - `BasicAnalysis`: Quick extraction of key fields only
 * - `DetailedAnalysis`: Full OCR with product categorization
 *
 * @see {@link InvoiceAnalysisOptions} for available analysis modes
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {API_URL} from "@/lib/utils.server";
import type {InvoiceAnalysisOptions} from "@/types/invoices";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input parameters for the invoice analysis server action.
 *
 * @property invoiceIdentifier - Valid UUIDv4 of the invoice to analyze
 * @property analysisOptions - Configuration for the analysis pipeline
 */
type ServerActionInputType = Readonly<{
  /** The identifier of the invoice to be analyzed. */
  readonly invoiceIdentifier: string;
  /** Options for analyzing the invoice. */
  readonly analysisOptions: Readonly<InvoiceAnalysisOptions>;
}>;

/**
 * Output type indicating async completion with no return value.
 */
type ServerActionOutputType = Promise<Readonly<void>>;

/**
 * Submits an invoice to the AI-powered analysis pipeline.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches JWT from Clerk auth service.
 *
 * **Side Effects**:
 * - Emits OpenTelemetry spans for tracing
 * - Triggers async processing in the backend
 * - Analysis results are stored on the invoice entity
 *
 * **Error Handling**: Throws on validation failure, auth failure, or API errors.
 * Errors are logged with trace context for debugging.
 *
 * @param input - The invoice identifier and analysis configuration
 * @param input.invoiceIdentifier - UUIDv4 of the target invoice. Must exist and be owned by user.
 * @param input.analysisOptions - Analysis mode (Basic or Detailed)
 * @returns Promise that resolves when analysis is successfully queued
 * @throws {Error} When invoiceIdentifier is not a valid GUID
 * @throws {Error} When authentication fails
 * @throws {Error} When API returns non-OK status
 *
 * @example
 * ```typescript
 * import analyzeInvoice from "@/lib/actions/invoices/analyzeInvoice";
 * import {InvoiceAnalysisOptions} from "@/types/invoices";
 *
 * await analyzeInvoice({
 *   invoiceIdentifier: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
 *   analysisOptions: InvoiceAnalysisOptions.DetailedAnalysis
 * });
 * ```
 *
 * @see {@link fetchInvoice} to retrieve the analyzed invoice
 */
export default async function analyzeInvoice({invoiceIdentifier, analysisOptions}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{analyzeInvoice}}, with:", {invoiceIdentifier, analysisOptions});

  return withSpan("api.actions.invoices.analyzeInvoice", async () => {
    try {
      // Step 0. Validate input is correct
      logWithTrace("info", "Validating input for analyzeInvoice", {invoiceIdentifier}, "server");
      validateStringIsGuidType(invoiceIdentifier, "invoiceIdentifier");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userIdentifier, userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to analyze the invoice
      addSpanEvent("bff.invoice.analyze.start");
      logWithTrace("info", "Making API request to analyze invoice", {}, "server");
      const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceIdentifier}/analyze`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userIdentifier,
          analysisOptions,
        }),
      });
      addSpanEvent("bff.invoice.analyze.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully analyzed invoice", {}, "server");
        return;
      }

      const errorText = await response.text();
      throw new Error(`BFF analyze invoice request failed: ${response.status} ${response.statusText} - ${errorText}`);
    } catch (error) {
      addSpanEvent("bff.invoice.analyze.error");
      logWithTrace("error", "Error analyzing the invoice", {error}, "server");
      console.error("Error analyzing invoice:", error);
      throw error;
    }
  });
}
