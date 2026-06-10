/**
 * @fileoverview Scan fixtures for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/fixtures/scanFixtures
 */

import type {InvoiceScan, InvoiceScanType} from "@/types/invoices/Invoice";
import type {CachedScan, ScanType} from "@/types/scans/Scan";
import type {ScanDocumentKind, ScanDocumentRole, ScanMetadata} from "@/types/scans/ScanMetadata";

/**
 * Story image scan URL fixture.
 */
export const storyImageScanUrl = "https://cdn.arolariu.ro/invoices/storybook/receipt-001.jpg";

/**
 * Story PDF scan URL fixture.
 *
 * @remarks
 * Uses an embedded minimal PDF so iframe-based PDF stories do not depend on
 * external CDN framing headers or network availability.
 */
export const storyPdfScanUrl =
	"data:application/pdf;base64,JVBERi0xLjQKJcfsj6IKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAxIDEgXSA+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyCjw8IC9Sb290IDEgMCBSIC9TaXplIDQgPj4Kc3RhcnR4cmVmCjE5NgolJUVPRg==";

/**
 * InvoiceScan fixture for JPEG image.
 */
export const storyInvoiceImageScan: InvoiceScan = {
	scanType: 1 as InvoiceScanType, // JPEG
	location: storyImageScanUrl,
	metadata: {
		scanId: "scan-story-image-001",
		status: "attached",
		uploadedAt: "2024-03-15T10:30:00.000Z",
	},
};

/**
 * InvoiceScan fixture for PDF document.
 */
export const storyInvoicePdfScan: InvoiceScan = {
	scanType: 3 as InvoiceScanType, // PDF
	location: storyPdfScanUrl,
	metadata: {
		scanId: "scan-story-pdf-001",
		status: "attached",
		uploadedAt: "2024-03-15T11:00:00.000Z",
		ocrConfidence: {score: 0.92},
		pageCount: "2",
	},
};

/**
 * Creates a complete ScanMetadata fixture.
 * @internal Helper for creating CachedScan fixtures.
 */
function createScanMetadata(overrides: Partial<ScanMetadata> = {}): ScanMetadata {
	return {
		scanId: "scan-default-id",
		ownerId: "user-storybook",
		documentKind: "receipt" as ScanDocumentKind,
		documentRole: "primary" as ScanDocumentRole,
		status: "ready",
		uploadedAt: new Date("2024-03-15T10:00:00.000Z"),
		uploadedBy: "user-storybook",
		...overrides,
	};
}

/**
 * CachedScan fixture for image - extends Scan with cachedAt timestamp.
 */
export const storyCachedImageScan: CachedScan = {
	id: "scan-story-image-cached-001",
	userIdentifier: "user-storybook",
	name: "Grocery Receipt 2024-03-15",
	blobUrl: storyImageScanUrl,
	mimeType: "image/jpeg",
	sizeInBytes: 245760,
	scanType: "JPEG" as ScanType,
	uploadedAt: new Date("2024-03-15T10:30:00.000Z"),
	status: "ready",
	metadata: createScanMetadata({
		scanId: "scan-story-image-cached-001",
		documentKind: "receipt" as ScanDocumentKind,
		documentRole: "primary" as ScanDocumentRole,
	}),
	cachedAt: new Date("2024-03-15T12:00:00.000Z"),
};

/**
 * CachedScan fixture for PDF - extends Scan with cachedAt timestamp.
 */
export const storyCachedPdfScan: CachedScan = {
	id: "scan-story-pdf-cached-001",
	userIdentifier: "user-storybook",
	name: "Invoice 2024-03-15",
	blobUrl: storyPdfScanUrl,
	mimeType: "application/pdf",
	sizeInBytes: 512000,
	scanType: "PDF" as ScanType,
	uploadedAt: new Date("2024-03-15T11:00:00.000Z"),
	status: "ready",
	metadata: createScanMetadata({
		scanId: "scan-story-pdf-cached-001",
		documentKind: "invoice" as ScanDocumentKind,
		documentRole: "primary" as ScanDocumentRole,
	}),
	cachedAt: new Date("2024-03-15T12:30:00.000Z"),
};
