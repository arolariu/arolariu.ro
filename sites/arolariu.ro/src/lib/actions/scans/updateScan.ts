"use server";

/**
 * @fileoverview Server action for updating/replacing a scan in Azure Blob Storage.
 * @module lib/actions/scans/updateScan
 *
 * @remarks
 * Used for operations like rotating images where the blob content changes
 * but we want to keep the same scan ID and metadata.
 *
 * **Workflow**:
 * 1. Client rotates image using Canvas
 * 2. This action replaces the blob with the rotated version
 * 3. Returns the updated scan with new blob URL
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {createBlobClient, rewriteAzuriteUrl} from "@/lib/azure/storageClient";
import {convertBase64ToBlob} from "@/lib/utils.server";
import {type Scan} from "@/types/scans";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input parameters for updating a scan.
 */
type UpdateScanInput = Readonly<{
  /** The base64-encoded data of the updated scan. */
  base64Data: string;
  /** The blob name to update (e.g., "scans/{userId}/{scanId}_{timestamp}.jpg"). */
  blobName: string;
  /** MIME type of the file (e.g., "image/jpeg"). */
  mimeType: string;
  /** Additional metadata to merge with existing metadata. */
  metadata?: Record<string, string>;
}>;

/**
 * Response from the scan update operation.
 */
type UpdateScanOutput = Promise<
  Readonly<{
    /** Whether the update was successful */
    success: boolean;
    /** The updated blob URL */
    blobUrl?: string;
    /** Error message if operation failed */
    error?: string;
  }>
>;

/**
 * Updates/replaces a scan in Azure Blob Storage.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches user from auth service.
 *
 * **Side Effects**:
 * - Replaces the existing blob with new content
 * - Preserves existing metadata and merges new metadata
 * - Emits OpenTelemetry spans for tracing
 *
 * @param input - Update parameters
 * @returns Object with success status and updated blob URL
 * @throws {Error} When authentication fails
 * @throws {Error} When blob update fails
 *
 * @example
 * ```typescript
 * const {success, blobUrl} = await updateScan({
 *   base64Data: rotatedImageBase64,
 *   blobName: scan.blobUrl.split('/').pop()!,
 *   mimeType: "image/jpeg",
 *   metadata: {rotated: "true"}
 * });
 *
 * if (success && blobUrl) {
 *   scansStore.upsertScan({...scan, blobUrl});
 * }
 * ```
 */
export async function updateScan({base64Data, blobName, mimeType, metadata = {}}: UpdateScanInput): UpdateScanOutput {
  console.info(">>> Executing server action::updateScan");

  return withSpan("api.actions.scans.updateScan", async () => {
    try {
      // Step 1. Fetch user from auth service
      addSpanEvent("bff.user.fetch.start");
      logWithTrace("info", "Fetching BFF user for authentication", {}, "server");
      const {userIdentifier} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.fetch.complete");

      if (!userIdentifier) {
        return {
          success: false,
          error: "User must be authenticated to update scans",
        };
      }

      // Step 2. Prepare for blob update
      const containerName = "invoices";
      const storageEndpoint = await fetchConfigurationValue("Endpoints:Storage:Blob");

      // Step 3. Get existing blob to preserve metadata
      addSpanEvent("azure.blob.fetch.metadata.start");
      const storageClient = await createBlobClient(storageEndpoint);
      const containerClient = storageClient.getContainerClient(containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Fetch existing metadata
      const existingProperties = await blockBlobClient.getProperties();
      const existingMetadata = existingProperties.metadata ?? {};

      // Step 4. Upload the updated blob
      addSpanEvent("azure.blob.update.start");
      logWithTrace("info", "Updating scan in Azure Blob Storage", {blobName}, "server");

      const updatedFile = await convertBase64ToBlob(base64Data);
      const arrayBuffer = await updatedFile.arrayBuffer();

      const mergedMetadata = {
        ...existingMetadata,
        ...metadata,
        lastModified: new Date().toISOString(),
      };

      const blobUploadResponse = await blockBlobClient.uploadData(arrayBuffer, {
        blobHTTPHeaders: {
          blobContentType: mimeType,
        },
        metadata: mergedMetadata,
        overwrite: true,
      });
      addSpanEvent("azure.blob.update.complete");

      if (blobUploadResponse._response.status === 201) {
        logWithTrace("info", "Successfully updated scan in Azure", {blobName}, "server");
        return {
          success: true,
          blobUrl: rewriteAzuriteUrl(blockBlobClient.url),
        };
      }

      addSpanEvent("azure.blob.update.error");
      logWithTrace(
        "error",
        "Error updating blob in Azure Storage",
        {status: blobUploadResponse._response.status},
        "server",
      );
      return {
        success: false,
        error: `Failed to update scan (status: ${blobUploadResponse._response.status})`,
      };
    } catch (error) {
      addSpanEvent("scan.update.error");
      logWithTrace("error", "Error updating scan", {error}, "server");
      console.error("Error updating scan:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error updating scan",
      };
    }
  });
}
