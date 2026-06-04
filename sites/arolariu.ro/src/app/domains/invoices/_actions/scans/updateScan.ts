"use server";

/**
 * @fileoverview Server action for updating/replacing scan blob content in Azure Storage.
 * @module app/domains/invoices/_actions/scans/updateScan
 *
 * @remarks
 * Handles in-place replacement of scan blob content while preserving identity and
 * metadata. Primary use case is image transformations (rotation, cropping, filters)
 * where the scan ID remains constant but the binary content changes.
 *
 * **Architecture Pattern**: Direct Azure SDK integration (NOT REST API).
 * Like `createScan` and `deleteScan`, this action uses the Azure Storage SDK directly
 * for optimal performance and streaming upload support.
 *
 * **Authentication Strategy**:
 * - User authentication: Via `fetchBFFUserFromAuthService` (JWT-based)
 * - Azure authentication: Centralized credential singleton (Managed Identity in prod)
 * - No JWT required for Azure API calls (direct SDK integration)
 *
 * **Update Semantics**:
 * - **In-place replacement**: Overwrites existing blob content
 * - **Metadata merging**: Preserves existing metadata, merges new metadata
 * - **URL stability**: Blob URL remains unchanged (same blob name)
 * - **Version tracking**: Adds `lastModified` timestamp to metadata
 *
 * **Typical Workflow (Image Rotation)**:
 * 1. User views scan in `/view-scans` route
 * 2. Clicks rotate button (90°, 180°, 270°)
 * 3. Client rotates image using Canvas API and converts to base64
 * 4. This action replaces blob content with rotated version
 * 5. Client updates Zustand store with updated blob URL (same URL, refreshed content)
 * 6. Cache revalidation ensures next page load shows rotated image
 *
 * **Security Note**: This action does NOT validate user ownership of the blob.
 * Unlike `deleteScan` which checks path prefix, this action trusts the caller
 * has permission. Ensure client-side access control prevents unauthorized updates.
 *
 * **Cache Strategy**: Revalidates `/domains/invoices/view-scans` to refresh scan list.
 *
 * @example
 * ```typescript
 * // Rotate image 90 degrees clockwise
 * const canvas = document.createElement("canvas");
 * const ctx = canvas.getContext("2d");
 * // ... rotation logic ...
 * const rotatedBase64 = canvas.toDataURL("image/jpeg").split(",")[1];
 *
 * const result = await updateScan({
 *   base64Data: rotatedBase64,
 *   blobName: extractBlobName(scan.blobUrl),
 *   mimeType: "image/jpeg",
 *   metadata: { rotated: "90", lastRotated: new Date().toISOString() }
 * });
 *
 * if (result.success && result.data.blobUrl) {
 *   // Force cache refresh with query parameter
 *   const refreshedUrl = `${result.data.blobUrl}?t=${Date.now()}`;
 *   scansStore.upsertScan({...scan, blobUrl: refreshedUrl});
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Apply filter/effect to scan
 * const filteredBase64 = await applyFilter(scan.blobUrl, "grayscale");
 * const blobName = extractBlobName(scan.blobUrl);
 *
 * const result = await updateScan({
 *   base64Data: filteredBase64,
 *   blobName: blobName,
 *   mimeType: scan.mimeType,
 *   metadata: {
 *     filter: "grayscale",
 *     filterAppliedAt: new Date().toISOString()
 *   }
 * });
 *
 * if (result.success) {
 *   console.log("Filter applied, URL unchanged:", result.data.blobUrl);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Update scan with error handling and retry
 * async function updateScanWithRetry(scan: Scan, base64Data: string, maxRetries = 3) {
 *   for (let attempt = 1; attempt <= maxRetries; attempt++) {
 *     const result = await updateScan({
 *       base64Data,
 *       blobName: extractBlobName(scan.blobUrl),
 *       mimeType: scan.mimeType,
 *       metadata: { attempt: attempt.toString() }
 *     });
 *
 *     if (result.success) {
 *       return result;
 *     }
 *
 *     if (attempt < maxRetries) {
 *       await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
 *     }
 *   }
 *
 *   throw new Error("Failed to update scan after retries");
 * }
 * ```
 *
 * @see {@link createScan} - Creates new scans (also uses Azure SDK directly)
 * @see {@link deleteScan} - Deletes scans with ownership validation
 * @see {@link fetchScans} - Retrieves user's scans
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createBlobClient, rewriteAzuriteUrl} from "@/lib/azure/storageClient";
import {readBlobMetadata, writeBlobMetadata} from "@/lib/utils.generic";
import {convertBase64ToBlob, createErrorResult, type ServerActionResult} from "@/lib/utils.server";
import {revalidatePath} from "next/cache";

/**
 * Input parameters for updating a scan.
 */
