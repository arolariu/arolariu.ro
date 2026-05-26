"use server";

/**
 * @fileoverview Server action for fetching merchant details by unique identifier.
 * @module app/domains/invoices/_actions/merchants/fetchMerchant
 *
 * @remarks
 * Retrieves detailed merchant information from the backend API, including business
 * details, location data, and aggregate statistics from associated invoices.
 *
 * **Key Features:**
 * - Server-side execution with authentication
 * - GUID validation for merchant identifiers
 * - OpenTelemetry instrumentation for observability
 * - Structured error handling with user-friendly messages
 * - Read-only operation (no cache revalidation)
 *
 * **Merchant Data Includes:**
 * - Business name and category (e.g., "Supermarket", "Restaurant")
 * - Location information (address, coordinates)
 * - Contact details (phone, email, website)
 * - Aggregate statistics (invoice count, total spent by user)
 * - AI-enriched fields (if available from invoice analysis)
 *
 * **Merchant Identification:**
 * - Merchants are identified during automated invoice analysis
 * - Same merchant may appear across multiple users' invoices
 * - Merchant data enriched over time as more invoices are processed
 * - Merchant ID is stable across invoice updates
 *
 * **Access Control:**
 * - Users can only fetch merchants linked to their own invoices
 * - Backend enforces data isolation between users
 * - Returns 404 if merchant doesn't exist or user has no access
 *
 * @see {@link fetchMerchants} - Fetch all merchants for current user
 * @see {@link Merchant} - Complete merchant type definition
 * @see {@link ServerActionResult} - Standard result wrapper type
 */

import { addSpanEvent, logWithTrace, withSpan } from "@/instrumentation.server";
import { fetchBFFUserFromAuthService } from "@/lib/actions/user/fetchUser";
import { validateStringIsGuidType } from "@/lib/utils.generic";
import { createErrorResult, fetchWithTimeout, type ServerActionResult } from "@/lib/utils.server";
import type { Merchant } from "@/types/invoices";

/**
 * Input parameters for the fetchMerchant server action.
 *
 * @remarks
 * The merchantId must be a valid UUIDv4 GUID.
 */
type ServerActionInputType = Readonly<{
  /** The unique identifier of the merchant. Must be a valid UUIDv4 GUID. */
  readonly merchantId: string;
}>;

/**
 * Output result type for the fetchMerchant server action.
 *
 * @remarks
 * Returns a ServerActionResult with the complete Merchant entity on success.
 * On failure, includes error details and user-friendly message.
 */
type ServerActionOutputType = ServerActionResult<Readonly<Merchant>>;

