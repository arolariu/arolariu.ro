"use server";

/**
 * @fileoverview Server action for registering scans after direct client-to-Azure upload.
 * @module app/domains/invoices/_actions/scans/registerScan
 *
 * @remarks
 * This lightweight action registers scan metadata after a direct upload to Azure.
 * It stores minimal information since the blob already exists in Azure Storage.
 *
 * **Workflow:**
 * 1. Client gets SAS URL via `generateUploadSasUrl`
 * 2. Client uploads file directly to Azure via PUT request
 * 3. Client calls this action to register scan metadata
 *
 * **Why separate from upload?**
 * - Upload happens directly to Azure (no server involvement)
 * - Registration only needs metadata (fast, low bandwidth)
 * - Allows retry logic without re-uploading large files
 *
 * @see {@link generateUploadSasUrl} for SAS URL generation
 */

import { addSpanEvent, logWithTrace, withSpan } from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import { fetchBFFUserFromAuthService } from "@/lib/actions/user/fetchUser";
import { createBlobClient, rewriteAzuriteUrl } from "@/lib/azure/storageClient";
import { type Scan, ScanStatus, ScanType } from "@/types/scans";
import { revalidatePath } from "next/cache";

/**
 * Input parameters for registering a scan.
 */
type RegisterScanInput = Readonly<{
  /** Unique scan identifier (from SAS URL generation) */
  scanId: string;
  /** Blob URL in Azure Storage (without SAS token) */
  blobUrl: string;
  /** Original filename from the upload */
  fileName: string;
  /** MIME type of the file */
  mimeType: string;
  /** File size in bytes */
  sizeInBytes: number;
}>;

/**
 * Response from the scan registration operation.
 *
 * @remarks
 * This action intentionally returns a small registration result instead of
 * `ServerActionResult<T>` because it is paired with direct-upload UI flows that
 * need only the registered scan or a concise registration error.
 */
type RegisterScanOutput = Readonly<{
  /** Whether the operation succeeded */
  success: boolean;
  /** The registered Scan entity (if success) */
  scan?: Scan;
  /** Error message (if failure) */
  error?: string;
}>;

/**
 * Maps MIME type strings to scan classification values.
 *
 * @remarks
 * Mirrors the standalone scan upload classification so direct-upload and
 * server-uploaded scans behave consistently in the UI.
 *
 * @param mimeType - MIME type reported by the uploaded file.
 * @returns The scan type used by scan listing and invoice conversion flows.
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
 * Registers a scan after direct client-to-Azure upload.
 *
 * @remarks
 * **Execution Context:** Server-side only (Next.js server action).
 *
 * **Authentication:** Automatically fetches user from auth service and validates
 * that the scan's blob URL belongs to the authenticated user.
 *
 * **Security:**
 * - Validates that blobUrl contains the user's identifier
 * - Prevents users from registering scans in other users' directories
 *
 * **Side Effects:**
 * - Emits OpenTelemetry spans for tracing
 * - Does NOT create blob in Azure (blob already exists from direct upload)
 *
 * @param input - Registration parameters for an already-uploaded blob.
 * @param input.scanId - Scan identifier returned by the SAS URL generation action.
 * @param input.blobUrl - Plain blob URL without a SAS token; must point to the authenticated user's scan path.
 * @param input.fileName - Original filename shown in scan lists.
 * @param input.mimeType - MIME type used for scan classification.
 * @param input.sizeInBytes - Uploaded file size recorded on the scan entity.
 * @returns A registration result containing the scan on success, or an error message when authentication, ownership validation, or metadata registration fails.
 *
 * @example
 * ```typescript
 * // After direct upload to Azure
 * const result = await registerScan({
 *   scanId: "019234ab-cdef-7890-abcd-ef1234567890",
 *   blobUrl: "https://cdn.arolariu.ro/scans/user_abc123/019234ab_1704067200000.jpg",
 *   fileName: "receipt.jpg",
 *   mimeType: "image/jpeg",
 *   sizeInBytes: 1048576
 * });
 *
 * if (result.success) {
 *   scansStore.addScan({...result.scan, cachedAt: new Date()});
 * }
 * ```
 */
