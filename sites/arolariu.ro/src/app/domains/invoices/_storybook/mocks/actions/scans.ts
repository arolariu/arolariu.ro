/**
 * @fileoverview Storybook-safe scan server action mocks.
 * @module app/domains/invoices/_storybook/mocks/actions/scans
 *
 * @remarks
 * Exports all scan server action symbols with Storybook-safe implementations.
 * These mocks return realistic success results without backend dependencies.
 */

import type {CachedScan} from "@/types/scans";
import {logStoryAction, successfulStoryAction, type StoryActionResult} from "../../utils/storyActions";
import {storyCachedImageScan, storyCachedPdfScan} from "../../fixtures/scanFixtures";

/**
 * Upload target metadata for direct client-to-Azure uploads.
 */
interface CreateUploadTargetResult {
	readonly uploadUrl: string;
	readonly blobUrl: string;
	readonly headers: Record<string, string>;
}

/** Creates a scan upload target (mock). */
export async function createScanUploadTarget(): Promise<CreateUploadTargetResult> {
	logStoryAction("createScanUploadTarget");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 200));
	return {
		uploadUrl: "https://storybook.blob.core.windows.net/scans/mock-upload-sas",
		blobUrl: storyCachedImageScan.blobUrl,
		headers: {
			"x-ms-blob-type": "BlockBlob",
			"x-ms-blob-content-type": "image/jpeg",
		},
	};
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

/** Fetches all scans (mock). */
export async function fetchScans(): Promise<StoryActionResult<CachedScan[]>> {
	logStoryAction("fetchScans");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction([storyCachedImageScan, storyCachedPdfScan]);
}

/** Updates a scan (mock). */
export async function updateScan(): Promise<StoryActionResult<CachedScan>> {
	logStoryAction("updateScan");
	await new Promise((resolve) => globalThis.setTimeout(resolve, 300));
	return successfulStoryAction(storyCachedImageScan);
}
