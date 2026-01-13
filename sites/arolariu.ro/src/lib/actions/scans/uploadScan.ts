"use server";

/**
 * @fileoverview Server action for uploading standalone scans to Azure Blob Storage.
 * @module lib/actions/scans/uploadScan
 *
 * @remarks
 * Handles the upload of scan documents to Azure Blob Storage without creating an invoice.
 * Scans are stored with user identifier in metadata for later retrieval.
 *
 * **Storage Configuration**:
 * - Container: `invoices` (shared with invoice scans)
 * - Path prefix: `scans/{userIdentifier}/`
 * - Authentication: Azure DefaultAzureCredential (Managed Identity in prod)
 *
 * **Workflow**:
 * 1. User uploads scan via `/upload-scans` route
 * 2. This action stores the scan in Azure with user metadata
 * 3. User later views scans via `/view-scans` route
 * 4. User creates invoice(s) from selected scans
 *
 * @see {@link fetchScans} for retrieving user's scans
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {convertBase64ToBlob} from "@/lib/utils.server";
import type {Scan} from "@/types/scans";
import {ScanStatus, ScanType} from "@/types/scans";
import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input parameters for uploading a standalone scan.
 */
type UploadScanInput = Readonly<{
	/** The base64-encoded data of the scan. */
	base64Data: string;
	/** Original filename from the upload. */
	fileName: string;
	/** MIME type of the file (e.g., "image/jpeg", "application/pdf"). */
	mimeType: string;
}>;

/**
 * Response from the scan upload operation.
 */
type UploadScanOutput = Promise<
	Readonly<{
		/** HTTP status code from Azure (201 = success) */
		status: number;
		/** The created Scan entity */
		scan: Scan;
	}>
>;

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
 * Generates a UUIDv7-like identifier using timestamp + random bytes.
 * This ensures chronological ordering while maintaining uniqueness.
 */
function generateScanId(): string {
	const timestamp = Date.now().toString(16).padStart(12, "0");
	const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	return `${timestamp.slice(0, 8)}-${timestamp.slice(8, 12)}-7${random.slice(0, 3)}-${random.slice(3, 7)}-${random.slice(7, 19)}`;
}

/**
 * Uploads a standalone scan to Azure Blob Storage.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches user from auth service.
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
 * @param input - Upload parameters
 * @returns Object with HTTP status and created Scan entity
 * @throws {Error} When authentication fails
 * @throws {Error} When blob upload fails
 *
 * @example
 * ```typescript
 * const {status, scan} = await uploadScan({
 *   base64Data: base64EncodedFile,
 *   fileName: "receipt.jpg",
 *   mimeType: "image/jpeg"
 * });
 *
 * if (status === 201) {
 *   scansStore.addScan({...scan, cachedAt: new Date()});
 * }
 * ```
 */
export async function uploadScan({base64Data, fileName, mimeType}: UploadScanInput): UploadScanOutput {
	console.info(">>> Executing server action::uploadScan");

	return withSpan("api.actions.scans.uploadScan", async () => {
		try {
			// Step 1. Fetch user from auth service
			addSpanEvent("bff.user.fetch.start");
			logWithTrace("info", "Fetching BFF user for authentication", {}, "server");
			const {userIdentifier} = await fetchBFFUserFromAuthService();
			addSpanEvent("bff.user.fetch.complete");

			if (!userIdentifier) {
				throw new Error("User must be authenticated to upload scans");
			}

			// Step 2. Generate scan ID and blob name
			addSpanEvent("scan.id.generate");
			const scanId = generateScanId();
			const timestamp = Date.now();
			const extension = fileName.split(".").pop() ?? "bin";
			const blobName = `scans/${userIdentifier}/${scanId}_${timestamp}.${extension}`;

			// Step 3. Prepare for blob upload
			const containerName = "invoices";
			const storageCredentials = new DefaultAzureCredential();
			// todo: fetch from config service.
			const storageEndpoint = "https://qtcy47sacc.blob.core.windows.net/";

			// Step 4. Upload the blob to Azure Storage
			addSpanEvent("azure.blob.upload.start");
			logWithTrace("info", "Uploading scan to Azure Blob Storage", {blobName}, "server");

			const storageClient = new BlobServiceClient(storageEndpoint, storageCredentials);
			const containerClient = storageClient.getContainerClient(containerName);
			const blockBlobClient = containerClient.getBlockBlobClient(blobName);

			const originalFile = await convertBase64ToBlob(base64Data);
			const arrayBuffer = await originalFile.arrayBuffer();

			const uploadedAt = new Date().toISOString();
			const blobMetadata = {
				userIdentifier,
				scanId,
				uploadedAt,
				originalFileName: fileName,
				status: ScanStatus.READY,
			};

			const blobUploadResponse = await blockBlobClient.uploadData(arrayBuffer, {
				blobHTTPHeaders: {
					blobContentType: mimeType,
				},
				metadata: blobMetadata,
			});
			addSpanEvent("azure.blob.upload.complete");

			if (blobUploadResponse._response.status !== 201) {
				addSpanEvent("azure.blob.upload.error");
				logWithTrace("error", "Error uploading blob to Azure Storage", {status: blobUploadResponse._response.status}, "server");
			} else {
				logWithTrace("info", "Successfully uploaded scan to Azure", {scanId}, "server");
			}

			// Step 5. Construct and return the Scan entity
			const scan: Scan = {
				id: scanId,
				userIdentifier,
				name: fileName,
				blobUrl: blockBlobClient.url,
				mimeType,
				sizeInBytes: originalFile.size,
				scanType: mimeTypeToScanType(mimeType),
				uploadedAt: new Date(uploadedAt),
				status: ScanStatus.READY,
				metadata: {
					originalFileName: fileName,
				},
			};

			return {
				status: blobUploadResponse._response.status,
				scan,
			} as const;
		} catch (error) {
			addSpanEvent("scan.upload.error");
			logWithTrace("error", "Error uploading scan", {error}, "server");
			console.error("Error uploading scan:", error);
			throw error;
		}
	});
}
