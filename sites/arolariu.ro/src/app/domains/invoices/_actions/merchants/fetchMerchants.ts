"use server";

/**
 * @fileoverview Server action for fetching all merchants from user's invoices.
 * @module app/domains/invoices/_actions/merchants/fetchMerchants
 *
 * @remarks
 * Retrieves all merchant entities that have been identified and linked to the
 * authenticated user's invoices. Merchants are extracted during invoice analysis
 * and enriched over time with additional data.
 *
 * **Key Features:**
 * - Server-side execution with authentication
 * - Returns complete merchant collection
 * - OpenTelemetry instrumentation for observability
 * - Structured error handling with user-friendly messages
 * - Read-only operation (no cache revalidation)
 *
 * **Merchant Sources:**
 * - **AI-extracted**: Automatically identified during OCR invoice analysis
 * - **User-linked**: Manually associated by users during invoice creation/editing
 * - **Enriched**: Enhanced with public business data (location, category, contact info)
 *
 * **Data Characteristics:**
 * - Returns all merchants with at least one associated invoice
 * - Excludes merchants with no current invoice associations
 * - Includes AI-enriched fields (normalized name, category, location)
 * - Contains aggregate statistics per merchant (invoice count, total spent)
 *
 * **Common Use Cases:**
 * - Spending analysis by merchant
 * - Merchant category breakdown charts
 * - Merchant dropdown filters in invoice lists
 * - Spending trends by store/business
 *
 * @see {@link fetchMerchant} - Fetch single merchant by ID
 * @see {@link Merchant} - Complete merchant type definition
 * @see {@link ServerActionResult} - Standard result wrapper type
 */

import { addSpanEvent, logWithTrace, withSpan } from "@/instrumentation.server";
import { fetchBFFUserFromAuthService } from "@/lib/actions/user/fetchUser";
import { createErrorResult, fetchWithTimeout, type ServerActionResult } from "@/lib/utils.server";
import type { Merchant } from "@/types/invoices";

/**
 * Input parameters for the fetchMerchants server action.
 *
 * @remarks
 * Currently accepts no parameters. Reserved for future filtering/pagination options
 * (e.g., category filter, search query, pagination).
 */
type ServerActionInputType = Readonly<Record<string, never>>;

/**
 * Output result type for the fetchMerchants server action.
 *
 * @remarks
 * Returns a ServerActionResult with array of Merchant entities on success.
 * Empty array indicates user has no invoices or all invoices lack merchant links.
 * On failure, includes error details and user-friendly message.
 */
type ServerActionOutputType = ServerActionResult<ReadonlyArray<Merchant>>;

