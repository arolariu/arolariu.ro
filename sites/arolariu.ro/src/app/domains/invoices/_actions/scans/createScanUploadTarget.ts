"use server";

/**
 * @fileoverview Server action for creating blob upload targets with prepared metadata.
 * @module app/domains/invoices/_actions/scans/createScanUploadTarget
 *
 * @remarks
 * This action creates a blob upload target with pre-populated metadata headers
 * for direct client-to-Azure uploads. The server prepares all canonical metadata
 * (scanId, ownerId, uploadedBy, etc.) so the client can perform a single PUT
 * request with complete metadata headers.
 *
 * **Benefits:**
 * - No base64 encoding overhead (33% payload size increase eliminated)
 * - Server is not a bottleneck (client uploads directly to Azure)
 * - Parallel uploads (5 concurrent connections)
 * - Lower server CPU/memory usage
 * - No post-upload registration call needed
 *
 * **Security:**
 * - SAS tokens expire in 30 minutes
 * - Tokens grant only write permission (no read/delete)
 * - User authentication required before generating token
 * - Blob path includes user identifier for isolation
 *
 * **Workflow:**
 * 1. Client calls this action to get upload target with metadata headers
 * 2. Client uploads file directly to Azure using PUT request with returned headers
 * 3. Metadata is written atomically with blob content (no separate registration)
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {createBlobUploadTarget} from "@/lib/azure/storageClient";
import {createErrorResult, ServerActionResult} from "@/lib/utils.server";
import {ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, type ScanMetadata} from "@/types/scans";
import {deriveBlobExtension, isHeicScanFileName, isHeicScanMimeType, isSupportedScanMimeType} from "../../_utils/mimeTypeUtilities";
import {writeBlobMetadata} from "../../_utils/metadataUtilities";

/**
 * Input parameters for creating an upload target.
 */
type ServerActionInputType = Readonly<{
  /** Original filename from the upload */
  readonly fileName: string;
  /** MIME type of the file (e.g., "image/jpeg", "application/pdf") */
  readonly mimeType: string;
  /** File size in bytes */
  readonly sizeInBytes: number;
}>;

/**
 * Response from the upload target creation operation.
 *
 * @remarks
 * Contains everything the client needs to perform direct upload:
 * - SAS URL with create+write permissions
 * - Required HTTP headers (including all blob metadata)
 * - Canonical metadata for building the local Scan object
 */
type ServerActionOutputType = ServerActionResult<
  Readonly<{
    /** SAS URL for direct upload */
    sasUrl: string;
    /** Blob name in Azure Storage */
    blobName: string;
    /** Blob URL without SAS token */
    blobUrl: string;
    /** Generated scan identifier */
    scanId: string;
    /** Required HTTP headers for PUT request (includes metadata) */
    requiredHeaders: Readonly<Record<string, string>>;
    /** Canonical scan metadata for building Scan object */
    metadata: ScanMetadata;
  }>
>;

/**
 * Generates a UUIDv7-like scan identifier.
 *
 * @remarks
 * The timestamp prefix keeps scan blobs roughly chronological in Azure listings,
 * while the random suffix prevents collisions for concurrent uploads.
 *
 * @returns A timestamp-prefixed identifier suitable for scan blob names.
 */
