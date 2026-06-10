/**
 * @fileoverview Storybook-safe scan server action mocks.
 * @module app/domains/invoices/_storybook/mocks/actions/scans
 *
 * @remarks
 * Exports all scan server action symbols with Storybook-safe implementations.
 * These mocks return realistic success results without backend dependencies.
 */

import type {CachedScan} from "@/types/scans";
import {ScanDocumentKind, ScanDocumentRole, ScanMetadataStatus, type ScanMetadata} from "@/types/scans";
import {logStoryAction, successfulStoryAction, type StoryActionResult} from "../../utils/storyActions";
import {storyCachedImageScan, storyCachedPdfScan} from "../../fixtures/scanFixtures";
import {useScansStore} from "@/stores";

/**
 * Upload target metadata for direct client-to-Azure uploads.
 * Matches the production ServerActionOutputType from createScanUploadTarget.
 */
type CreateUploadTargetResult = StoryActionResult<
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

/** Creates a scan upload target (mock). */
export async function createScanUploadTarget(): Promise<CreateUploadTargetResult> {
	logStoryAction("createScanUploadTarget");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 200));

	const scanId = `story-scan-${Date.now().toString(16)}`;
	const now = new Date();
	const blobName = `scans/user-storybook/${scanId}_${Date.now()}.jpg`;

	const scanMetadata: ScanMetadata = {
		scanId,
		ownerId: "user-storybook",
		displayName: "storybook-receipt.jpg",
		collectionName: "default",
		documentKind: ScanDocumentKind.RECEIPT,
		documentRole: ScanDocumentRole.PRIMARY,
		status: ScanMetadataStatus.READY,
		uploadedAt: now,
		uploadedBy: "user-storybook",
	};

	return successfulStoryAction({
		sasUrl: `https://storybook.blob.core.windows.net/invoices/${blobName}?sv=2021-12-02&st=mock&se=mock&sr=b&sp=cw&sig=mockSignature`,
		blobName,
		blobUrl: storyCachedImageScan.blobUrl,
		scanId,
		requiredHeaders: {
			"x-ms-blob-type": "BlockBlob",
			"Content-Type": "image/jpeg",
			"x-ms-meta-scanid": scanId,
			"x-ms-meta-ownerid": "user-storybook",
		},
		metadata: scanMetadata,
	});
}

/** Creates a scan (mock). */
export async function createScan(): Promise<StoryActionResult<CachedScan>> {
	logStoryAction("createScan");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 500));
	return successfulStoryAction(storyCachedImageScan);
}

/** Deletes a scan (mock). */
export async function deleteScan(): Promise<StoryActionResult<{scanId: string}>> {
	logStoryAction("deleteScan");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction({scanId: storyCachedImageScan.id});
}

/**
 * Fetches all scans (mock).
 *
 * @remarks
 * Returns the current seeded scans from the store exactly, even when empty.
 * This preserves story-seeded state when the real `useScans()` hook auto-syncs
 * after hydration. Stories that need populated scans call `seedInvoiceStoryStores()`
 * with scan fixtures.
 */
export async function fetchScans(): Promise<StoryActionResult<CachedScan[]>> {
	logStoryAction("fetchScans");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));

	// Preserve seeded scan state from stories, even when empty
	const seededScans = useScansStore.getState().scans;

	return successfulStoryAction([...seededScans]);
}

/** Updates a scan (mock). */
export async function updateScan(): Promise<StoryActionResult<CachedScan>> {
	logStoryAction("updateScan");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction(storyCachedImageScan);
}
