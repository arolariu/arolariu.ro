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
import type {Scan} from "@/types/scans";
import {ScanStatus, ScanType} from "@/types/scans";
import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";
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
			const storageCredentials = new DefaultAzureCredential();
			// todo: fetch from config service.
			const storageEndpoint = "https://qtcy47sacc.blob.core.windows.net/";

			const storageClient = new BlobServiceClient(storageEndpoint, storageCredentials);
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

				// Skip if no scan ID in metadata (invalid scan)
				if (!metadata["scanId"]) {
					continue;
				}

				// Parse status from metadata
				const statusString = metadata["status"] ?? ScanStatus.READY;
				const status = Object.values(ScanStatus).includes(statusString as ScanStatus) ? (statusString as ScanStatus) : ScanStatus.READY;

				// Skip archived scans unless requested
				if (!includeArchived && status === ScanStatus.ARCHIVED) {
					continue;
				}

				// Construct blob URL
				const blobUrl = containerClient.getBlockBlobClient(blob.name).url;

				// Parse upload timestamp
				const uploadedAt = metadata["uploadedAt"] ? new Date(metadata["uploadedAt"]) : (blob.properties.createdOn ?? new Date());

				// Determine MIME type
				const mimeType = blob.properties.contentType ?? "application/octet-stream";

				const scan: Scan = {
					id: metadata["scanId"],
					userIdentifier: metadata["userIdentifier"] ?? userIdentifier,
					name: metadata["originalFileName"] ?? blob.name.split("/").pop() ?? "Unknown",
					blobUrl,
					mimeType,
					sizeInBytes: blob.properties.contentLength ?? 0,
					scanType: mimeTypeToScanType(mimeType),
					uploadedAt,
					status,
					metadata: {
						originalFileName: metadata["originalFileName"] ?? "",
						...metadata,
					},
				};

				scans.push(scan);
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
