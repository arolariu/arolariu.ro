"use server";

import {addSpanEvent, logWithTrace, withSpan} from "../../../telemetry";
import {API_URL} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

type ServerActionInputType = Readonly<{
  /** The identifier of the invoice to be deleted. */
  readonly invoiceId: string;
}>;
type ServerActionOutputType = Promise<Readonly<void>>;

/**
 * Deletes an invoice for a given user.
 * @param invoiceId The identifier of the invoice to be deleted.
 * @returns A promise that resolves when the invoice is deleted.
 */
export default async function deleteInvoice({invoiceId}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{deleteInvoice}}, with:", {invoiceId});

  return withSpan("api.actions.invoices.deleteInvoice", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to delete the invoice
      addSpanEvent("bff.request.delete-invoice.start");
      logWithTrace("info", "Making API request to delete invoice", {invoiceId}, "server");
      const response = await fetch(`${API_URL}/rest/v1/invoices/${invoiceId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.delete-invoice.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully deleted invoice", {invoiceId}, "server");
        return;
      }

      const errorText = await response.text();
      throw new Error(`BFF delete invoice request failed: ${response.status} ${response.statusText} - ${errorText}`);
    } catch (error) {
      addSpanEvent("bff.request.delete-invoice.error");
      logWithTrace("error", "Error deleting the invoice from the server", {error, invoiceId}, "server");
      console.error("Error deleting the invoice from the server:", error);
      throw error;
    }
  });
}
