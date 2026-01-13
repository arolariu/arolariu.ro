"use server";

/**
 * @fileoverview Server action for deleting a scan from Azure Blob Storage.
 * @module lib/actions/scans/deleteScan
 *
 * @remarks
 * Permanently deletes a scan blob from Azure Storage. This action validates
 * that the requesting user owns the scan before deletion.
 *
 * @see {@link uploadScan} for uploading scans
 * @see {@link fetchScans} for retrieving scans
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import {DefaultAzureCredential} from "@azure/identity";
import {BlobServiceClient} from "@azure/storage-blob";
import {fetchBFFUserFromAuthService} from "../user/fetchUser";

/**
 * Input parameters for deleting a scan.
 */
type DeleteScanInput = Readonly<{
	/** The blob URL of the scan to delete. */
	blobUrl: string;
}>;

/**
 * Response from the delete scan operation.
 */
type DeleteScanOutput = Promise<
	Readonly<{
		/** Whether the deletion was successful */
		success: boolean;
		/** Error message if deletion failed */
		error?: string;
	}>
>;

/**
 * Deletes a scan from Azure Blob Storage.
 *
 * @remarks
 * **Execution Context**: Server-side only (Next.js server action).
 *
 * **Authentication**: Automatically fetches user from auth service.
 *
 * **Authorization**:
 * The blob path must contain the user identifier, ensuring users can only
 * delete their own scans. Format: `scans/{userIdentifier}/...`
 *
 * **Idempotency**:
 * If the blob doesn't exist, the operation returns success (no error).
 *
 * **Side Effects**: Emits OpenTelemetry spans for tracing.
 *
 * @param input - Delete parameters
 * @returns Object with success status and optional error message
 *
 * @example
 * ```typescript
 * const {success, error} = await deleteScan({
 *   blobUrl: "https://storage.../scans/user_abc123/scan-001.jpg"
 * });
 *
 * if (success) {
 *   scansStore.removeScan(scanId);
 * } else {
 *   toast.error(error);
 * }
 * ```
 */
export async function deleteScan({blobUrl}: DeleteScanInput): DeleteScanOutput {
	console.info(">>> Executing server action::deleteScan");

	return withSpan("api.actions.scans.deleteScan", async () => {
		try {
			// Step 1. Fetch user from auth service
			addSpanEvent("bff.user.fetch.start");
			logWithTrace("info", "Fetching BFF user for authentication", {}, "server");
			const {userIdentifier} = await fetchBFFUserFromAuthService();
			addSpanEvent("bff.user.fetch.complete");

			if (!userIdentifier) {
				return {
					success: false,
					error: "User must be authenticated to delete scans",
				};
			}

			// Step 2. Extract blob name from URL
			addSpanEvent("blob.url.parse.start");
			const url = new URL(blobUrl);
			const pathParts = url.pathname.split("/");
			// Path format: /containerName/scans/userIdentifier/filename
			const containerName = pathParts[1];
			const blobName = pathParts.slice(2).join("/");
			addSpanEvent("blob.url.parse.complete");

			// Step 3. Verify user owns this scan (path contains their user ID)
			if (!blobName.includes(`scans/${userIdentifier}/`)) {
				addSpanEvent("authorization.failed");
				logWithTrace("warn", "Authorization failed: User does not own this scan", {userIdentifier, blobName}, "server");
				return {
					success: false,
					error: "You do not have permission to delete this scan",
				};
			}

			// Step 4. Connect to Azure Storage
			addSpanEvent("azure.storage.connect.start");
			const storageCredentials = new DefaultAzureCredential();
			// todo: fetch from config service.
			const storageEndpoint = "https://qtcy47sacc.blob.core.windows.net/";

			const storageClient = new BlobServiceClient(storageEndpoint, storageCredentials);
			const containerClient = storageClient.getContainerClient(containerName ?? "invoices");
			const blockBlobClient = containerClient.getBlockBlobClient(blobName);
			addSpanEvent("azure.storage.connect.complete");

			// Step 5. Delete the blob
			addSpanEvent("azure.blob.delete.start");
			logWithTrace("info", "Deleting scan from Azure Blob Storage", {blobName}, "server");
			const deleteResponse = await blockBlobClient.deleteIfExists();
			addSpanEvent("azure.blob.delete.complete");

			if (deleteResponse.succeeded || !deleteResponse.errorCode) {
				logWithTrace("info", "Successfully deleted scan", {blobName}, "server");
				return {success: true};
			}

			addSpanEvent("azure.blob.delete.error");
			logWithTrace("error", "Error deleting blob", {errorCode: deleteResponse.errorCode}, "server");
			return {
				success: false,
				error: `Failed to delete scan: ${deleteResponse.errorCode}`,
			};
		} catch (error) {
			addSpanEvent("scan.delete.error");
			logWithTrace("error", "Error deleting scan", {error}, "server");
			console.error("Error deleting scan:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : "Unknown error occurred",
			};
		}
	});
}
