"use server";

/**
 * @fileoverview Server action for fetching a single invoice by ID.
 * @module lib/actions/invoices/fetchInvoice
 *
 * @remarks
 * Retrieves a complete invoice entity including all nested data:
 * - Invoice metadata and financial information
 * - Associated scans with URLs
 * - Linked merchant reference
 * - Product line items (if analyzed)
 * - Sharing information
 *
 * **Access Control**:
 * - User must own the invoice OR be in the `sharedWith` list
 * - Returns 404 for invoices the user cannot access
 *
 * @see {@link fetchInvoices} for fetching all user invoices
 * @see {@link Invoice} for the returned data structure
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import type {Invoice} from "@/types/invoices";
import {API_URL} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input parameters for fetching a single invoice.
 *
 * @property invoiceId - UUIDv4 of the invoice to fetch
 */
type ServerActionInputType = Readonly<{
  /** The identifier of the invoice to fetch. */
  readonly invoiceId: string;
}>;
/**
 * Returns the complete Invoice entity with all nested data.
 */
type ServerActionOutputType = Promise<Readonly<Invoice>>;

/**
 * Fetches a single invoice by its unique identifier.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches JWT from Clerk auth service.
 *
 * **Data Returned**:
 * - Full invoice aggregate including scans, products, metadata
 * - Merchant reference (use {@link fetchMerchant} for full merchant data)
 * - Analysis results if previously analyzed
 *
 * **Caching**: Response is not cached; always fetches fresh data.
 *
 * **Side Effects**: Emits OpenTelemetry spans for tracing.
 *
 * @param input - The fetch parameters
 * @param input.invoiceId - UUIDv4 of the invoice to retrieve
 * @returns Promise resolving to the complete Invoice entity
 * @throws {Error} When invoiceId is not a valid GUID
 * @throws {Error} When authentication fails
 * @throws {Error} When invoice not found (404)
 * @throws {Error} When user not authorized to view invoice (403)
 *
 * @example
 * ```typescript
 * import fetchInvoice from "@/lib/actions/invoices/fetchInvoice";
 *
 * const invoice = await fetchInvoice({
 *   invoiceId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
 * });
 *
 * console.log("Total amount:", invoice.estimatedSurface?.totalAmount);
 * console.log("Number of items:", invoice.items?.length);
 * ```
 *
 * @see {@link Invoice} for the complete data structure
 * @see {@link fetchMerchant} for retrieving linked merchant details
 */
export default async function fetchInvoice({invoiceId}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action::fetchInvoice, with:", {invoiceId});

  return withSpan("api.actions.invoices.fetchInvoice", async () => {
    try {
      // Step 0. Validate input is correct
      logWithTrace("info", "Validating input for fetchInvoice", {invoiceId}, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

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
