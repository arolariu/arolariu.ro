"use server";

import {API_URL} from "@/lib/utils.server";
import {addSpanEvent, logWithTrace, withSpan} from "@/telemetry";
import type {CreateInvoiceScanDtoPayload} from "@/types/invoices";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

type ServerActionInputType = Readonly<{
  invoiceId: string;
  payload: CreateInvoiceScanDtoPayload;
}>;
type ServerActionOutputType = Promise<void>;

/**
 * Server action to attach a scan to an existing invoice.
 * @param invoiceId The ID of the invoice to attach the scan to.
 * @param payload The scan payload containing type, location, and metadata.
 */
export async function attachInvoiceScan({invoiceId, payload}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{attachInvoiceScan}}, with:", {invoiceId, payload});

  return withSpan("api.actions.invoices.attachInvoiceScan", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to attach the invoice scan
      addSpanEvent("bff.request.attach-scan.start");
      logWithTrace("info", "Making API request to attach invoice scan", {invoiceId}, "server");
      const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceId}/scans`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      addSpanEvent("bff.request.attach-scan.complete");

      if (!response.ok) {
        addSpanEvent("bff.request.attach-scan.error");
        const errorText = await response.text();
        logWithTrace(
          "error",
          "BFF attach invoice scan request failed",
          {status: response.status, statusText: response.statusText, errorText},
          "server",
        );
        throw new Error(`BFF attach invoice scan request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }
    } catch (error) {
      addSpanEvent("bff.request.attach-scan.error");
      logWithTrace("error", "Error attaching the invoice scan", {error, invoiceId}, "server");
      console.error("Error attaching the invoice scan:", error);
      throw error;
    }
  });
}
