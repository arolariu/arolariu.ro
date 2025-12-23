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
import {API_URL} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input type (currently empty, reserved for future filter options).
 */
type ServerActionInputType = Readonly<{}>;

/**
 * Returns an array of Invoice entities.
 */
type ServerActionOutputType = Promise<ReadonlyArray<Invoice>>;

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
 *
 * **Side Effects**: Emits OpenTelemetry spans for tracing.
 *
 * @param _void - Reserved parameter for future filter/pagination options
 * @returns Promise resolving to array of Invoice entities
 * @throws {Error} When authentication fails
 * @throws {Error} When API returns non-OK status
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