/**
 * Retrieves detailed merchant information via the backend API.
 *
 * @remarks
 * **Execution Context:** Server-side only (Next.js server action).
 *
 * **Authentication:** Automatically fetches JWT token from auth service
 * via `fetchBFFUserFromAuthService`. Requires valid authenticated session.
 *
 * **Validation:** Validates merchant identifier is a valid GUID before
 * making API requests to prevent malformed requests.
 *
 * **API Communication:** Makes GET request to `/rest/v1/merchants/{id}`
 * endpoint with JWT authentication header.
 *
 * **Data Returned:**
 * The complete Merchant entity includes:
 * - **Identity**: `id`, `name` (business name)
 * - **Classification**: `category` (business type/industry)
 * - **Location**: `address`, `coordinates`, `city`, `country`
 * - **Contact**: `phone`, `email`, `website`
 * - **Statistics**: `invoiceCount`, `totalSpent` (for current user)
 * - **Enrichment**: AI-detected fields from invoice analysis
 * - **Metadata**: `createdAt`, `updatedAt` timestamps
 *
 * **Access Control:**
 * - Backend enforces data isolation: users can only access merchants from their invoices
 * - Returns HTTP 404 if merchant doesn't exist or user has no associated invoices
 * - No special permissions required (ownership implied by invoice association)
 *
 * **Cache Behavior:**
 * This action does NOT trigger Next.js cache revalidation (no `revalidatePath` calls).
 * Read-only operations don't modify data, so cache invalidation is unnecessary.
 *
 * **Observability:** Instrumented with OpenTelemetry spans and events:
 * - `api.actions.invoices.fetchMerchant` - Parent span
 * - `bff.user.jwt.fetch.start/complete` - Auth events
 * - `bff.request.fetch-merchant.start/complete` - API request events
 * - `bff.request.fetch-merchant.error` - Error event
 *
 * **Error Handling:**
 * - GUID validation failures are caught and returned as error results
 * - HTTP 404 returns "Merchant not found" (merchant doesn't exist or no access)
 * - Other HTTP errors return generic "Failed to fetch merchant. Please try again."
 * - Network/unexpected errors are caught and wrapped in ServerActionResult
 *
 * **Side Effects:**
 * - Makes authenticated API call to backend
 * - Emits telemetry spans and logs
 * - Does NOT update local cache (read-only operation)
 *
 * @param params - The input parameters object.
 * @param params.merchantId - The UUID of the merchant to retrieve. Must be a valid UUIDv4 string.
 * @returns A result object containing the complete merchant entity on success, or an error result when validation, authorization, or the backend request fails.
 *
 * @example
 * ```typescript
 * import { fetchMerchant } from "@/app/domains/invoices/_actions/merchants/fetchMerchant";
 *
 * // Fetch a merchant by ID (typically from invoice.merchantId)
 * const result = await fetchMerchant({
 *   merchantId: "123e4567-e89b-12d3-a456-426614174000"
 * });
 *
 * if (result.success) {
 *   const merchant = result.data;
 *   console.log("Merchant:", merchant.name);
 *   console.log("Category:", merchant.category);
 *   console.log("Location:", merchant.address);
 *   console.log("Total invoices:", merchant.invoiceCount);
 * } else {
 *   console.error("Failed to fetch merchant:", result.error);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Using merchant data from an invoice
 * import { fetchInvoice } from "@/app/domains/invoices/_actions/invoices/fetchInvoice";
 * import { fetchMerchant } from "@/app/domains/invoices/_actions/merchants/fetchMerchant";
 *
 * const invoiceResult = await fetchInvoice({ invoiceId: "..." });
 * if (invoiceResult.success) {
 *   const merchantResult = await fetchMerchant({
 *     merchantId: invoiceResult.data.merchantId
 *   });
 *
 *   if (merchantResult.success) {
 *     console.log("Invoice from:", merchantResult.data.name);
 *   }
 * }
 * ```
 *
 * @see {@link fetchMerchants} - Fetch all merchants for current user
 * @see {@link fetchInvoice} - Fetch invoice containing merchant reference
 * @see {@link fetchBFFUserFromAuthService} - Authentication token retrieval
 * @see {@link validateStringIsGuidType} - GUID validation utility
 * @see {@link Merchant} - Complete merchant type definition
 * @see {@link ServerActionResult} - Result type wrapper
 */
export async function fetchMerchant({ merchantId }: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{fetchMerchant}}, with:", { merchantId });

  return withSpan("api.actions.invoices.fetchMerchant", async () => {
    try {
      // Step 0. Validate merchant identifier is valid GUID
      logWithTrace("info", "Validating merchant identifier is valid...", { merchantId }, "server");
      validateStringIsGuidType(merchantId, "merchantId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const { userJwt: authToken } = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to fetch the merchant (with timeout)
      addSpanEvent("bff.request.fetch-merchant.start");
      logWithTrace("info", "Making API request to fetch merchant...", { merchantId }, "server");
      const response = await fetchWithTimeout(`/rest/v1/merchants/${merchantId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.fetch-merchant.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully fetched merchant", { merchantId }, "server");
        const data = (await response.json()) as Readonly<Merchant>;
        return { success: true, data } as const;
      }

      addSpanEvent("bff.request.fetch-merchant.error");
      const errorText = await response.text();
      const internalMessage = `Failed to fetch merchant. Status: ${response.status}, Response: ${errorText}`;
      logWithTrace("error", "API error fetching merchant", { merchantId, status: response.status, errorText }, "server");
      const userMessage =
        response.status === 404
          ? "Merchant not found"
          : "Failed to fetch merchant. Please try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.fetch-merchant.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error fetching the merchant from the server", { error, merchantId }, "server");
      console.error("Error fetching the merchant from the server:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