export async function registerScan(input: RegisterScanInput): Promise<RegisterScanOutput> {
  console.info(">>> Executing server action::registerScan");

  return withSpan("api.actions.scans.registerScan", async () => {
    try {
      // Step 1. Fetch user from auth service
      addSpanEvent("bff.user.fetch.start");
      logWithTrace("info", "Fetching BFF user for authentication", {}, "server");
      const { userIdentifier } = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.fetch.complete");

      if (!userIdentifier) {
        return { success: false, error: "Authentication required" };
      }

      // Step 2. Validate that the blob URL belongs to this user
      addSpanEvent("scan.validation.start");
      const normalizedBlobUrl = rewriteAzuriteUrl(input.blobUrl);

      if (!normalizedBlobUrl.includes(`scans/${userIdentifier}/`)) {
        logWithTrace(
          "error",
          "Blob URL validation failed: user mismatch",
          {
            userIdentifier,
            blobUrl: normalizedBlobUrl,
          },
          "server",
        );
        return { success: false, error: "Invalid blob URL" };
      }
      addSpanEvent("scan.validation.complete");

      // Step 3. Set blob metadata in Azure (direct upload doesn't set metadata)
      addSpanEvent("azure.blob.metadata.start");
      const uploadedAt = new Date();
      const blobMetadata = {
        userIdentifier,
        scanId: input.scanId,
        uploadedAt: uploadedAt.toISOString(),
        originalFileName: input.fileName,
        status: ScanStatus.READY,
      };

      try {
        const containerName = "invoices";
        const storageEndpoint = await fetchConfigurationValue("Endpoints:Storage:Blob");
        const storageClient = await createBlobClient(storageEndpoint);
        const containerClient = storageClient.getContainerClient(containerName);

        // Extract blob name from the full URL
        const urlPath = new URL(input.blobUrl).pathname;
        const blobName = urlPath.split(`/${containerName}/`)[1] ?? urlPath.slice(1);
        const blockBlobClient = containerClient.getBlockBlobClient(blobName);

        await blockBlobClient.setMetadata(blobMetadata);
        addSpanEvent("azure.blob.metadata.complete");
        logWithTrace("info", "Set blob metadata after direct upload", { scanId: input.scanId }, "server");
      } catch (metadataError) {
        // Non-fatal: scan is uploaded, metadata is just convenience
        logWithTrace("warn", "Failed to set blob metadata (non-fatal)", { error: String(metadataError) }, "server");
        addSpanEvent("azure.blob.metadata.failed");
      }

      // Step 4. Construct the Scan entity

      const scan: Scan = {
        id: input.scanId,
        userIdentifier,
        name: input.fileName,
        blobUrl: normalizedBlobUrl,
        mimeType: input.mimeType,
        sizeInBytes: input.sizeInBytes,
        scanType: mimeTypeToScanType(input.mimeType),
        uploadedAt,
        status: ScanStatus.READY,
        metadata: {
          originalFileName: input.fileName,
          registeredAt: uploadedAt.toISOString(),
        },
      };

      addSpanEvent("scan.registration.complete");
      logWithTrace("info", "Successfully registered scan", { scanId: input.scanId }, "server");

      revalidatePath("/domains/invoices/view-scans", "page");
      revalidatePath("/domains/invoices/upload-scans", "page");

      return {
        success: true,
        scan,
      };
    } catch (error) {
      addSpanEvent("scan.registration.error");
      logWithTrace("error", "Error registering scan", { error: String(error) }, "server");
      console.error("Error registering scan:", error);
      return { success: false, error: "Failed to register scan" };
    }
  });
}