type ServerActionInputType = Readonly<{
  /** The base64-encoded data of the updated scan. Must be valid base64 string. */
  base64Data: string;
  /**
   * The blob name to update (e.g., "scans/{userId}/{scanId}_{timestamp}.jpg").
   * This is the path within the container, not the full URL.
   */
  blobName: string;
  /** MIME type of the updated content (e.g., "image/jpeg", "image/png"). */
  mimeType: string;
  /**
   * Additional metadata to merge with existing blob metadata.
   * Existing metadata is preserved; new keys overwrite existing ones.
   * Common keys: rotated, cropped, filtered, lastRotated, etc.
   */
  metadata?: Record<string, string>;
}>;

/**
 * Response from the scan update operation.
 */
type ServerActionOutputType = ServerActionResult<
  Readonly<{
    /** The updated blob URL (same as before, but content is refreshed) */
    blobUrl?: string;
  }>
>;

/**
 * Updates/replaces scan blob content in Azure Blob Storage.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**:
 * - User: Automatically fetched via `fetchBFFUserFromAuthService` (JWT-based)
 * - Azure: Centralized credential singleton (Managed Identity in prod)
 * - No JWT required for Azure API calls (direct SDK integration)
 *
 * **Authorization Note**:
 * This action does NOT validate user ownership of the blob. It assumes the caller
 * has verified permissions. Unlike `deleteScan`, there's no path-based authorization
 * check. Ensure client-side code restricts access to user's own scans.
 *
 * **Update Strategy**:
 * 1. Fetch existing blob properties to retrieve current metadata
 * 2. Merge existing metadata with new metadata (new keys overwrite)
 * 3. Add `lastModified` timestamp to merged metadata
 * 4. Upload new content with merged metadata (overwrites existing blob)
 * 5. Return updated blob URL (same URL, content refreshed)
 *
 * **Metadata Merging**:
 * - Existing metadata is preserved (e.g., userIdentifier, scanId, uploadedAt)
 * - New metadata overwrites matching keys
 * - System adds `lastModified` timestamp automatically
 * - Empty metadata object `{}` preserves all existing metadata
 *
 * **Blob URL Stability**:
 * The blob URL remains unchanged because the blob name doesn't change.
 * This means cached URLs in the client are still valid, but the content
 * behind the URL has been updated. Consider adding cache-busting query
 * parameters (`?t={timestamp}`) to force image reload in browsers.
 *
 * **Idempotency**:
 * Not idempotent. Each call replaces the blob content with new data.
 * Multiple calls with the same data will succeed but waste bandwidth.
 *
 * **Side Effects**:
 * - Replaces existing blob content in Azure Storage
 * - Updates blob metadata (merges with existing)
 * - Emits OpenTelemetry spans and events for tracing
 * - Logs operation details for audit trail
 * - Revalidates `/domains/invoices/view-scans` page cache
 *
 * **Error Handling**:
 * - Authentication failures: Thrown by `fetchBFFUserFromAuthService`
 * - Base64 decode errors: Thrown by `convertBase64ToBlob`
 * - Blob not found: Fails with Azure error (blob must exist)
 * - Azure upload errors: Caught and returned as ServerActionResult error
 * - All errors logged with telemetry events
 *
 * **Cache Behavior**:
 * Revalidates `/domains/invoices/view-scans` to ensure next page load shows
 * the updated scan. Consider revalidating invoice detail pages if scan is
 * attached to specific invoices.
 *
 * **Performance Considerations**:
 * - Direct Azure SDK (no REST API intermediary overhead)
 * - Fetches metadata before upload (one extra API call)
 * - Uses streaming upload via ArrayBuffer (efficient for large files)
 * - Base64 conversion happens server-side (not in browser)
 *
 * @param input - Update parameters with base64 data, blob name, MIME type, and optional metadata
 * @param input.base64Data - Base64-encoded replacement content, with or without a data URI prefix.
 * @param input.blobName - Blob path within the `invoices` container to overwrite.
 * @param input.mimeType - MIME type for the replacement content's Azure content type header.
 * @param input.metadata - Optional metadata merged with the existing blob metadata.
 * @returns A result object containing the stable blob URL on success, or an error result when authentication, decoding, or Azure upload fails.
 *
 * @example
 * ```typescript
 * // Rotate scan 90 degrees clockwise
 * const rotatedBase64 = await rotateImage(scan.blobUrl, 90);
 * const blobName = new URL(scan.blobUrl).pathname.split('/').slice(2).join('/');
 *
 * const result = await updateScan({
 *   base64Data: rotatedBase64,
 *   blobName: blobName,
 *   mimeType: "image/jpeg",
 *   metadata: {
 *     rotated: "90",
 *     lastRotation: new Date().toISOString()
 *   }
 * });
 *
 * if (result.success && result.data.blobUrl) {
 *   // Add cache-busting parameter to force browser reload
 *   const refreshedUrl = `${result.data.blobUrl}?v=${Date.now()}`;
 *   scansStore.upsertScan({...scan, blobUrl: refreshedUrl});
 *   toast.success("Image rotated successfully");
 * } else {
 *   toast.error(result.userMessage ?? "Failed to rotate image");
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Apply filter/effect to scan
 * const filteredBase64 = await applyFilter(scan.blobUrl, "grayscale");
 * const blobName = extractBlobName(scan.blobUrl);
 *
 * const result = await updateScan({
 *   base64Data: filteredBase64,
 *   blobName: blobName,
 *   mimeType: scan.mimeType,
 *   metadata: {
 *     filter: "grayscale",
 *     filterAppliedAt: new Date().toISOString()
 *   }
 * });
 *
 * if (result.success) {
 *   console.log("Filter applied, URL unchanged:", result.data.blobUrl);
 * }
 * ```
 *
 * @example
 * ```typescript
 * // Update scan with error handling and retry
 * async function updateScanWithRetry(scan: Scan, base64Data: string, maxRetries = 3) {
 *   for (let attempt = 1; attempt <= maxRetries; attempt++) {
 *     const result = await updateScan({
 *       base64Data,
 *       blobName: extractBlobName(scan.blobUrl),
 *       mimeType: scan.mimeType,
 *       metadata: { attempt: attempt.toString() }
 *     });
 *
 *     if (result.success) {
 *       return result;
 *     }
 *
 *     if (attempt < maxRetries) {
 *       await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
 *     }
 *   }
 *
 *   throw new Error("Failed to update scan after retries");
 * }
 * ```
 *
 * @see {@link fetchBFFUserFromAuthService} - User authentication
 * @see {@link createBlobClient} - Azure Storage client factory
 * @see {@link convertBase64ToBlob} - Base64 decoding utility
 * @see {@link createScan} - Creates new scans
 * @see {@link deleteScan} - Deletes scans with ownership validation
 */
