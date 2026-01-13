/**
 * @fileoverview Standalone scan type definitions for the arolariu.ro platform.
 * @module types/scans/Scan
 *
 * @remarks
 * This module defines types for standalone scans that exist independently of invoices.
 * Unlike `InvoiceScan` (which is attached to an invoice), these scans represent
 * uploaded documents that have not yet been associated with an invoice entity.
 *
 * **Domain Concepts:**
 * - Scan: A standalone document uploaded to Azure Blob Storage
 * - ScanType: Document format classification (JPEG, PNG, PDF)
 * - ScanStatus: Lifecycle state of the scan
 *
 * **Workflow:**
 * 1. User uploads scans via `/upload-scans` route
 * 2. Scans are stored in Azure Blob Storage with user metadata
 * 3. User views scans via `/view-scans` route
 * 4. User selects scans to create invoice(s)
 * 5. Scans are archived after invoice creation
 *
 * @see {@link InvoiceScan} for scans attached to invoices
 */

/**
 * Represents the document format type of a standalone scan.
 *
 * @remarks
 * Identifies the file format of uploaded documents for proper
 * processing pipeline selection. Different formats require different
 * OCR strategies and preprocessing steps.
 *
 * **Supported Formats:**
 * - Image formats (JPEG, PNG): Direct OCR processing
 * - PDF: Multi-page document extraction with embedded text detection
 * - OTHER: Fallback processing with format detection
 *
 * @example
 * ```typescript
 * const scan: Scan = {
 *   scanType: ScanType.JPEG,
 *   // ... other properties
 * };
 * ```
 */
export enum ScanType {
	/** JPEG image format */
	JPEG = "JPEG",
	/** PNG image format */
	PNG = "PNG",
	/** PDF document format */
	PDF = "PDF",
	/** Other or unsupported format */
	OTHER = "OTHER",
}

/**
 * Represents the lifecycle status of a standalone scan.
 *
 * @remarks
 * Tracks the scan through its lifecycle from upload to invoice creation.
 *
 * **State Transitions:**
 * ```
 * UPLOADING → READY → PROCESSING → ARCHIVED
 *     ↓
 *   FAILED
 * ```
 *
 * **UI Implications:**
 * - `UPLOADING`: Show progress indicator
 * - `READY`: Available for selection and invoice creation
 * - `PROCESSING`: Being used to create an invoice (show spinner)
 * - `ARCHIVED`: Invoice created, scan no longer shown in active view
 * - `FAILED`: Show error state with retry option
 *
 * @example
 * ```typescript
 * if (scan.status === ScanStatus.READY) {
 *   // Show scan in selection view
 * }
 * ```
 */
export enum ScanStatus {
	/** Upload in progress */
	UPLOADING = "uploading",
	/** Uploaded to Azure, available for use */
	READY = "ready",
	/** Upload failed */
	FAILED = "failed",
	/** Being used to create an invoice */
	PROCESSING = "processing",
	/** Invoice created, scan archived */
	ARCHIVED = "archived",
}

/**
 * Represents a standalone scan stored in Azure Blob Storage.
 *
 * @remarks
 * **Domain Concept:**
 * A scan is an uploaded document (image or PDF) that exists independently
 * of any invoice. Users upload scans first, then later select them to
 * create invoice objects. This decouples the upload and invoice creation flows.
 *
 * **Identity:**
 * - `id`: Immutable UUIDv7 string assigned at upload
 * - `userIdentifier`: Owner's Clerk user ID (stored in blob metadata for filtering)
 *
 * **Storage:**
 * Scans are stored in Azure Blob Storage with naming convention:
 * `scans/{userIdentifier}/{scanId}_{timestamp}.{extension}`
 *
 * **Lifecycle:**
 * 1. Created during upload with status `UPLOADING`
 * 2. Status changes to `READY` on successful upload
 * 3. Status changes to `PROCESSING` when creating invoice
 * 4. Status changes to `ARCHIVED` after invoice creation
 *
 * @example
 * ```typescript
 * const scan: Scan = {
 *   id: "019234ab-cdef-7890-abcd-ef1234567890",
 *   userIdentifier: "user_abc123",
 *   name: "receipt-001.jpg",
 *   blobUrl: "https://cdn.arolariu.ro/scans/user_abc123/019234ab_1704067200000.jpg",
 *   mimeType: "image/jpeg",
 *   sizeInBytes: 1048576,
 *   scanType: ScanType.JPEG,
 *   uploadedAt: new Date(),
 *   status: ScanStatus.READY,
 *   metadata: {}
 * };
 * ```
 */
export interface Scan {
	/**
	 * Unique identifier for the scan (UUIDv7).
	 * Assigned at upload time and immutable.
	 */
	readonly id: string;

	/**
	 * The user identifier of the scan owner.
	 * Stored in Azure Blob metadata for filtering by user.
	 */
	readonly userIdentifier: string;

	/**
	 * Human-readable name for the scan.
	 * Defaults to original filename, can be edited by user.
	 */
	name: string;

	/**
	 * Full URL to the scan in Azure Blob Storage.
	 * Format: https://cdn.arolariu.ro/scans/{userIdentifier}/{scanId}_{timestamp}.{ext}
	 */
	readonly blobUrl: string;

	/**
	 * MIME type of the uploaded file.
	 * Examples: "image/jpeg", "image/png", "application/pdf"
	 */
	readonly mimeType: string;

	/**
	 * File size in bytes.
	 */
	readonly sizeInBytes: number;

	/**
	 * Document format classification.
	 * Derived from mimeType during upload.
	 */
	readonly scanType: ScanType;

	/**
	 * Timestamp when the scan was uploaded.
	 */
	readonly uploadedAt: Date;

	/**
	 * Current lifecycle status of the scan.
	 */
	status: ScanStatus;

	/**
	 * Additional metadata stored with the blob.
	 * Can include OCR hints, original dimensions, etc.
	 */
	metadata: Record<string, string>;
}

/**
 * Cached version of Scan with local-only fields for IndexedDB persistence.
 *
 * @remarks
 * Extends the base Scan type with fields that are only relevant for
 * local caching and hydration. These fields are not stored in Azure.
 *
 * **Cache Strategy:**
 * - Scans are cached in IndexedDB for fast initial page load
 * - Background sync fetches fresh data from Azure
 * - `cachedAt` tracks cache freshness for stale-while-revalidate pattern
 *
 * @example
 * ```typescript
 * const cachedScan: CachedScan = {
 *   ...scan,
 *   cachedAt: new Date(),
 * };
 * ```
 */
export interface CachedScan extends Scan {
	/**
	 * Timestamp when this scan was cached in IndexedDB.
	 * Used to determine cache freshness.
	 */
	cachedAt: Date;
}
