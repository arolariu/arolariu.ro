"use server";

/**
 * @fileoverview Server action for fetching user's scans from Azure Blob Storage.
 * @module lib/actions/scans/fetchScans
 *
 * @remarks
 * Lists all standalone scans belonging to a user by querying Azure Blob Storage
 * with a prefix filter on the user identifier path.
 *
 * **Query Strategy**:
 * Scans are stored with path `scans/{userIdentifier}/...`, so we list all blobs
 * with that prefix to retrieve the user's scans.
 *
 * @see {@link uploadScan} for uploading new scans
 * @see {@link deleteScan} for removing scans
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {createBlobClient, rewriteAzuriteUrl} from "@/lib/azure/storageClient";
import {type Scan, ScanStatus, ScanType} from "@/types/scans";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input parameters for fetching scans.
 */
type FetchScansInput = Readonly<{
  /** Optional: filter by status (default: all non-archived) */
  includeArchived?: boolean;
}>;

/**
 * Response from the fetch scans operation.
 */
type FetchScansOutput = Promise<ReadonlyArray<Scan>>;

/**
 * Maps MIME type to ScanType enum.
 */
function mimeTypeToScanType(mimeType: string): ScanType {
  switch (mimeType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return ScanType.JPEG;
    case "image/png":
      return ScanType.PNG;
    case "application/pdf":
      return ScanType.PDF;
    default:
      return ScanType.OTHER;
  }
}

/**
 * Fetches all scans belonging to a user from Azure Blob Storage.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches user from auth service.
 *
 * **Performance**:
 * - Lists blobs with prefix filter for efficiency
 * - Includes metadata in listing to avoid separate fetch per blob
 * - Returns newest scans first (sorted by uploadedAt DESC)
 *
 * **Filtering**:
 * - By default, excludes archived scans
 * - Set `includeArchived: true` to include all scans
 *
 * **Side Effects**: Emits OpenTelemetry spans for tracing.
 *
 * @param input - Fetch parameters
 * @returns Array of Scan entities sorted by upload date (newest first)
 * @throws {Error} When authentication fails
 * @throws {Error} When Azure storage access fails
 *
 * @example
 * ```typescript
 * const scans = await fetchScans({
 *   includeArchived: false
 * });
 *
 * // Update store with fetched scans
 * scansStore.setScans(scans.map(s => ({...s, cachedAt: new Date()})));
 * ```
 */
export async function fetchScans({includeArchived = false}: FetchScansInput = {}): FetchScansOutput {
  console.info(">>> Executing server action::fetchScans");

  return withSpan("api.actions.scans.fetchScans", async () => {
    try {
      // Step 1. Fetch user from auth service
      addSpanEvent("bff.user.fetch.start");
      logWithTrace("info", "Fetching BFF user for authentication", {}, "server");
      const {userIdentifier} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.fetch.complete");

      if (!userIdentifier) {
        throw new Error("User must be authenticated to fetch scans");
      }

      // Step 2. Connect to Azure Storage
      addSpanEvent("azure.storage.connect.start");
      const containerName = "invoices";
      const storageEndpoint = await fetchConfigurationValue("Endpoints:Storage:Blob");

      const storageClient = await createBlobClient(storageEndpoint);
      const containerClient = storageClient.getContainerClient(containerName);
      addSpanEvent("azure.storage.connect.complete");

      // Step 3. List blobs with user prefix
      addSpanEvent("azure.blob.list.start");
      logWithTrace("info", "Listing scans from Azure Blob Storage", {userIdentifier}, "server");
      const prefix = `scans/${userIdentifier}/`;
      const scans: Scan[] = [];

      for await (const blob of containerClient.listBlobsFlat({
        prefix,
        includeMetadata: true,
      })) {
        const metadata = blob.metadata ?? {};

        // Support both camelCase and lowercase keys for backward compatibility
        // Older scans might have lowercase keys from buggy registerScan
        const scanId = metadata["scanId"] ?? metadata["scanid"];

        // Skip scans that have been used by invoices
        if (metadata["usedByInvoice"] === "true") {
          continue;
        }

        // Only process blobs with valid scan ID in metadata
        if (scanId) {
          // Parse status from metadata (case-insensitive)
          const statusString = metadata["status"] ?? ScanStatus.READY;
          const status = Object.values(ScanStatus).includes(statusString as ScanStatus) ? (statusString as ScanStatus) : ScanStatus.READY;

          // Only include non-archived scans (or all scans if includeArchived is true)
          if (includeArchived || status !== ScanStatus.ARCHIVED) {
            // Construct blob URL
            const blobUrl = rewriteAzuriteUrl(containerClient.getBlockBlobClient(blob.name).url);

            // Parse upload timestamp (support both camelCase and lowercase)
            const uploadedAtString = metadata["uploadedAt"] ?? metadata["uploadedat"];
            const uploadedAt = uploadedAtString ? new Date(uploadedAtString) : (blob.properties.createdOn ?? new Date());

            // Determine MIME type
            const mimeType = blob.properties.contentType ?? "application/octet-stream";

            // Get original filename (support both camelCase and lowercase)
            const originalFileName = metadata["originalFileName"] ?? metadata["originalfilename"];

            const scan: Scan = {
              id: scanId,
              userIdentifier: metadata["userIdentifier"] ?? metadata["useridentifier"] ?? userIdentifier,
              name: originalFileName ?? blob.name.split("/").pop() ?? "Unknown",
              blobUrl,
              mimeType,
              sizeInBytes: blob.properties.contentLength ?? 0,
              scanType: mimeTypeToScanType(mimeType),
              uploadedAt,
              status,
              metadata: {
                originalFileName: originalFileName ?? "",
                ...metadata,
              },
            };

            scans.push(scan);
          }
        }
      }
      addSpanEvent("azure.blob.list.complete");

      // Step 4. Sort by upload date (newest first)
      scans.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      logWithTrace("info", `Successfully fetched ${scans.length} scans`, {count: scans.length}, "server");
      return scans;
    } catch (error) {
      addSpanEvent("scans.fetch.error");
      logWithTrace("error", "Error fetching scans from Azure", {error}, "server");
      console.error("Error fetching scans:", error);
      throw error;
    }
  });
}
