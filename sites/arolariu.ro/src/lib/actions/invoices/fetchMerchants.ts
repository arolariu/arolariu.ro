"use server";

/**
 * @fileoverview Server action for fetching all merchants associated with user invoices.
 * @module lib/actions/invoices/fetchMerchants
 *
 * @remarks
 * Retrieves all merchants that have been identified from the user's invoices.
 * Merchants are extracted and enriched during invoice analysis.
 *
 * **Merchant Sources**:
 * - AI-extracted from analyzed invoices
 * - Manually linked by users
 * - Enriched with public business data
 *
 * **Use Cases**:
 * - Spending analysis by merchant
 * - Merchant category breakdown
 * - Filtering invoices by merchant
 *
 * @see {@link fetchMerchant} for fetching a single merchant by ID
 * @see {@link Merchant} for the returned data structure
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import type {Merchant} from "@/types/invoices";
import {API_URL, createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input type (currently empty, reserved for future filter options).
 */
type ServerActionInputType = Readonly<{}>;

/**
 * Returns a result with array of Merchant entities or error details.
 */
type ServerActionOutputType = Promise<ServerActionResult<Readonly<Merchant[]>>>;

/**
 * Fetches all merchants associated with the authenticated user's invoices.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches JWT from Clerk auth service.
 *
 * **Data Returned**:
 * - Array of merchant entities linked to user's invoices
 * - Includes AI-enriched fields (category, normalized name)
 * - Excludes merchants with no invoice associations
 *
 * **Performance**:
 * - Returns complete entities
 * - Consider client-side caching for merchant dropdowns
 *
 * **Side Effects**: Emits OpenTelemetry spans for tracing.
 *
 * @param _void - Reserved parameter for future filter options
 * @returns Promise resolving to array of Merchant entities
 * @throws {Error} When authentication fails
 * @throws {Error} When API returns non-OK status
 *
 * @example
 * ```typescript
 * import fetchMerchants from "@/lib/actions/invoices/fetchMerchants";
 *
 * const merchants = await fetchMerchants();
 *
 * // Group by category
 * const byCategory = merchants.reduce((acc, m) => {
 *   const cat = m.category ?? "Unknown";
 *   acc[cat] = acc[cat] ?? [];
 *   acc[cat].push(m);
 *   return acc;
 * }, {} as Record<string, Merchant[]>);
 * ```
 *
 * @see {@link fetchMerchant} for fetching a specific merchant
 * @see {@link Merchant} for the data structure
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

      // Step 2. Make the API request to fetch merchants (with timeout)
      addSpanEvent("bff.request.fetch-merchants.start");
      logWithTrace("info", "Making API request to fetch merchants", {}, "server");
      const response = await fetchWithTimeout(`${API_URL}/rest/v1/merchants`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.fetch-merchants.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully fetched merchants", {}, "server");
        const data = (await response.json()) as Readonly<Merchant[]>;
        return {success: true, data};
      }

      // Handle HTTP errors with standardized error codes
      const errorText = await response.text();
      const errorCode = mapHttpStatusToErrorCode(response.status);
      logWithTrace("error", "API returned error status", {status: response.status, errorText}, "server");

      return {
        success: false,
        error: {
          code: errorCode,
          message: `Failed to fetch merchants: ${response.status} ${response.statusText}`,
          status: response.status,
        },
      };
    } catch (error) {
      addSpanEvent("bff.request.fetch-merchants.error");
      logWithTrace("error", "Error fetching the merchants from the server", {error}, "server");
      console.error("Error fetching the merchants from the server:", error);
      return createErrorResult<Readonly<Merchant[]>>(error, "Failed to fetch merchants");
    }
  });
}
