"use server";

/**
 * @fileoverview Server action for updating scan blob content and metadata in Azure Storage.
 * @module app/domains/invoices/_actions/scans/updateScan
 *
 * @remarks
 * Handles in-place update of scan blobs using scanId-based lookup with metadata patch semantics.
 * Primary use cases: image transformations (rotation, cropping) and metadata corrections.
 *
 * **Architecture Pattern**: Uses generic storage helpers (resolveBlobObjectByMetadata, updateBlobObject).
 *
 * **Update Semantics**:
 * - **Metadata patch**: Add/remove fields while preserving others
 * - **Content replacement**: Optional full binary content update
 * - **URL stability**: Blob URL remains unchanged (same blob name)
 * - **Lifecycle tracking**: Automatically sets lastModifiedAt and lastModifiedBy
 *
 * @see {@link createScan} - Creates new scans
 * @see {@link deleteScan} - Deletes scans
 * @see {@link fetchScans} - Retrieves user's scans
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {resolveBlobObjectByMetadata, updateBlobObject} from "@/lib/azure/storageClient";
import {convertBase64ToBlob, createErrorResult, type ServerActionResult} from "@/lib/utils.server";
import {revalidatePath} from "next/cache";
import {type Scan, type ScanMetadata, ScanMetadataKey, ScanStatus} from "@/types/scans";
import {mimeTypeToScanType} from "../../_utils/mimeTypeUtilities";
import {readBlobMetadata, writeBlobMetadata} from "../../_utils/metadataUtilities";

/**
 * Input parameters for updating a scan.
 */
type ServerActionInputType = Readonly<{
  /** Scan ID to locate and update */
  scanId: string;
  /** Optional content replacement */
  scanObject?: Readonly<{
    base64Data: string;
    mediaType: string;
  }>;
  /** Metadata fields to add or update */
  metadataAdd?: Partial<ScanMetadata>;
  /** Metadata keys to remove */
  metadataRemove?: ReadonlyArray<ScanMetadataKey>;
}>;

/**
 * Response from the scan update operation.
 */
type ServerActionOutputType = ServerActionResult<
  Readonly<{
    /** The updated scan entity */
    scan: Scan;
  }>
>;


/**
 * Updates scan blob content and/or metadata by scanId.
 *
 * @param input - Update parameters with scanId, optional content, and metadata patch
 * @returns A result object containing the updated scan entity on success
 */
export async function updateScan({
  scanId,
  scanObject,
  metadataAdd,
  metadataRemove = [],
}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{updateScan}}, with scanId:", scanId);

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

      // Step 4. Parse and validate current metadata
      const currentMetadata = readBlobMetadata(blobObject.metadata);

      if (currentMetadata.ownerId !== userIdentifier) {
        addSpanEvent("authorization.failed");
        logWithTrace("warn", "User not authorized to update scan", {scanId, ownerId: currentMetadata.ownerId}, "server");
        return createErrorResult(new Error("You are not authorized to update this scan."));
      }

      // Step 5. Apply metadata patch
      const patchedMetadata: Partial<ScanMetadata> = {...currentMetadata};

      // Remove specified keys
      for (const key of metadataRemove) {
        if (key === ScanMetadataKey.SCAN_ID || key === ScanMetadataKey.OWNER_ID || key === ScanMetadataKey.UPLOADED_AT || key === ScanMetadataKey.UPLOADED_BY) {
          // Skip immutable fields
          continue;
        }
        delete patchedMetadata[key];
      }

      // Add/update specified fields
      if (metadataAdd) {
        Object.assign(patchedMetadata, metadataAdd);
      }

      // Construct final metadata with lifecycle tracking
      // Ensure all required fields are present
      const finalMetadata: ScanMetadata = {
        scanId: currentMetadata.scanId,
        ownerId: currentMetadata.ownerId,
        uploadedAt: currentMetadata.uploadedAt,
        uploadedBy: currentMetadata.uploadedBy,
        documentKind: patchedMetadata.documentKind ?? currentMetadata.documentKind,
        documentRole: patchedMetadata.documentRole ?? currentMetadata.documentRole,
        status: patchedMetadata.status ?? currentMetadata.status,
        ...patchedMetadata,
        lastModifiedAt: new Date(),
        lastModifiedBy: userIdentifier,
      };

      const updatedBlobMetadata = writeBlobMetadata(finalMetadata);

      // Step 6. Update blob content and/or metadata
      addSpanEvent("azure.blob.update.start");
      logWithTrace("info", "Updating scan in Azure Blob Storage", {blobName: blobObject.name}, "server");

      let content: Uint8Array | undefined;
      let contentType: string | undefined;

      if (scanObject) {
        const updatedFile = await convertBase64ToBlob(scanObject.base64Data);
        const arrayBuffer = await updatedFile.arrayBuffer();
        content = new Uint8Array(arrayBuffer);
        contentType = scanObject.mediaType;
      }

      const updatedBlob = await updateBlobObject({
        storageEndpoint,
        containerName,
        blobName: blobObject.name,
        content,
        contentType,
        metadata: updatedBlobMetadata,
        etag: blobObject.etag,
      });
      addSpanEvent("azure.blob.update.complete");

      logWithTrace("info", "Successfully updated scan in Azure", {scanId}, "server");
      revalidatePath("/domains/invoices/view-scans", "page");

      // Step 7. Construct and return updated Scan entity
      const scan: Scan = {
        id: finalMetadata.scanId,
        userIdentifier: finalMetadata.ownerId,
        name: finalMetadata.displayName ?? blobObject.name.split("/").pop() ?? "Unknown",
        blobUrl: updatedBlob.url,
        mimeType: updatedBlob.contentType,
        sizeInBytes: updatedBlob.contentLength,
        scanType: mimeTypeToScanType(updatedBlob.contentType),
        uploadedAt: finalMetadata.uploadedAt,
        status: finalMetadata.status as ScanStatus,
        metadata: finalMetadata,
      };

      return {
        success: true,
        data: {scan},
      } as const;
    } catch (error: unknown) {
      addSpanEvent("scan.update.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error updating scan", {error}, "server");
      console.error("Error updating scan:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
