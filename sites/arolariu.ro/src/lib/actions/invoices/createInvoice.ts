"use server";

/**
 * @fileoverview Server action for creating new invoice entities.
 * @module lib/actions/invoices/createInvoice
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

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {API_URL} from "@/lib/utils.server";
import type {CreateInvoiceDtoPayload, Invoice} from "@/types/invoices";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input type allowing partial payload (userIdentifier is auto-filled from auth).
 */
type ServerActionInputType = Readonly<Partial<CreateInvoiceDtoPayload>>;

/**
 * Returns the newly created Invoice entity with generated ID.
 */
type ServerActionOutputType = Promise<Readonly<Invoice>>;

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
 * @param payload - Partial invoice creation payload
 * @param payload.userIdentifier - Optional user GUID (auto-filled from auth if omitted)
 * @param payload.initialScan - Required first scan with type, location, and metadata
 * @param payload.metadata - Required metadata including `isImportant`, `requiresAnalysis`
 * @returns Promise resolving to the created Invoice with generated ID
 * @throws {Error} When authentication fails
 * @throws {Error} When API returns non-OK status (e.g., 400 for validation)
 *
 * @example
 * ```typescript
 * import {createInvoice} from "@/lib/actions/invoices/createInvoice";
 * import {InvoiceScanType} from "@/types/invoices";
 *
 * const invoice = await createInvoice({
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
 * console.log("Created invoice:", invoice.id);
 * ```
 *
 * @see {@link Invoice} for the returned entity structure
 */
export async function createInvoice(payload: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{createInvoice}}, with:", {payload});

  return withSpan("api.actions.invoices.createInvoice", async () => {
    try {
      // Step 1. Fetch user JWT for authentication
      addSpanEvent("bff.user.jwt.fetch.start");
      logWithTrace("info", "Fetching BFF user JWT for authentication", {}, "server");
      const {userIdentifier, userJwt: authToken} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.jwt.fetch.complete");

      // Step 2. Make the API request to create the invoice
      addSpanEvent("bff.invoice.create.start");
      logWithTrace("info", "Making API request to create invoice", {}, "server");
      const response = await fetch(`${API_URL}/rest/v1/invoices`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
        body: payload.userIdentifier ? JSON.stringify(payload) : JSON.stringify({...payload, userIdentifier}),
      });
      addSpanEvent("bff.invoice.create.complete");

      if (response.ok) {
        logWithTrace("info", "Successfully created invoice entity", {}, "server");
        return response.json() as ServerActionOutputType;
      }

      const errorText = await response.text();
      throw new Error(`BFF create invoice request failed: ${response.status} ${response.statusText} - ${errorText}`);
    } catch (error) {
      addSpanEvent("bff.invoice.create.error");
      logWithTrace("error", "Error creating the invoice entity", {error}, "server");
      console.error("Error creating the invoice entity:", error);
      throw error;
    }
  });
}