function generateScanId(): string {
  const timestamp = Date.now().toString(16).padStart(12, "0");
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-7${random.slice(0, 3)}-${random.slice(3, 7)}-${random.slice(7, 19)}`;
}

/**
 * Creates a blob upload target with prepared metadata for direct client uploads.
 *
 * @remarks
 * **Execution Context:** Server-side only (Next.js server action).
 *
 * **Authentication:** Automatically fetches user from auth service.
 *
 * **Blob Naming:** `scans/{userIdentifier}/{scanId}_{timestamp}.{extension}`
 *
 * **Metadata Preparation:**
 * Server builds canonical scan metadata with real ownerId, scanId, uploadedBy, etc.
 * Metadata is converted to blob storage headers (`x-ms-meta-*`) and returned to client.
 *
 * **SAS Token Permissions:**
 * - Create: Allow creating new blobs
 * - Write: Allow writing blob content
 * - Expiry: 30 minutes from generation
 *
 * **Development Mode (Azurite):**
 * Returns direct URL (no SAS needed for HTTP endpoints).
 *
 * **Production Mode (Azure):**
 * Uses User Delegation Key with Managed Identity for SAS token generation.
 *
 * @param input - Upload target creation parameters.
 * @param input.fileName - Original filename for blob extension.
 * @param input.mimeType - MIME type for Content-Type header.
 * @param input.sizeInBytes - File size in bytes.
 * @returns Upload target with SAS URL, required headers, and canonical metadata.
 *
 * @example
 * ```typescript
 * const result = await createScanUploadTarget({
 *   fileName: "receipt.jpg",
 *   mimeType: "image/jpeg",
 *   sizeInBytes: 1048576
 * });
 *
 * if (result.success) {
 *   // Upload file directly to Azure with returned headers
 *   await fetch(result.data.sasUrl, {
 *     method: 'PUT',
 *     body: file,
 *     headers: result.data.requiredHeaders
 *   });
 *   // Build Scan from result.data.metadata
 * }
 * ```
 */
export async function createScanUploadTarget(input: ServerActionInputType): ServerActionOutputType {
  return withSpan("api.actions.scans.createScanUploadTarget", async () => {
    if (isHeicScanMimeType(input.mimeType) || isHeicScanFileName(input.fileName)) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "This scan format is not supported. Convert HEIC images to HEIF before uploading.",
        },
      };
    }

    if (!isSupportedScanMimeType(input.mimeType)) {
      return {success: false, error: {code: "VALIDATION_ERROR", message: "This scan format is not supported."}};
    }

    try {
      // Step 1. Fetch authenticated user
      addSpanEvent("bff.user.fetch.start");
      logWithTrace("info", "Fetching BFF user for authentication", {}, "server");
      const {userIdentifier} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.fetch.complete");

      // Step 2. Generate scan ID and blob name
      addSpanEvent("scan.id.generate");
      const scanId = generateScanId();
      const timestamp = Date.now();
      const extension = deriveBlobExtension(input.fileName);
      const blobName = `scans/${userIdentifier}/${scanId}_${timestamp}.${extension}`;

      // Step 3. Build canonical scan metadata
      const now = new Date();
      const scanMetadata: ScanMetadata = {
        scanId,
        ownerId: userIdentifier,
        displayName: input.fileName,
        collectionName: "default",
        documentKind: ScanDocumentKind.RECEIPT,
        documentRole: ScanDocumentRole.PRIMARY,
        status: ScanMetadataStatus.READY,
        uploadedAt: now,
        uploadedBy: userIdentifier,
      };

      // Step 4. Fetch storage configuration
      const containerName = "invoices";
      const storageEndpoint = await fetchConfigurationValue("Endpoints:Storage:Blob");

      // Step 5. Create blob upload target with metadata
      addSpanEvent("blob.upload.target.create");
      logWithTrace("info", "scan.upload-target.create", undefined, "server");

      const uploadTarget = await createBlobUploadTarget({
        storageEndpoint,
        containerName,
        blobName,
        contentType: input.mimeType,
        metadata: writeBlobMetadata(scanMetadata),
        expiresInMinutes: 30,
      });

      addSpanEvent("blob.upload.target.created");

      return {
        success: true,
        data: {
          sasUrl: uploadTarget.sasUrl,
          blobName: uploadTarget.blobName,
          blobUrl: uploadTarget.blobUrl,
          scanId,
          requiredHeaders: uploadTarget.requiredHeaders,
          metadata: scanMetadata,
        },
      } as const;
    } catch (error: unknown) {
      addSpanEvent("upload.target.creation.error");
      logWithTrace("error", "scan.upload-target.failed", {errorCode: "NETWORK_ERROR"}, "server");
      return createErrorResult(error, "Unable to prepare the scan upload. Please try again.");
    }
  }) satisfies ServerActionOutputType;
}
