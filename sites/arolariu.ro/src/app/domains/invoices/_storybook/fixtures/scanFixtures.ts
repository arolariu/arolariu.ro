/**
 * @fileoverview Scan fixtures for invoice Storybook stories.
 * @module app/domains/invoices/_storybook/fixtures/scanFixtures
 */

import type {InvoiceScan, InvoiceScanType} from "@/types/invoices/Invoice";
import type {CachedScan, Scan, ScanType} from "@/types/scans/Scan";
import type {ScanDocumentKind, ScanDocumentRole, ScanMetadata} from "@/types/scans/ScanMetadata";

/**
 * Story image scan URL fixture.
 */
export const storyImageScanUrl = "https://cdn.arolariu.ro/invoices/storybook/receipt-001.jpg";

/**
 * Story PDF scan URL fixture.
 */
export const storyPdfScanUrl = "https://cdn.arolariu.ro/invoices/storybook/invoice-001.pdf";

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
 * Standalone Scan fixture for JPEG image.
 */
export const storyImageScan: Scan = {
	id: "scan-story-image-standalone-001",
	userIdentifier: "user-storybook",
	name: "Grocery Receipt 2024-03-15",
	blobUrl: storyImageScanUrl,
	mimeType: "image/jpeg",
	sizeInBytes: 245760,
	scanType: "JPEG" as ScanType,
	uploadedAt: new Date("2024-03-15T10:30:00.000Z"),
	status: "ready",
	metadata: createScanMetadata({
		scanId: "scan-story-image-standalone-001",
		documentKind: "receipt" as ScanDocumentKind,
		documentRole: "primary" as ScanDocumentRole,
	}),
};

/**
 * Standalone Scan fixture for PDF document.
 */
export const storyPdfScan: Scan = {
	id: "scan-story-pdf-standalone-001",
	userIdentifier: "user-storybook",
	name: "Invoice 2024-03-15",
	blobUrl: storyPdfScanUrl,
	mimeType: "application/pdf",
	sizeInBytes: 512000,
	scanType: "PDF" as ScanType,
	uploadedAt: new Date("2024-03-15T11:00:00.000Z"),
	status: "ready",
	metadata: createScanMetadata({
		scanId: "scan-story-pdf-standalone-001",
		documentKind: "invoice" as ScanDocumentKind,
		documentRole: "primary" as ScanDocumentRole,
	}),
};

/**
 * CachedScan fixture for image - extends Scan with cachedAt timestamp.
 */
export const storyCachedImageScan: CachedScan = {
	...storyImageScan,
	cachedAt: new Date("2024-03-15T12:00:00.000Z"),
};

/**
 * CachedScan fixture for PDF - extends Scan with cachedAt timestamp.
 */
export const storyCachedPdfScan: CachedScan = {
	...storyPdfScan,
	cachedAt: new Date("2024-03-15T12:30:00.000Z"),
};
