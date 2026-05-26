"use server";

/**
 * @fileoverview Server action for adding (upserting) metadata entries on invoices.
 * @module app/domains/invoices/_actions/invoices/metadata/addInvoiceMetadata
 *
 * @remarks
 * This module provides server-side invoice metadata management functionality.
 * It handles authentication, validation, and API communication for patching
 * metadata key/value entries on an existing invoice.
 *
 * The backend `PATCH /rest/v1/invoices/{id}/metadata` endpoint accepts a
 * `PatchMetadataRequestDto` shaped as `{ entries: { [key: string]: object } }`
 * and merges those entries into the invoice's `AdditionalMetadata` dictionary
 * (upsert semantics: existing keys are overwritten, new keys are added).
 *
 * **Key Features:**
 * - Server-side execution with authentication
 * - GUID validation for invoice identifiers
 * - Accepts arbitrary key/value entries (string, number, boolean)
 * - OpenTelemetry instrumentation for observability
 * - Structured error handling with user-friendly messages
 *
 * @see {@link ServerActionResult} - Standard result wrapper type
 */

import { addSpanEvent, logWithTrace, withSpan } from "@/instrumentation.server";
import { fetchBFFUserFromAuthService } from "@/lib/actions/user/fetchUser";
import { validateStringIsGuidType } from "@/lib/utils.generic";
import { createErrorResult, fetchWithTimeout, type ServerActionResult } from "@/lib/utils.server";

/**
 * Input parameters for the addInvoiceMetadata server action.
 *
 * @remarks
 * Both fields are required. The invoiceId must be a valid UUIDv4 GUID,
 * and `entries` must contain at least one key/value pair.
 */
type ServerActionInputType = Readonly<{
  /** The unique identifier of the invoice. Must be a valid UUIDv4 GUID. */
  readonly invoiceId: string;
  /**
   * Metadata key/value pairs to upsert on the invoice.
   * Serialized as the `entries` property of `PatchMetadataRequestDto`.
   */
  readonly entries: Readonly<Record<string, string | number | boolean>>;
}>;

/**
 * Output result type for the addInvoiceMetadata server action.
 *
 * @remarks
 * Returns a ServerActionResult with void data on success.
 * On failure, includes error details and user-friendly message.
 */
type ServerActionOutputType = ServerActionResult<void>;

/**
 * Adds (upserts) metadata entries on an existing invoice via the backend API.
 *
 * @remarks
 * **Execution Context:** Server-side only (Next.js server action).
 *
 * **Authentication:** Automatically fetches JWT token from auth service
 * via `fetchBFFUserFromAuthService`. Requires valid authenticated session.
 *
 * **Validation:**
 * - Validates `invoiceId` is a valid GUID before making API requests.
 * - Requires `entries` to contain at least one key/value pair.
 *
 * **API Communication:** Makes a PATCH request to
 * `/rest/v1/invoices/{id}/metadata` with the body
 * `{ entries: { [key: string]: value } }`, matching the backend's
 * `PatchMetadataRequestDto` contract. Existing keys are overwritten,
 * new keys are added.
 *
 * **Observability:** Instrumented with OpenTelemetry spans and events:
 * - `api.actions.invoices.addInvoiceMetadata` - Parent span
 * - `bff.user.jwt.fetch.start/complete` - Auth events
 * - `bff.request.add-invoice-metadata.start/complete` - API request events
 *
 * **Error Handling:**
 * - GUID validation failures are caught and returned as error results
 * - Empty `entries` payload returns a validation error result
 * - HTTP 5xx errors return user message about server issues
 * - HTTP 4xx errors return generic retry message
 * - Network/unexpected errors are caught and wrapped
 *
 * **Side Effects:**
 * - Upserts metadata entries on the invoice in backend storage
 * - Emits telemetry spans and logs
 * - Does not update local cache (caller is responsible for refetch/sync)
 *
 * @param params - The input parameters object.
 * @param params.invoiceId - The UUID of the invoice to update. Must be a valid UUIDv4 string.
 * @param params.entries - Record of metadata key/value pairs to upsert. Must be non-empty.
 * @returns A result object with void data on success, or an error result when validation, authorization, or the backend request fails.
 *
 * @example
 * ```typescript
 * // Single entry
 * await addInvoiceMetadata({
 *   invoiceId: "123e4567-e89b-12d3-a456-426614174000",
 *   entries: { "user.note": "Tax-relevant receipt" },
 * });
 *
 * // Multiple entries in one round-trip
 * await addInvoiceMetadata({
 *   invoiceId: "123e4567-e89b-12d3-a456-426614174000",
 *   entries: {
 *     "user.note": "Tax-relevant receipt",
 *     "ai.confidence": 0.95,
 *     "custom.archived": true,
 *   },
 * });
 * ```
 *
 * @see {@link fetchBFFUserFromAuthService} - Authentication token retrieval
 * @see {@link validateStringIsGuidType} - GUID validation utility
 * @see {@link ServerActionResult} - Result type wrapper
 */
export async function addInvoiceMetadata({ invoiceId, entries }: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{addInvoiceMetadata}}, with:", { invoiceId, entries });

  return withSpan("api.actions.invoices.addInvoiceMetadata", async () => {
    try {
      // Step 0. Validate invoice identifier is a valid GUID
      logWithTrace("info", "Validating identifier is valid...", { invoiceId }, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const { userJwt: authToken } = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to upsert metadata entries
      addSpanEvent("bff.request.add-invoice-metadata.start");
      logWithTrace("info", "Making API request to add invoice metadata...", { invoiceId, entries }, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/metadata`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries }),
      });
      addSpanEvent("bff.request.add-invoice-metadata.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully added invoice metadata...", { invoiceId, entries }, "server");
        return { success: true, data: undefined } as const;
      }

      const errorText = await response.text();
      const internalMessage = `Failed to add invoice metadata: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, { invoiceId, entries, errorText }, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred while adding the invoice metadata. Please try again later."
          : "Failed to add the invoice metadata. Please try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.add-invoice-metadata.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error adding invoice metadata", { error, invoiceId, entries }, "server");
      console.error("Error adding invoice metadata:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
