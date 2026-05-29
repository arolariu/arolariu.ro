"use server";

/**
 * @fileoverview Server action for permanently deleting scans from Azure Blob Storage.
 * @module app/domains/invoices/_actions/scans/deleteScan
 *
 * @remarks
 * Handles permanent deletion of scan blobs from Azure Storage with path-based
 * authorization to ensure users can only delete their own scans.
 *
 * **Architecture Pattern**: Direct Azure SDK integration (NOT REST API).
 * Like `createScan`, this action uses the Azure Storage SDK directly for optimal
 * performance and to avoid unnecessary REST API intermediaries.
 *
 * **Authentication & Authorization**:
 * - User authentication: Via `fetchBFFUserFromAuthService` (JWT-based)
 * - Azure authentication: Centralized credential singleton (Managed Identity in prod)
 * - Authorization: Path-based ownership check (`scans/{userIdentifier}/` prefix required)
 * - No JWT required for Azure API calls (direct SDK integration)
 *
 * **Deletion Semantics**:
 * - **Permanent**: This is NOT a soft delete. Blob is physically removed from Azure Storage.
 * - **Idempotent**: Uses `deleteIfExists()` so deleting non-existent blobs succeeds.
 * - **No cascade**: Does not automatically remove invoice attachments (orphaned references possible).
 *
 * **Security Model**:
 * The action enforces user ownership by validating the blob path contains
 * `scans/{userIdentifier}/`. This prevents cross-user deletion attacks even if
 * an attacker obtains a valid blob URL.
 *
 * **Typical Workflow**:
 * 1. User views scans via `/view-scans` route
 * 2. Selects scan(s) to delete
 * 3. This action removes blob(s) from Azure Storage
 * 4. Client updates Zustand store to remove from UI
 * 5. If scan was attached to invoice, invoice still references orphaned URL
 *
 * **Important**: If deleting a scan that's attached to an invoice, the invoice
 * will retain a reference to the now-deleted blob URL. This may cause 404 errors
 * when viewing invoice scans. Consider soft-deleting or updating invoice references
 * before permanent deletion.
 *
 * @example
 * ```typescript
 * // Delete standalone scan
 * const result = await deleteScan({
 *   blobUrl: "https://storage.../scans/user_abc123/scan-001.jpg"
 * });
 *
 * if (result.success) {
 *   scansStore.removeScan(scanId);
 *   toast.success("Scan deleted successfully");
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Batch delete with error handling
 * const deletePromises = selectedScans.map(scan =>
 *   deleteScan({ blobUrl: scan.blobUrl })
 * );
 *
 * const results = await Promise.allSettled(deletePromises);
 *
 * const successCount = results.filter(r =>
 *   r.status === "fulfilled" && r.value.success
 * ).length;
 *
 * const failedCount = results.length - successCount;
 *
 * if (failedCount === 0) {
 *   toast.success(`Deleted ${successCount} scans`);
 * } else {
 *   toast.warning(`Deleted ${successCount}, failed ${failedCount}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Handle authorization error
 * const result = await deleteScan({
 *   blobUrl: "https://storage.../scans/other_user/scan.jpg"
 * });
 *
 * if (!result.success) {
 *   if (result.userMessage?.includes("not authorized")) {
 *     // This scan belongs to another user
 *     toast.error("You don't have permission to delete this scan");
 *   } else {
 *     // Other error (network, Azure failure, etc.)
 *     toast.error("Failed to delete scan. Please try again.");
 *   }
 * }
 * ```
 *
 * @see {@link createScan} - Creates scans in Azure Storage (also uses Azure SDK directly)
 * @see {@link fetchScans} - Retrieves user's scans
 * @see {@link deleteInvoiceScan} - Soft-deletes invoice scan references (uses REST API)
 */

import { addSpanEvent, logWithTrace, withSpan } from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import { fetchBFFUserFromAuthService } from "@/lib/actions/user/fetchUser";
import { createBlobClient } from "@/lib/azure/storageClient";
import { createErrorResult, type ServerActionResult } from "@/lib/utils.server";

/**
 * Input parameters for deleting a scan.
 */
type ServerActionInputType = Readonly<{
  /** The full Azure blob URL of the scan to delete. Must contain user identifier in path. */
  readonly blobUrl: string;
}>;

/**
 * Response from the delete scan operation.
 */
type ServerActionOutputType = ServerActionResult<void>;

