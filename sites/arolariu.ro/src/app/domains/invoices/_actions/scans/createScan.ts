"use server";

/**
 * @fileoverview Server action for creating standalone scans in Azure Blob Storage.
 * @module app/domains/invoices/_actions/scans/createScan
 *
 * @remarks
 * Handles the creation of scan documents (receipts, invoices) in Azure Blob Storage
 * without immediately attaching them to an invoice entity. Users upload scans first,
 * then later select and convert them into invoices.
 *
 * **Architecture Pattern**: Direct Azure SDK integration (NOT REST API).
 * Unlike other scan actions (`attachScanToInvoice`, `detachScanFromInvoice`), this action
 * bypasses the backend REST API and uses the Azure Storage SDK directly for optimal
 * upload performance and streaming support.
 *
 * **Authentication Strategy**:
 * - Uses centralized Azure credential singleton (no JWT required)
 * - Managed Identity in production, connection string in development
 * - User identity tracked via blob metadata (not Azure permissions)
 *
 * **Storage Configuration**:
 * - Container: `invoices` (shared with invoice-attached scans)
 * - Path prefix: `scans/{userIdentifier}/`
 * - Naming: `{scanId}_{timestamp}.{extension}` for chronological ordering
 * - Metadata: userIdentifier, scanId, uploadedAt, originalFileName, status
 *
 * **Typical Workflow**:
 * 1. User navigates to `/create-scan` route
 * 2. Selects file(s) from device (JPEG, PNG, PDF)
 * 3. This action uploads to Azure Blob Storage with READY status
 * 4. User views scans via `/view-scans` route (list by userIdentifier metadata)
 * 5. User selects scan(s) to convert into invoice(s) via AI enrichment
 * 6. `attachScanToInvoice` action links scan to invoice entity
 *
 * **ID Generation**: Uses UUIDv7-like format (timestamp-based) for:
 * - Chronological ordering in blob listings
 * - Efficient range queries by time
 * - Globally unique identifiers
 *
 * @example
 * ```typescript
 * // Basic upload from file input
 * const file = event.target.files[0];
 * const base64 = await fileToBase64(file);
 *
 * const result = await createScan({
 *   base64Data: base64,
 *   fileName: file.name,
 *   mimeType: file.type
 * });
 *
 * if (result.success) {
 *   scansStore.addScan({...result.data.scan, cachedAt: new Date()});
 *   toast.success("Scan uploaded successfully");
 * }
 * ```
 *
 * @see {@link attachScanToInvoice} - Links scan to invoice (uses REST API)
 * @see {@link detachScanFromInvoice} - Removes scan (uses REST API)
 * @see {@link fetchScans} - Retrieves user's scans
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {uploadBlobObject} from "@/lib/azure/storageClient";
import {convertBase64ToBlob, createErrorResult, type ServerActionResult} from "@/lib/utils.server";
import {type Scan, ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, ScanStatus} from "@/types/scans";
import {deriveBlobExtension, mimeTypeToScanType} from "../../_utils/mimeTypeUtilities";
import {writeBlobMetadata} from "../../_utils/metadataUtilities";

/**
 * Input parameters for uploading a standalone scan.
 */
type ServerActionInputType = Readonly<{
  /** The base64-encoded data of the scan. Must be valid base64 string. */
  base64Data: string;
  /** Original filename from the upload. Used for metadata and extension detection. */
  fileName: string;
  /** MIME type of the file (e.g., "image/jpeg", "application/pdf"). Determines ScanType. */
  mimeType: string;
}>;

/**
 * Response from the scan upload operation.
 *
 * @remarks
 * The result wraps the Azure upload status together with the scan model that
 * callers can persist in the client-side scans store.
 */
type ServerActionOutputType = ServerActionResult<
  Readonly<{
    /** HTTP status code from Azure (201 = success, other = error) */
    status: number;
    /** The created Scan entity with blob URL and metadata */
    scan: Scan;
  }>
>;


/**
 * Generates a UUIDv7-like identifier using timestamp + random bytes.
 *
 * @remarks
 * **Format**: `{timestamp8}-{timestamp4}-7{random3}-{random4}-{random12}`
 * - First 12 hex chars: millisecond timestamp (ensures chronological ordering)
 * - Remaining chars: cryptographically secure random bytes
 * - Version marker: "7" prefix on third segment (UUIDv7 convention)
 *
 * **Why UUIDv7-like?**
 * - Chronological ordering: Scans appear in upload order in blob listings
 * - Efficient indexing: Time-based prefixes enable range queries
 * - Collision resistance: Random suffix ensures uniqueness
 *
 * **Not RFC 4122 compliant**: This is a simplified implementation for internal use.
 * Do not use where strict UUID spec compliance is required.
 *
 * @returns A UUIDv7-like identifier string (e.g., "018f1234-5678-7abc-def0-123456789012")
 *
 * @example
 * ```typescript
 * const id1 = generateScanId(); // "018f1234-5678-7abc-def0-123456789012"
 * const id2 = generateScanId(); // "018f1234-5679-7def-0123-456789abcdef"
 * // id1 < id2 (chronological ordering guaranteed)
 * ```
 */
