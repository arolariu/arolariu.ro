"use server";

/**
 * @fileoverview Server action for removing metadata keys from existing invoices.
 * @module app/domains/invoices/_actions/invoices/metadata/deleteInvoiceMetadata
 *
 * @remarks
 * Removes metadata keys from invoices by forwarding deletion requests to the
 * backend invoices endpoint. The backend accepts a collection of keys, but this
 * server action intentionally exposes a single-key API for fine-grained UI control.
 *
 * **Key Features:**
 * - Server-side execution with authentication
 * - GUID validation for invoice identifiers
 * - OpenTelemetry instrumentation for observability
 * - Structured error handling with user-friendly messages
 *
 * **Constraints:**
 * - Only the invoice owner can delete metadata keys (enforced by backend)
 * - Metadata keys must be non-empty strings
 * - Invoice identifier must be a valid UUIDv4 GUID
 *
 * @see {@link addInvoiceMetadata} - Sibling action for adding metadata keys
 * @see {@link ServerActionResult} - Standard result wrapper type
 */

import { addSpanEvent, logWithTrace, withSpan } from "@/instrumentation.server";
import { fetchBFFUserFromAuthService } from "@/lib/actions/user/fetchUser";
import { validateStringIsGuidType } from "@/lib/utils.generic";
import { createErrorResult, fetchWithTimeout, type ServerActionResult } from "@/lib/utils.server";

/**
 * Input parameters for the deleteInvoiceMetadata server action.
 *
 * @remarks
 * Both fields are required and must be non-empty strings.
 * The invoiceId must be a valid UUIDv4 GUID.
 */
type ServerActionInputType = Readonly<{
  /** The unique identifier of the invoice. Must be a valid UUIDv4 GUID. */
  readonly invoiceId: string;
  /** The metadata key to remove from the invoice. Must be a non-empty string. */
  readonly key: string;
}>;

/**
 * Output result type for the deleteInvoiceMetadata server action.
 *
 * @remarks
 * Returns a ServerActionResult with void data on success.
 * On failure, includes error details and user-friendly message.
 */
type ServerActionOutputType = ServerActionResult<void>;

/**
 * Removes a metadata key from an existing invoice via the backend API.
 *
 * @remarks
 * **Execution Context:** Server-side only (Next.js server action).
 *
 * **Authentication:** Automatically fetches JWT token from auth service
 * via `fetchBFFUserFromAuthService`. Requires valid authenticated session.
 *
 * **Validation:** Validates invoice identifier is a valid GUID before
 * making API requests to prevent malformed requests.
 *
 * **API Communication:** Makes DELETE request to `/rest/v1/invoices/{id}/metadata`
 * endpoint with the metadata key in request body as `{keys: [key]}`.
 *
 * **Deletion Behavior:**
 * - Removes only the specified metadata key from the invoice aggregate
 * - Preserves all other metadata keys on the invoice
 * - Non-existent keys are silently ignored (idempotent operation)
 *
 * **Observability:** Instrumented with OpenTelemetry spans and events:
 * - `api.actions.invoices.deleteInvoiceMetadata` - Parent span
 * - `bff.user.jwt.fetch.start/complete` - Auth events
 * - `bff.request.delete-invoice-metadata.start/complete` - API request events
 * - `bff.request.delete-invoice-metadata.error` - Error event
 *
 * **Error Handling:**
 * - GUID validation failures are caught and returned as error results
 * - HTTP 5xx errors return user message about server issues
 * - HTTP 4xx errors return generic retry message
 * - Network/unexpected errors are caught and wrapped in ServerActionResult
 *
 * **Side Effects:**
 * - Removes metadata key from invoice in backend database
 * - Emits telemetry spans and logs
 * - Does not update local cache (requires refetch)
 *
 * @param params - The input parameters object.
 * @param params.invoiceId - The UUID of the invoice to update. Must be a valid UUIDv4 string.
 * @param params.key - The metadata key to remove. Must be a non-empty string.
 * @returns A result object with void data on success, or an error result when validation, authorization, or the backend request fails.
 *
 * @example
 * ```typescript
 * // In a Server Component or Client Component event handler
 * const result = await deleteInvoiceMetadata({
 *   invoiceId: "123e4567-e89b-12d3-a456-426614174000",
 *   key: "archived"
 * });
 *
 * if (result.success) {
 *   console.log("Metadata key removed successfully");
 * } else {
 *   console.error("Failed to remove metadata:", result.error);
 * }
 * ```
 *
 * @see {@link addInvoiceMetadata} - Sibling action for adding metadata keys
 * @see {@link fetchBFFUserFromAuthService} - Authentication token retrieval
 * @see {@link validateStringIsGuidType} - GUID validation utility
 * @see {@link ServerActionResult} - Result type wrapper
 */
export async function deleteInvoiceMetadata({ invoiceId, key }: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{deleteInvoiceMetadata}}, with:", { invoiceId, key });

  return withSpan("api.actions.invoices.deleteInvoiceMetadata", async () => {
    try {
      // Step 0. Validate invoice identifier is valid GUID
      logWithTrace("info", "Validating identifier is valid...", { invoiceId, key }, "server");
      validateStringIsGuidType(invoiceId, "invoiceId");

      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const { userJwt: authToken } = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to delete the metadata key
      addSpanEvent("bff.request.delete-invoice-metadata.start");
      logWithTrace("info", "Making API request to delete invoice metadata...", { invoiceId, key }, "server");
      const response = await fetchWithTimeout(`/rest/v1/invoices/${invoiceId}/metadata`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ keys: [key] }),
      });
      addSpanEvent("bff.request.delete-invoice-metadata.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully deleted invoice metadata...", { invoiceId, key }, "server");
        return { success: true, data: undefined } as const;
      }

      const errorText = await response.text();
      const internalMessage = `Failed to delete invoice metadata: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, { invoiceId, key, errorText }, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred while deleting the invoice metadata. Please try again later."
          : "Failed to delete the invoice metadata. Please try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.request.delete-invoice-metadata.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error deleting invoice metadata", { error, invoiceId, key }, "server");
      console.error("Error deleting invoice metadata:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