/**
 * Permanently deletes a scan blob from Azure Blob Storage.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**:
 * - User: Automatically fetched via `fetchBFFUserFromAuthService` (JWT-based)
 * - Azure: Centralized credential singleton (Managed Identity in prod)
 * - No JWT required for Azure API calls (direct SDK integration)
 *
 * **Authorization (Path-Based)**:
 * The blob path MUST contain `scans/{userIdentifier}/` to pass authorization.
 * This ensures users can only delete their own scans, even if they somehow
 * obtain another user's blob URL.
 *
 * **Path Format Validation**:
 * - Required: `scans/{userIdentifier}/...`
 * - Example: `scans/user_abc123/scan-001_1716672000000.jpg`
 * - Rejected: `scans/other_user/scan-001.jpg` (different user)
 * - Rejected: `invoices/abc123/scan.jpg` (wrong prefix)
 *
 * **Idempotency**:
 * Uses `blockBlobClient.deleteIfExists()` which succeeds if:
 * - Blob exists and is deleted successfully
 * - Blob doesn't exist (already deleted or never created)
 *
 * This makes the operation safe to retry without error handling for 404s.
 *
 * **Deletion Semantics**:
 * - **Permanent**: Blob is physically removed from Azure Storage
 * - **No soft delete**: Azure Storage soft-delete (if enabled) may retain for recovery period
 * - **No cascade**: Invoice attachments NOT automatically removed (may create orphans)
 *
 * **Side Effects**:
 * - Removes blob from Azure Storage `invoices` container
 * - Emits OpenTelemetry spans and events for tracing
 * - Logs operation details for audit trail
 * - Does NOT update invoice references (manual cleanup required)
 *
 * **Error Handling**:
 * - Authentication failures: Thrown by `fetchBFFUserFromAuthService`
 * - Authorization failures: Returned as error result with user-friendly message
 * - URL parse errors: Caught and returned as error result
 * - Azure delete errors: Logged and returned with error code
 * - All errors logged with telemetry events
 *
 * **Cache Behavior**: No cache revalidation (deletion is permanent and doesn't affect other routes).
 *
 * **Performance Considerations**:
 * - Direct Azure SDK (no REST API intermediary overhead)
 * - `deleteIfExists` is single API call (no separate existence check)
 * - Lightweight operation (no data transfer, just metadata deletion)
 *
 * @param input - Delete parameters with blob URL
 * @returns ServerActionResult with success status (void data on success)
 *
 * @example
 * ```typescript
 * // Delete standalone scan after user confirmation
 * const result = await deleteScan({
 *   blobUrl: scan.blobUrl
 * });
 *
 * if (result.success) {
 *   // Remove from client-side store
 *   scansStore.removeScan(scan.id);
 *   toast.success("Scan deleted successfully");
 * } else {
 *   // Show error message
 *   toast.error(result.userMessage ?? "Failed to delete scan");
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Batch delete with error handling
 * const deletePromises = selectedScans.map(scan =>
 *   deleteScan({ blobUrl: scan.blobUrl })
 * );
 *
 * const results = await Promise.allSettled(deletePromises);
 *
 * const successCount = results.filter(r =>
 *   r.status === "fulfilled" && r.value.success
 * ).length;
 *
 * const failedCount = results.length - successCount;
 *
 * if (failedCount === 0) {
 *   toast.success(`Deleted ${successCount} scans`);
 * } else {
 *   toast.warning(`Deleted ${successCount}, failed ${failedCount}`);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Handle authorization error
 * const result = await deleteScan({
 *   blobUrl: "https://storage.../scans/other_user/scan.jpg"
 * });
 *
 * if (!result.success) {
 *   if (result.userMessage?.includes("not authorized")) {
 *     // This scan belongs to another user
 *     toast.error("You don't have permission to delete this scan");
 *   } else {
 *     // Other error (network, Azure failure, etc.)
 *     toast.error("Failed to delete scan. Please try again.");
 *   }
 * }
 * ```
 *
 * @see {@link fetchBFFUserFromAuthService} - User authentication
 * @see {@link createBlobClient} - Azure Storage client factory
 * @see {@link createScan} - Creates scans (also uses Azure SDK directly)
 * @see {@link fetchScans} - Retrieves user's scans
 */
export async function deleteScan({ blobUrl }: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{deleteScan}}, with blobUrl:", blobUrl);

  return withSpan("api.actions.scans.deleteScan", async () => {
    try {
      // Step 1. Fetch user from auth service
      addSpanEvent("bff.user.fetch.start");
      logWithTrace("info", "Fetching BFF user for authentication", {}, "server");
      const { userIdentifier } = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.fetch.complete");

      // Step 2. Extract blob name from URL
      addSpanEvent("blob.url.parse.start");
      const url = new URL(blobUrl);
      const pathParts = url.pathname.split("/");
      // Path format: /containerName/scans/userIdentifier/filename
      const [, containerName, ...blobParts] = pathParts;
      const blobName = blobParts.join("/");
      addSpanEvent("blob.url.parse.complete");

      if (!containerName || !blobName) {
        addSpanEvent("blob.url.parse.invalid");
        logWithTrace("warn", "Invalid scan blob URL", { blobUrl }, "server");
        return createErrorResult(new Error("Invalid scan URL."));
      }

      // Step 3. Verify user owns this scan (path contains their user ID)
      if (!blobName.includes(`scans/${userIdentifier}/`)) {
        addSpanEvent("authorization.failed");
        logWithTrace("warn", "Authorization failed: User does not own this scan", { userIdentifier, blobName }, "server");
        return createErrorResult(new Error("You are not authorized to delete this scan."));
      }

      // Step 4. Connect to Azure Storage
      addSpanEvent("azure.storage.connect.start");
      const storageEndpoint = await fetchConfigurationValue("Endpoints:Storage:Blob");

      const storageClient = await createBlobClient(storageEndpoint);
      const containerClient = storageClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      addSpanEvent("azure.storage.connect.complete");

      // Step 5. Delete the blob
      addSpanEvent("azure.blob.delete.start");
      logWithTrace("info", "Deleting scan from Azure Blob Storage", { blobName }, "server");
      const deleteResponse = await blockBlobClient.deleteIfExists();
      addSpanEvent("azure.blob.delete.complete");

      if (deleteResponse.succeeded || !deleteResponse.errorCode) {
        logWithTrace("info", "Successfully deleted scan", { blobName }, "server");
        return { success: true, data: undefined } as const;
      }

      addSpanEvent("azure.blob.delete.error");
      const errorText = `Error code: ${deleteResponse.errorCode}`;
      const internalMessage = `Failed to delete scan: ${errorText}`;
      logWithTrace("warn", internalMessage, { blobName, errorText }, "server");
      return createErrorResult(new Error(internalMessage), "Failed to delete the scan. Please try again.");
    } catch (error: unknown) {
      addSpanEvent("scan.delete.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error deleting scan", { error }, "server");
      console.error("Error deleting scan:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
