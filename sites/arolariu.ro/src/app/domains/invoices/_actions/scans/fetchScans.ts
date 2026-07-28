"use server";

/**
 * @fileoverview Server action for fetching user's scans from Azure Blob Storage.
 * @module app/domains/invoices/_actions/scans/fetchScans
 *
 * @remarks
 * Lists all standalone scans belonging to a user by querying Azure Blob Storage
 * with a prefix filter on the user identifier path.
 *
 * **Query Strategy**:
 * Scans are stored with path `scans/{userIdentifier}/...`, so we list all blobs
 * with that prefix to retrieve the user's scans.
 *
 * @see {@link createScan} for uploading new scans
 * @see {@link deleteScan} for removing scans
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {listBlobObjects} from "@/lib/azure/storageClient";
import {createErrorResult, type ServerActionResult} from "@/lib/utils.server";
import {type Scan, ScanStatus} from "@/types/scans";
import {mimeTypeToScanType} from "../../_utils/mimeTypeUtilities";
import {readBlobMetadata} from "../../_utils/metadataUtilities";

/**
 * Input parameters for fetching scans.
 */
type ServerActionInputType = Readonly<{
  /** Optional: filter by status (default: all non-archived) */
  readonly includeArchived?: boolean;
}>;

/**
 * Response from the fetch scans operation.
 */
type ServerActionOutputType = ServerActionResult<ReadonlyArray<Scan>>;

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
 * @param input - Fetch parameters. Omit this object to fetch non-archived scans.
 * @param input.includeArchived - Whether archived scans should be included in the returned collection.
 * @returns A result object containing scans sorted by upload date descending, or an error result when authentication or storage access fails.
 *
 * @example
 * ```typescript
 * const result = await fetchScans({
 *   includeArchived: false
 * });
 *
 * if (result.success) {
 *   // Update store with fetched scans
 *   scansStore.setScans(result.data.map(s => ({...s, cachedAt: new Date()})));
 * }
 * ```
 */
export async function fetchScans({includeArchived = false}: ServerActionInputType = {}): ServerActionOutputType {
  console.info(">>> Executing server action {{fetchScans}}, with includeArchived:", includeArchived);

  return withSpan("api.actions.scans.fetchScans", async () => {
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

      // Step 3. List blobs with user prefix
      addSpanEvent("azure.blob.list.start");
      logWithTrace("info", "Listing scans from Azure Blob Storage", {userIdentifier}, "server");
      const prefix = `scans/${userIdentifier}/`;
      const scans: Scan[] = [];

      const blobs = await listBlobObjects({
        storageEndpoint,
        containerName,
        prefix,
        includeMetadata: true,
      });

      for (const blob of blobs) {
        try {
          const scanMetadata = readBlobMetadata(blob.metadata ?? {});

          const shouldInclude = includeArchived
            ? scanMetadata.status !== ScanStatus.ATTACHED
            : scanMetadata.status === ScanStatus.READY || scanMetadata.status === ScanStatus.DETACHED;

          if (shouldInclude) {
            const blobFileName = blob.name.split("/").pop();
            const displayName = scanMetadata.displayName ?? blobFileName ?? "Unknown";

            const scan: Scan = {
              id: scanMetadata.scanId,
              userIdentifier: scanMetadata.ownerId,
              name: displayName,
              blobUrl: blob.url,
              mimeType: blob.contentType,
              sizeInBytes: blob.contentLength,
              scanType: mimeTypeToScanType(blob.contentType),
              uploadedAt: scanMetadata.uploadedAt,
              status: scanMetadata.status,
              metadata: scanMetadata,
            };

            scans.push(scan);
          }
        } catch (blobProcessingError) {
          logWithTrace(
            "warn",
            "Skipping scan due to processing error",
            {blobName: blob.name, error: String(blobProcessingError)},
            "server",
          );
        }
      }
      addSpanEvent("azure.blob.list.complete");

      // Step 4. Sort by upload date (newest first)
      scans.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

      logWithTrace("info", `Successfully fetched ${scans.length} scans`, {count: scans.length}, "server");
      return {
        success: true,
        data: scans,
      } as const;
    } catch (error: unknown) {
      addSpanEvent("scans.fetch.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error fetching scans from Azure", {error}, "server");
      console.error("Error fetching scans:", error);
      return createErrorResult(new Error(errorMessage), "Failed to fetch scans. Please try again.");
    }
  }) satisfies ServerActionOutputType;
}
