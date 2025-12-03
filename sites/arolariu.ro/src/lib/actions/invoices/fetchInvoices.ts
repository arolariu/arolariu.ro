"use server";

import {addSpanEvent, logWithTrace, withSpan} from "@/telemetry";
import type {Invoice} from "@/types/invoices";
import {API_URL} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

type ServerActionInputType = Readonly<{}>;
type ServerActionOutputType = Promise<ReadonlyArray<Invoice>>;

/**
 * Server action that fetches all invoices for a user.
 * @param authToken The JWT token of the user.
 * @returns A promise of the invoices, or undefined if the request failed.
 */
export default async function fetchInvoices(_void?: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action::fetchInvoices");

  return withSpan("api.actions.invoices.fetchInvoices", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to fetch invoices
      addSpanEvent("bff.request.fetch-invoices.start");
      logWithTrace("info", "Making API request to fetch invoices", {}, "server");
      const response = await fetch(`${API_URL}/rest/v1/invoices/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.fetch-invoices.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully fetched invoices", {}, "server");
        return response.json() as ServerActionOutputType;
      }

      const errorText = await response.text();
      throw new Error(`BFF fetch invoices request failed: ${response.status} ${response.statusText} - ${errorText}`);
    } catch (error) {
      addSpanEvent("bff.request.fetch-invoices.error");
      logWithTrace("error", "Error fetching the invoices from the server", {error}, "server");
      console.error("Error fetching the invoices from the server:", error);
      throw error;
    }
  });
}