export async function updateScan({base64Data, blobName, mimeType, metadata = {}}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{updateScan}}, with blobName:", blobName);

  return withSpan("api.actions.scans.updateScan", async () => {
    try {
      // Step 1. Fetch user from auth service
      addSpanEvent("bff.user.fetch.start");
      logWithTrace("info", "Fetching BFF user for authentication", {}, "server");
      const {userIdentifier} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.fetch.complete");

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
      const existingMetadata = readBlobMetadata(existingProperties.metadata ?? {});

      // Step 4. Upload the updated blob
      addSpanEvent("azure.blob.update.start");
      logWithTrace("info", "Updating scan in Azure Blob Storage", {blobName}, "server");

      const updatedFile = await convertBase64ToBlob(base64Data);
      const arrayBuffer = await updatedFile.arrayBuffer();

      const updatedMetadata = writeBlobMetadata({
        ...existingMetadata,
        lastModifiedAt: new Date(),
        lastModifiedBy: userIdentifier,
      });

      const blobUploadResponse = await blockBlobClient.uploadData(arrayBuffer, {
        blobHTTPHeaders: {
          blobContentType: mimeType,
        },
        metadata: updatedMetadata,
      });
      addSpanEvent("azure.blob.update.complete");

      if (blobUploadResponse._response.status === 201) {
        logWithTrace("info", "Successfully updated scan in Azure", {blobName}, "server");
        revalidatePath("/domains/invoices/view-scans", "page");
        return {
          success: true,
          data: {
            blobUrl: rewriteAzuriteUrl(blockBlobClient.url),
          },
        } as const;
      }

      addSpanEvent("azure.blob.update.error");
      const errorText = `Failed to update scan: ${blobUploadResponse._response.status}`;
      logWithTrace("warn", errorText, {blobName}, "server");
      return createErrorResult(new Error(errorText));
    } catch (error: unknown) {
      addSpanEvent("scan.update.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error updating scan", {error}, "server");
      console.error("Error updating scan:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
