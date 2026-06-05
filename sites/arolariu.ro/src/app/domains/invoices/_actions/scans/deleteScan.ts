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
  console.info(">>> Executing server action {{deleteScan}}, with scanId:", scanId);

  return withSpan("api.actions.scans.deleteScan", async () => {
    try {
      // Step 1. Fetch user from auth service
      addSpanEvent("bff.user.fetch.start");
      logWithTrace("info", "Fetching BFF user for authentication", {}, "server");
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
        logWithTrace("warn", "Scan not found", {scanId}, "server");
        return createErrorResult(new Error(`Scan with ID "${scanId}" not found.`));
      }

      // Step 4. Validate ownership
      const scanMetadata = readBlobMetadata(blobObject.metadata);

      if (scanMetadata.ownerId !== userIdentifier) {
        addSpanEvent("authorization.failed");
        logWithTrace("warn", "User not authorized to delete scan", {scanId, ownerId: scanMetadata.ownerId}, "server");
        return createErrorResult(new Error("You are not authorized to delete this scan."));
      }

      // Step 5. Delete the blob
      addSpanEvent("azure.blob.delete.start");
      logWithTrace("info", "Deleting scan from Azure Blob Storage", {blobName: blobObject.name}, "server");
      const deleteResponse = await deleteBlobObject({
        storageEndpoint,
        containerName,
        blobName: blobObject.name,
      });
      addSpanEvent("azure.blob.delete.complete");

      if (deleteResponse.succeeded || !deleteResponse.errorCode) {
        logWithTrace("info", "Successfully deleted scan", {scanId}, "server");
        return {success: true, data: undefined} as const;
      }

      addSpanEvent("azure.blob.delete.error");
      const errorText = `Error code: ${deleteResponse.errorCode}`;
      const internalMessage = `Failed to delete scan: ${errorText}`;
      logWithTrace("warn", internalMessage, {scanId, errorText}, "server");
      return createErrorResult(new Error(internalMessage), "Failed to delete the scan. Please try again.");
    } catch (error: unknown) {
      addSpanEvent("scan.delete.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error deleting scan", {error}, "server");
      console.error("Error deleting scan:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
