"use server";

/**
 * @fileoverview Server action for fetching merchant details by ID.
 * @module lib/actions/invoices/fetchMerchant
 *
 * @remarks
 * Retrieves detailed merchant information including:
 * - Business name and category
 * - Location and contact information
 * - Associated invoice history
 *
 * **Merchant Identification**:
 * - Merchants are identified during invoice analysis
 * - Same merchant may appear across multiple users' invoices
 * - Merchant data is enriched over time with more invoices
 *
 * @see {@link fetchMerchants} for fetching all merchants
 * @see {@link Merchant} for the returned data structure
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {validateStringIsGuidType} from "@/lib/utils.generic";
import type {Merchant} from "@/types/invoices";
import {API_URL, createErrorResult, fetchWithTimeout, mapHttpStatusToErrorCode, type ServerActionResult} from "../../utils.server";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input parameters for fetching a single merchant.
 *
 * @property merchantId - UUIDv4 of the merchant to fetch
 */
type ServerActionInputType = Readonly<{
  /** The identifier of the merchant to fetch. */
  readonly merchantId: string;
}>;
/**
 * Returns a result with Merchant entity or error details.
 */
type ServerActionOutputType = Promise<ServerActionResult<Readonly<Merchant>>>;

/**
 * Fetches a single merchant by its unique identifier.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches JWT from Clerk auth service.
 *
 * **Data Returned**:
 * - Full merchant entity with location and category
 * - Aggregate statistics (invoice count, total spent)
 * - AI-enriched fields if available
 *
 * **Access Control**:
 * - Returns 404 if merchant doesn't exist
 * - Users can only fetch merchants linked to their invoices
 *
 * **Side Effects**: Emits OpenTelemetry spans for tracing.
 *
 * @param input - The fetch parameters
 * @param input.merchantId - UUIDv4 of the merchant to retrieve
 * @returns Promise resolving to the complete Merchant entity
 * @throws {Error} When merchantId is not a valid GUID
 * @throws {Error} When authentication fails
 * @throws {Error} When merchant not found (404)
 *
 * @example
 * ```typescript
 * import fetchMerchant from "@/lib/actions/invoices/fetchMerchant";
 *
 * const merchant = await fetchMerchant({
 *   merchantId: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
 * });
 *
 * console.log("Merchant name:", merchant.name);
 * console.log("Category:", merchant.category);
 * ```
 *
 * @see {@link Merchant} for the complete data structure
 * @see {@link fetchInvoice} for getting the merchant reference from an invoice
 */
export default async function fetchMerchant({merchantId}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action::fetchMerchant, with:", {merchantId});

  return withSpan("api.actions.invoices.fetchMerchant", async () => {
    try {
      // Step 0. Validate input is correct
      logWithTrace("info", "Validating input for fetchMerchant", {merchantId}, "server");
      try {
        validateStringIsGuidType(merchantId, "merchantId");
      } catch {
        return {
          success: false,
          error: {code: "VALIDATION_ERROR", message: `Invalid merchant ID: ${merchantId}`},
        };
      }

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to fetch the merchant (with timeout)
      addSpanEvent("bff.request.fetch-merchant.start");
      logWithTrace("info", "Making API request to fetch merchant", {merchantId}, "server");
      const response = await fetchWithTimeout(`${API_URL}/rest/v1/merchants/${merchantId}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      addSpanEvent("bff.request.fetch-merchant.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully fetched merchant", {merchantId}, "server");
        const data = (await response.json()) as Readonly<Merchant>;
        return {success: true, data};
      }

      // Handle HTTP errors with standardized error codes
      const errorText = await response.text();
      const errorCode = mapHttpStatusToErrorCode(response.status);
      logWithTrace("error", "API returned error status", {status: response.status, errorText, merchantId}, "server");

      return {
        success: false,
        error: {
          code: errorCode,
          message: `Failed to fetch merchant: ${response.status} ${response.statusText}`,
          status: response.status,
        },
      };
    } catch (error) {
      addSpanEvent("bff.request.fetch-merchant.error");
      logWithTrace("error", "Error fetching the merchant from the server", {error, merchantId}, "server");
      console.error("Error fetching the merchant from the server:", error);
      return createErrorResult<Readonly<Merchant>>(error, "Failed to fetch merchant");
    }
  });
}
