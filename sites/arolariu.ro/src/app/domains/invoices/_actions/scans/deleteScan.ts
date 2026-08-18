"use server";

/**
 * @fileoverview Server action for permanently deleting scans from Azure Blob Storage.
 * @module app/domains/invoices/_actions/scans/deleteScan
 *
 * @remarks
 * Handles permanent deletion of scan blobs using scanId-based lookup with ownership validation.
 *
 * **Architecture Pattern**: Uses generic storage helpers (resolveBlobObjectByMetadata, deleteBlobObject).
 *
 * **Deletion Semantics**:
 * - **Permanent**: This is NOT a soft delete. Blob is physically removed from Azure Storage.
 * - **Idempotent**: Uses `deleteIfExists()` so deleting non-existent blobs succeeds.
 * - **No cascade**: Does not automatically remove invoice attachments (orphaned references possible).
 *
 * **Security Model**:
 * The action enforces user ownership by resolving the scan via metadata lookup under
 * the user's prefix and validating ownerId matches the authenticated user.
 *
 * @see {@link createScan} - Creates scans
 * @see {@link fetchScans} - Retrieves user's scans
 * @see {@link updateScan} - Updates scans
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {deleteBlobObject, resolveBlobObjectByMetadata} from "@/lib/azure/storageClient";
import {createErrorResult, type ServerActionResult} from "@/lib/utils.server";
import {readBlobMetadata} from "../../_utils/metadataUtilities";

/**
 * Input parameters for deleting a scan.
 */
type ServerActionInputType = Readonly<{
  /** The scan ID to delete */
  readonly scanId: string;
}>;

/**
 * Response from the delete scan operation.
 */
type ServerActionOutputType = ServerActionResult<void>;

/**
 * Permanently deletes a scan blob from Azure Blob Storage by scanId.
 *
 * @param input - Delete parameters with scanId
 * @returns ServerActionResult with success status (void data on success)
 */
export async function deleteScan({scanId}: ServerActionInputType): ServerActionOutputType {
  return withSpan("api.actions.scans.deleteScan", async () => {
    try {
      // Step 1. Fetch user from auth service
      addSpanEvent("bff.user.fetch.start");
      logWithTrace("info", "scan.delete.requested", undefined, "server");
      const {userIdentifier} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.fetch.complete");

      // Step 2. Connect to Azure Storage
      addSpanEvent("azure.storage.connect.start");
      const containerName = "invoices";
      const storageEndpoint = await fetchConfigurationValue("Endpoints:Storage:Blob");
      addSpanEvent("azure.storage.connect.complete");

      // Step 3. Resolve scanId to blob by metadata
      addSpanEvent("azure.blob.resolve.start");
      const prefix = `scans/${userIdentifier}/`;
      const blobObject = await resolveBlobObjectByMetadata({
        storageEndpoint,
        containerName,
        prefix,
        predicate: (blob) => {
          try {
            const metadata = readBlobMetadata(blob.metadata);
            return metadata.scanId === scanId;
          } catch {
            return false;
          }
        },
      });
      addSpanEvent("azure.blob.resolve.complete");

      if (!blobObject) {
        addSpanEvent("scan.not.found");
        logWithTrace("warn", "scan.delete.not-found", undefined, "server");
        return {success: false, error: {code: "NOT_FOUND", message: "Scan not found."}};
      }

      // Step 4. Validate ownership
      const scanMetadata = readBlobMetadata(blobObject.metadata);

      if (scanMetadata.ownerId !== userIdentifier) {
        addSpanEvent("authorization.failed");
        logWithTrace("warn", "scan.delete.unauthorized", undefined, "server");
        return {success: false, error: {code: "AUTH_ERROR", message: "You are not authorized to delete this scan."}};
      }

      // Step 5. Delete the blob
      addSpanEvent("azure.blob.delete.start");
      logWithTrace("info", "scan.delete.start", undefined, "server");
      const deleteResponse = await deleteBlobObject({
        storageEndpoint,
        containerName,
        blobName: blobObject.name,
      });
      addSpanEvent("azure.blob.delete.complete");

      if (deleteResponse.succeeded || !deleteResponse.errorCode) {
        logWithTrace("info", "scan.delete.complete", undefined, "server");
        return {success: true, data: undefined} as const;
      }

      addSpanEvent("azure.blob.delete.error");
      logWithTrace("warn", "scan.delete.rejected", {errorCode: "SERVER_ERROR"}, "server");
      return {success: false, error: {code: "SERVER_ERROR", message: "Unable to delete the scan. Please try again."}};
    } catch (error) {
      addSpanEvent("scan.delete.error");
      logWithTrace("error", "scan.delete.failed", {errorCode: "NETWORK_ERROR"}, "server");
      return createErrorResult(error, "Unable to delete the scan. Please try again.");
    }
  }) satisfies ServerActionOutputType;
}
