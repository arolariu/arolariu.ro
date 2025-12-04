"use server";

import {addSpanEvent, logWithTrace, withSpan} from "@/telemetry";
import type {Invoice} from "@/types/invoices";
import {API_URL} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

type ServerActionInputType = Readonly<{
  invoiceId: string;
}>;
type ServerActionOutputType = Promise<Readonly<Invoice>>;

/**
 * Server action that fetches a single invoice for a user.
 * @param id The id of the invoice to fetch.
 * @param authToken The JWT token of the user.
 * @returns A promise of the invoice, or undefined if the request failed.
 */
export default async function fetchInvoice({invoiceId}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action::fetchInvoice, with:", {invoiceId});

  return withSpan("api.actions.invoices.fetchInvoice", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to fetch the invoice
      addSpanEvent("bff.request.fetch-invoice.start");
      logWithTrace("info", "Making API request to fetch invoice", {invoiceId}, "server");
      const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.fetch-invoice.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully fetched invoice", {invoiceId}, "server");
        return response.json() as ServerActionOutputType;
      }

      const errorText = await response.text();
      throw new Error(`BFF fetch invoice request failed: ${response.status} ${response.statusText} - ${errorText}`);
    } catch (error) {
      addSpanEvent("bff.request.fetch-invoice.error");
      logWithTrace("error", "Error fetching the invoice from the server", {error, invoiceId}, "server");
      console.error("Error fetching the invoice from the server:", error);
      throw error;
    }
  });
}
