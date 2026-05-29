"use server";

/**
 * @fileoverview Server action for fetching a single invoice by ID.
 * @module app/domains/invoices/_actions/invoices/fetchInvoice
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
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import {createErrorResult, fetchWithTimeout, type ServerActionResult} from "@/lib/utils.server";
import type {Invoice} from "@/types/invoices";

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
 * Returns a result with Invoice entity or error details.
 */
type ServerActionOutputType = ServerActionResult<Readonly<Invoice>>;

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
 * @param input - The fetch parameters.
 * @param input.invoiceId - UUIDv4 of the invoice to retrieve.
 * @returns A result object containing the complete invoice entity, or an error result when the invoice is missing or inaccessible.
 *
 * @example
 * ```typescript
 * import fetchInvoice from "@/app/domains/invoices/_actions/invoices/fetchInvoice";
 *
 * const result = await fetchInvoice({
 *   invoiceId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
 * });
 *
 * if (result.success) {
 *   console.log("Total amount:", result.data.estimatedSurface?.totalAmount);
 *   console.log("Number of items:", result.data.items?.length);
 * }
 * ```
 *
 * @see {@link Invoice} for the complete data structure
 * @see {@link fetchMerchant} for retrieving linked merchant details
 */
export async function fetchInvoice({invoiceId}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{fetchInvoice}}, with identifier:", {invoiceId});

  return withSpan("api.actions.invoices.fetchInvoice", async () => {
    try {
      // Step 0. Validate input is correct
      logWithTrace("info", "Validating identifier is valid...", {invoiceId}, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to fetch the invoice (with timeout)
      addSpanEvent("bff.request.fetch-invoice.start");
      logWithTrace("info", "Making API request to fetch invoice...", {invoiceId}, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.fetch-invoice.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully fetched invoice...", {invoiceId}, "server");
        const data = (await response.json()) as Readonly<Invoice>;
        return {success: true, data};
      }

      addSpanEvent("bff.request.fetch-invoice.error");
      const errorText = await response.text();
      const internalMessage = `API error fetching invoice: ${response.status} ${response.statusText} - ${errorText}`;
      logWithTrace("warn", internalMessage, {invoiceId, errorText}, "server");
      const userMessage =
        response.status === 404
          ? "Invoice not found or you don't have access to it."
          : response.status === 403
            ? "You are not authorized to view this invoice."
            : "An error occurred while fetching the invoice. Please try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.fetch-invoice.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error fetching the invoice from the server...", {error, invoiceId}, "server");
      console.error("Error fetching the invoice from the server:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
