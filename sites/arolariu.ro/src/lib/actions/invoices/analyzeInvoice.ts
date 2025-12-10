"use server";

import {API_URL} from "@/lib/utils.server";
import {addSpanEvent, logWithTrace, withSpan} from "@/telemetry";
import type {InvoiceAnalysisOptions} from "@/types/invoices";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

type ServerActionInputType = Readonly<{
  readonly invoiceIdentifier: string;
  readonly analysisOptions: Readonly<InvoiceAnalysisOptions>;
}>;

type ServerActionOutputType = Promise<Readonly<void>>;

/**
 * Analyzes an invoice for a given user.
 * @param id The identifier of the invoice to be analyzed.
 * @param authToken The JWT token of the user.
 * @returns A promise that resolves to the analyzed Invoice object or null if the analysis fails.
 */
export default async function analyzeInvoice({invoiceIdentifier, analysisOptions}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{analyzeInvoice}}, with:", {invoiceIdentifier, analysisOptions});

  return withSpan("api.actions.invoices.analyzeInvoice", async () => {
    try {
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
