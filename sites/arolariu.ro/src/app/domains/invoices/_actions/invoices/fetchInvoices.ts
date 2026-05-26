"use server";

/**
 * @fileoverview Server action for fetching all invoices for the authenticated user.
 * @module app/domains/invoices/_actions/invoices/fetchInvoices
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

import { addSpanEvent, logWithTrace, withSpan } from "@/instrumentation.server";
import type { Invoice } from "@/types/invoices";
import { createErrorResult, fetchWithTimeout, type ServerActionResult } from "@/lib/utils.server";
import { fetchBFFUserFromAuthService } from "@/lib/actions/user/fetchUser";

/**
 * Input type (currently empty, reserved for future filter options).
 */
type ServerActionInputType = Readonly<{}>;

/**
 * Returns a result with array of Invoice entities or error details.
 */
type ServerActionOutputType = ServerActionResult<ReadonlyArray<Invoice>>;

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
 * @param _void - Reserved parameter for future filter/pagination options.
 * @returns A result object containing an invoice array on success, or an error result when the backend request fails.
 *
 * @example
 * ```typescript
 * import fetchInvoices from "@/lib/actions/invoices/fetchInvoices";
 *
 * const result = await fetchInvoices();
 *
 * if (result.success) {
 *   // Display invoice count
 *   console.log(`Found ${result.data.length} invoices`);
 *
 *   // Filter important invoices
 *   const important = result.data.filter(inv =>
 *     inv.additionalMetadata?.isImportant === "true"
 *   );
 * }
 * ```
 *
 * @see {@link fetchInvoice} for fetching a specific invoice
 * @see {@link useInvoicesStore} for client-side state management
 */
export async function fetchInvoices(_void?: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{fetchInvoices}}");

  return withSpan("api.actions.invoices.fetchInvoices", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const { userJwt: authToken } = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to fetch invoices (with timeout)
      addSpanEvent("bff.request.fetch-invoices.start");
      logWithTrace("info", "Making API request to fetch invoices", {}, "server");
      const response = await fetchWithTimeout("/rest/v1/invoices/", {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.fetch-invoices.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully fetched invoices", {}, "server");
        const data = (await response.json()) as ReadonlyArray<Invoice>;
        return { success: true, data };
      }

      addSpanEvent("bff.request.fetch-invoices.error");
      const errorText = await response.text();
      const internalMessage = `Failed to fetch invoices: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, { errorText }, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to fetch invoices. Please refresh the page or contact support.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.fetch-invoices.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error fetching the invoices from the server", { error, errorMessage }, "server");
      console.error("Error fetching the invoices from the server:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
