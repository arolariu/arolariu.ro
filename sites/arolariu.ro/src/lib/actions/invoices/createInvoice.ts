"use server";

import {API_URL} from "@/lib/utils.server";
import {addSpanEvent, logWithTrace, withSpan} from "@/telemetry";
import type {CreateInvoiceDtoPayload, Invoice} from "@/types/invoices";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

type ServerActionInputType = Readonly<Partial<CreateInvoiceDtoPayload>>;
type ServerActionOutputType = Promise<Readonly<Invoice>>;

/**
 * Server action to create a new invoice entity in the backend.
 * @param payload The payload containing user identifier and metadata.
 * @param authToken The authentication token for the backend.
 * @returns The created Invoice entity.
 */
export async function createInvoice(payload: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{createInvoice}}, with:", {payload});

  return withSpan("api.actions.invoices.createInvoice", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userIdentifier, userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to create the invoice
      addSpanEvent("bff.invoice.create.start");
      logWithTrace("info", "Making API request to create invoice", {}, "server");
      const response = await fetch(`${API_URL}/rest/v1/invoices`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: payload.userIdentifier ? JSON.stringify(payload) : JSON.stringify({...payload, userIdentifier}),
      });
      addSpanEvent("bff.invoice.create.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully created invoice entity", {}, "server");
        return response.json() as ServerActionOutputType;
      }

      const errorText = await response.text();
      throw new Error(`BFF create invoice request failed: ${response.status} ${response.statusText} - ${errorText}`);
    } catch (error) {
      addSpanEvent("bff.invoice.create.error");
      logWithTrace("error", "Error creating the invoice entity", {error}, "server");
      console.error("Error creating the invoice entity:", error);
      throw error;
    }
  });
}
