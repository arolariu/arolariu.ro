"use server";

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import type {Merchant} from "@/types/invoices";
import {API_URL} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

type ServerActionInputType = Readonly<{}>;
type ServerActionOutputType = Promise<Readonly<Merchant[]>>;

/**
 * Server action that fetches all merchants for a user.
 * @param authToken The JWT token of the user.
 * @returns A promise of the merchants, or undefined if the request failed.
 */
export default async function fetchMerchants(_void?: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action::fetchMerchants");

  return withSpan("api.actions.invoices.fetchMerchants", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to fetch merchants
      addSpanEvent("bff.request.fetch-merchants.start");
      logWithTrace("info", "Making API request to fetch merchants", {}, "server");
      const response = await fetch(`${API_URL}/rest/v1/merchants`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.fetch-merchants.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully fetched merchants", {}, "server");
        return response.json() as ServerActionOutputType;
      }

      const errorText = await response.text();
      throw new Error(`BFF fetch merchants request failed: ${response.status} ${response.statusText} - ${errorText}`);
    } catch (error) {
      addSpanEvent("bff.request.fetch-merchants.error");
      logWithTrace("error", "Error fetching the merchants from the server", {error}, "server");
      console.error("Error fetching the merchants from the server:", error);
      throw error;
    }
  });
}
