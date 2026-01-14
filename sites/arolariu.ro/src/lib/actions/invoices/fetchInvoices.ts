"use server";

/**
 * @fileoverview Server action for fetching all invoices for the authenticated user.
 * @module lib/actions/invoices/fetchInvoices
 *
 * @remarks
 * Retrieves all invoices the user has access to, including:
 * - Invoices owned by the user
 * - Invoices shared with the user
 *
 * **Response Size**:
 * - Returns full invoice entities (not summaries)
 * - For large collections, consider pagination (future enhancement)
 *
 * **Sorting**: Results are ordered by creation date (newest first).
 *
 * @see {@link fetchInvoice} for fetching a single invoice by ID
 * @see {@link Invoice} for the returned data structure
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import type {Invoice} from "@/types/invoices";
import {API_URL, createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input type (currently empty, reserved for future filter options).
 */
type ServerActionInputType = Readonly<{}>;

/**
 * Returns a result with array of Invoice entities or error details.
 */
type ServerActionOutputType = Promise<ServerActionResult<ReadonlyArray<Invoice>>>;

/**
 * Fetches all invoices accessible to the authenticated user.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches JWT from Clerk auth service.
 *
 * **Data Returned**:
 * - Array of full invoice aggregates
 * - Includes both owned and shared invoices
 * - Excludes soft-deleted invoices
 *
 * **Performance**:
 * - Returns complete entities; use with caution for large datasets
 * - Consider client-side caching via Zustand store
 * - Includes 30-second timeout for network resilience
 *
 * **Side Effects**: Emits OpenTelemetry spans for tracing.
 *
 * @param _void - Reserved parameter for future filter/pagination options
 * @returns Promise resolving to ServerActionResult with Invoice array or error
 *
 * @example
 * ```typescript
 * import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
 *
 * const invoices = await fetchInvoices();
 *
 * // Display invoice count
 * console.log(`Found ${invoices.length} invoices`);
 *
 * // Filter important invoices
 * const important = invoices.filter(inv =>
 *   inv.additionalMetadata?.isImportant === "true"
 * );
 * ```
 *
 * @see {@link fetchInvoice} for fetching a specific invoice
 * @see {@link useInvoicesStore} for client-side state management
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

      // Step 2. Make the API request to fetch invoices (with timeout)
      addSpanEvent("bff.request.fetch-invoices.start");
      logWithTrace("info", "Making API request to fetch invoices", {}, "server");
      const response = await fetchWithTimeout(`${API_URL}/rest/v1/invoices/`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.fetch-invoices.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully fetched invoices", {}, "server");
        const data = (await response.json()) as ReadonlyArray<Invoice>;
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
          message: `Failed to fetch invoices: ${response.status} ${response.statusText}`,
          status: response.status,
        },
      };
    } catch (error) {
      addSpanEvent("bff.request.fetch-invoices.error");
      logWithTrace("error", "Error fetching the invoices from the server", {error}, "server");
      console.error("Error fetching the invoices from the server:", error);
      return createErrorResult<ReadonlyArray<Invoice>>(error, "Failed to fetch invoices");
    }
  });
}
