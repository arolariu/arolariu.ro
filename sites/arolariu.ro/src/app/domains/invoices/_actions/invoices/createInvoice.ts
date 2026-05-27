"use server";

/**
 * @fileoverview Server action for creating new invoice entities.
 * @module app/domains/invoices/_actions/invoices/createInvoice
 *
 * @remarks
 * This is the primary entry point for invoice creation in the system.
 * It orchestrates the initial invoice entity creation with an attached scan.
 *
 * **Typical Workflow**:
 * 1. Upload scan via {@link createInvoiceScan}
 * 2. Create invoice with scan URL via this action
 * 3. Optionally trigger analysis via {@link analyzeInvoice}
 *
 * **Required Fields**:
 * - `initialScan`: First scan attachment (uploaded to Azure Blob)
 * - `metadata`: Must include `isImportant` and `requiresAnalysis` flags
 *
 * @see {@link createInvoiceScan} for uploading scans first
 * @see {@link CreateInvoiceDtoPayload} for full payload structure
 */

import { addSpanEvent, logWithTrace, withSpan } from "@/instrumentation.server";
import { fetchBFFUserFromAuthService } from "@/lib/actions/user/fetchUser";
import { createErrorResult, fetchWithTimeout, ServerActionResult } from "@/lib/utils.server";
import type { CreateInvoiceDtoPayload, Invoice } from "@/types/invoices";

/**
 * Input type allowing partial payload (userIdentifier is auto-filled from auth).
 */
type ServerActionInputType = Readonly<Partial<CreateInvoiceDtoPayload>>;

/**
 * Returns the newly created Invoice entity with generated ID.
 */
type ServerActionOutputType = ServerActionResult<Readonly<Invoice>>;

/**
 * Creates a new invoice entity in the backend system.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches JWT and user ID from Clerk.
 * If `userIdentifier` is not provided in payload, it's automatically
 * populated from the authenticated user.
 *
 * **Side Effects**:
 * - Creates new invoice aggregate in database
 * - Emits OpenTelemetry spans for tracing
 * - Associates invoice with authenticated user
 *
 * **Validation**:
 * - Backend validates all required fields
 * - Scan URL must be a valid Azure Blob URL
 *
 * @param payload - Partial invoice creation payload; `userIdentifier` is filled from the authenticated session when omitted.
 * @param payload.userIdentifier - Optional user GUID. The authenticated user's identifier is used when this is not provided.
 * @param payload.initialScan - Initial scan reference with type, location, and metadata for the new invoice.
 * @param payload.metadata - Creation metadata, including flags such as `isImportant` and `requiresAnalysis`.
 * @returns A result object containing the created invoice with its generated identifier, or an error result.
 *
 * @example
 * ```typescript
 * import {createInvoice} from "@/app/domains/invoices/_actions/invoices/createInvoice";
 * import {InvoiceScanType} from "@/types/invoices";
 *
 * const result = await createInvoice({
 *   initialScan: {
 *     scanType: InvoiceScanType.Photo,
 *     location: "https://storage.blob.core.windows.net/invoices/scan.jpg",
 *     metadata: {}
 *   },
 *   metadata: {
 *     isImportant: "false",
 *     requiresAnalysis: "true"
 *   }
 * });
 *
 * if (result.success) {
 *   console.log("Created invoice:", result.data.id);
 * } else {
 *   console.error("Failed to create invoice:", result.error);
 * }
 * ```
 *
 * @see {@link Invoice} for the returned entity structure
 */
export async function createInvoice(payload: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{createInvoice}}, with:", { payload });

  return withSpan("api.actions.invoices.createInvoice", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication...", {}, "server");
      const { userIdentifier, userJwt: authToken } = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to create the invoice
      addSpanEvent("bff.invoice.create.start");
      logWithTrace("info", "Making API request to create invoice...", {}, "server");
      const response = await fetchWithTimeout("/rest/v1/invoices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: payload.userIdentifier ? JSON.stringify(payload) : JSON.stringify({ ...payload, userIdentifier }),
      });
      addSpanEvent("bff.invoice.create.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully created invoice entity...", {}, "server");
        const data = (await response.json()) as Invoice;
        return { success: true, data } as const;
      }

      addSpanEvent("bff.invoice.create.error");
      const errorText = await response.text();
      const internalMessage = `Failed to create invoice: ${response.status} ${response.statusText}`;
      logWithTrace("warn", internalMessage, { errorText }, "server");
      const userMessage =
        response.status >= 500
          ? "A server error occurred. Please try again later."
          : "Failed to create the invoice. Please check your input and try again.";
      return createErrorResult(new Error(internalMessage), userMessage);
    } catch (error: unknown) {
      addSpanEvent("bff.invoice.create.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error creating the invoice entity...", { error }, "server");
      console.error("Error creating the invoice entity:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