function generateScanId(): string {
  const timestamp = Date.now().toString(16).padStart(12, "0");
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-7${random.slice(0, 3)}-${random.slice(3, 7)}-${random.slice(7, 19)}`;
}


/**
 * Uploads a standalone scan to Azure Blob Storage for later invoice conversion.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**:
 * - User: Automatically fetched via `fetchBFFUserFromAuthService` (JWT-based)
 * - Azure: Centralized credential singleton (Managed Identity in prod)
 *
 * **Blob Naming**: `scans/{userIdentifier}/{scanId}_{timestamp}.{extension}`
 * This structure enables efficient listing of scans by user.
 *
 * **Metadata Stored**:
 * - `userIdentifier`: Owner's user ID for filtering
 * - `scanId`: Unique scan identifier
 * - `uploadedAt`: ISO timestamp of upload
 * - `originalFileName`: Original filename from upload
 * - `status`: Scan lifecycle status
 *
 * **Side Effects**: Emits OpenTelemetry spans for tracing.
 *
 * @param input - Upload parameters containing base64 content, original file name, and MIME type.
 * @param input.base64Data - Base64-encoded file content, with or without a data URI prefix.
 * @param input.fileName - Original upload filename used for blob extension and display metadata.
 * @param input.mimeType - MIME type used for Azure content headers and scan classification.
 * @returns A result object containing the Azure status and created scan entity on success, or an error result when upload fails.
 *
 * @example
 * ```typescript
 * const result = await createScan({
 *   base64Data: base64EncodedFile,
 *   fileName: "receipt.jpg",
 *   mimeType: "image/jpeg"
 * });
 *
 * if (result.success && result.data.status === 201) {
 *   scansStore.addScan({...result.data.scan, cachedAt: new Date()});
 * }
 * ```
 */
export async function createScan({base64Data, fileName, mimeType}: ServerActionInputType): ServerActionOutputType {
  console.info(">>> Executing server action {{createScan}}, with fileName:", fileName);

  return withSpan("api.actions.scans.createScan", async () => {
    try {
      // Step 1. Fetch user from auth service
      addSpanEvent("bff.user.fetch.start");
      logWithTrace("info", "Fetching BFF user for authentication", {}, "server");
      const {userIdentifier} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.fetch.complete");

      // Step 2. Generate scan ID and blob name
      addSpanEvent("scan.id.generate");
      const scanId = generateScanId();
      const timestamp = Date.now();
      const extension = deriveBlobExtension(fileName);
      const blobName = `scans/${userIdentifier}/${scanId}_${timestamp}.${extension}`;

      // Step 3. Prepare for blob upload
      const containerName = "invoices";
      const storageEndpoint = await fetchConfigurationValue("Endpoints:Storage:Blob");

      // Step 4. Upload the blob to Azure Storage
      addSpanEvent("azure.blob.create.start");
      logWithTrace("info", "Creating scan in Azure Blob Storage", {blobName}, "server");

      const originalFile = await convertBase64ToBlob(base64Data);
      const arrayBuffer = await originalFile.arrayBuffer();
      const content = new Uint8Array(arrayBuffer);

      const uploadedAt = new Date();
      const scanMetadata = {
        scanId,
        ownerId: userIdentifier,
        displayName: fileName,
        documentKind: ScanDocumentKind.RECEIPT,
        documentRole: ScanDocumentRole.PRIMARY,
        status: ScanMetadataStatus.READY,
        uploadedAt,
        uploadedBy: userIdentifier,
      } as const;
      const blobMetadata = writeBlobMetadata(scanMetadata);

      const blobObject = await uploadBlobObject({
        storageEndpoint,
        containerName,
        blobName,
        content,
        contentType: mimeType,
        metadata: blobMetadata,
      });
      addSpanEvent("azure.blob.upload.complete");

      logWithTrace("info", "Successfully created scan in Azure", {scanId}, "server");

      // Step 5. Construct and return the Scan entity
      const scan: Scan = {
        id: scanId,
        userIdentifier,
        name: fileName,
        blobUrl: blobObject.url,
        mimeType,
        sizeInBytes: originalFile.size,
        scanType: mimeTypeToScanType(mimeType),
        uploadedAt,
        status: ScanStatus.READY,
        metadata: scanMetadata,
      };

      return {
        success: true,
        data: {
          status: 201,
          scan,
        },
      } as const;
    } catch (error: unknown) {
      addSpanEvent("scan.create.error");
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      logWithTrace("error", "Error creating scan", {error}, "server");
      console.error("Error creating scan:", error);
      return createErrorResult(new Error(errorMessage));
    }
  }) satisfies ServerActionOutputType;
}