/**
 * Retrieves all merchants associated with the user's invoices.
 *
 * @remarks
 * **Execution Context:** Server-side only (Next.js server action).
 *
 * **Authentication:** Automatically fetches JWT token from auth service
 * via `fetchBFFUserFromAuthService`. Requires valid authenticated session.
 *
 * **API Communication:** Makes GET request to `/rest/v1/merchants`
 * endpoint with JWT authentication header.
 *
 * **Data Returned:**
 * Array of complete Merchant entities, each including:
 * - **Identity**: `id`, `name` (business name)
 * - **Classification**: `category` (business type/industry)
 * - **Location**: `address`, `coordinates`, `city`, `country`
 * - **Contact**: `phone`, `email`, `website`
 * - **Statistics**: `invoiceCount`, `totalSpent` (user-specific aggregates)
 * - **Enrichment**: AI-detected and normalized fields
 * - **Metadata**: `createdAt`, `updatedAt` timestamps
 *
 * **Empty Results:**
 * Returns empty array (`[]`) when:
 * - User has no invoices yet
 * - All invoices lack merchant associations
 * - All merchant links have been removed
 * This is NOT an error condition (returns success with empty data).
 *
 * **Access Control:**
 * - Backend enforces data isolation: users only see merchants from their invoices
 * - No special permissions required (ownership implied by invoice association)
 * - Merchants shared across users, but statistics are user-specific
 *
 * **Cache Behavior:**
 * This action does NOT trigger Next.js cache revalidation (no `revalidatePath` calls).
 * Read-only operations don't modify data, so cache invalidation is unnecessary.
 *
 * **Performance Considerations:**
 * - Returns complete merchant entities (not paginated)
 * - Consider client-side caching for merchant dropdowns/filters
 * - Typical response contains 10-100 merchants per user
 * - Use Zustand store or React Context for client-side persistence
 *
 * **Observability:** Instrumented with OpenTelemetry spans and events:
 * - `api.actions.invoices.fetchMerchants` - Parent span
 * - `bff.user.jwt.fetch.start/complete` - Auth events
 * - `bff.request.fetch-merchants.start/complete` - API request events
 * - `bff.request.fetch-merchants.error` - Error event
 *
 * **Error Handling:**
 * - HTTP 404 returns "No merchants found" (typically means no invoices)
 * - HTTP 5xx returns "A server error occurred. Please try again later."
 * - Other errors return "Failed to fetch merchants. Please refresh the page or contact support."
 * - Network/unexpected errors are caught and wrapped in ServerActionResult
 *
 * **Side Effects:**
 * - Makes authenticated API call to backend
 * - Emits telemetry spans and logs
 * - Does NOT update local cache (read-only operation)
 *
 * @param _params - Reserved parameter for future filter/pagination options (currently unused).
 * @returns Promise resolving to ServerActionResult with array of Merchant entities on success, or error details on failure.
 *
 * @example
 * ```typescript
 * import { fetchMerchants } from "@/app/domains/invoices/_actions/merchants/fetchMerchants";
 *
 * // Fetch all merchants
 * const result = await fetchMerchants();
 *
 * if (result.success) {
 *   const merchants = result.data;
 *   console.log(`Found ${merchants.length} merchants`);
 *
 *   // Display in dropdown
 *   merchants.forEach((m) => {
 *     console.log(`${m.name} - ${m.category}`);
 *   });
 * } else {
 *   console.error("Failed to fetch merchants:", result.error);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Group merchants by category for analytics
 * const result = await fetchMerchants();
 *
 * if (result.success) {
 *   const byCategory = result.data.reduce((acc, merchant) => {
 *     const cat = merchant.category ?? "Uncategorized";
 *     if (!acc[cat]) acc[cat] = [];
 *     acc[cat].push(merchant);
 *     return acc;
 *   }, {} as Record<string, Merchant[]>);
 *
 *   // Display category breakdown
 *   Object.entries(byCategory).forEach(([category, merchants]) => {
 *     console.log(`${category}: ${merchants.length} merchants`);
 *   });
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Calculate total spending by merchant
 * const result = await fetchMerchants();
 *
 * if (result.success) {
 *   const topMerchants = result.data
 *     .sort((a, b) => (b.totalSpent ?? 0) - (a.totalSpent ?? 0))
 *     .slice(0, 5);
 *
 *   console.log("Top 5 merchants by spending:");
 *   topMerchants.forEach((m, i) => {
 *     console.log(`${i + 1}. ${m.name}: $${m.totalSpent?.toFixed(2)}`);
 *   });
 * }
 * ```
 *
 * @see {@link fetchMerchant} - Fetch single merchant by ID
 * @see {@link fetchBFFUserFromAuthService} - Authentication token retrieval
 * @see {@link Merchant} - Complete merchant type definition
 * @see {@link ServerActionResult} - Result type wrapper
 */
export async function fetchMerchants(_params?: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{fetchMerchants}}");

  return withSpan("api.actions.invoices.fetchMerchants", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const { userJwt: authToken } = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to fetch merchants (with timeout)
      addSpanEvent("bff.request.fetch-merchants.start");
      logWithTrace("info", "Making API request to fetch merchants...", {}, "server");
      const response = await fetchWithTimeout("/rest/v1/merchants", {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.fetch-merchants.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully fetched merchants", {}, "server");
        const data = (await response.json()) as ReadonlyArray<Merchant>;
        return { success: true, data } as const;
      }

      addSpanEvent("bff.request.fetch-merchants.error");
      const errorText = await response.text();
      const internalMessage = `Failed to fetch merchants: ${response.status} ${response.statusText} - ${errorText}`;
      logWithTrace("error", "API error fetching merchants", { status: response.status, errorText }, "server");
      const userMessage =
        response.status === 404
          ? "No merchants found"
          : response.status >= 500
            ? "A server error occurred. Please try again later."
            : "Failed to fetch merchants. Please refresh the page or contact support.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.fetch-merchants.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error fetching the merchants from the server", { error }, "server");
      console.error("Error fetching the merchants from the server:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
