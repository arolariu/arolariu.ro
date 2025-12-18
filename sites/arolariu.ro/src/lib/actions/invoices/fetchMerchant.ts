"use server";

import {addSpanEvent, logWithTrace, withSpan} from "@/telemetry";
import type {Merchant} from "@/types/invoices";
import {API_URL} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

type ServerActionInputType = Readonly<{
  /** The identifier of the merchant to fetch. */
  readonly merchantId: string;
}>;
type ServerActionOutputType = Promise<Readonly<Merchant>>;

/**
 * Server action that fetches a single Merchant for a user.
 * @param id The id of the merchant to fetch.
 * @param authToken The JWT token of the user.
 * @returns A promise of the merchant, or undefined if the request failed.
 */
export default async function fetchMerchant({merchantId}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action::fetchMerchant, with:", {merchantId});

  return withSpan("api.actions.invoices.fetchMerchant", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to fetch the merchant
      addSpanEvent("bff.request.fetch-merchant.start");
      logWithTrace("info", "Making API request to fetch merchant", {merchantId}, "server");
      const response = await fetch(`${API_URL}/rest/v1/merchants/${merchantId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.fetch-merchant.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully fetched merchant", {merchantId}, "server");
        return response.json() as ServerActionOutputType;
      }

      const errorText = await response.text();
      throw new Error(`BFF fetch merchant request failed: ${response.status} ${response.statusText} - ${errorText}`);
    } catch (error) {
      addSpanEvent("bff.request.fetch-merchant.error");
      logWithTrace("error", "Error fetching the merchant from the server", {error, merchantId}, "server");
      console.error("Error fetching the merchant from the server:", error);
      throw error;
    }
  });
}
