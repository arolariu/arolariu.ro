/**
 * @fileoverview Invoice domain type definitions for the arolariu.ro platform.
 * @module types/invoices/Invoice
 *
 * @remarks
 * This module defines the core invoice aggregate and related types for the invoices
 * bounded context. The invoice is the primary aggregate root that encapsulates:
 * - Payment transaction details
 * - Line item products
 * - Merchant references
 * - AI-generated recipe suggestions
 * - Document scans and OCR artifacts
 *
 * **Domain Concepts:**
 * - Invoice: Aggregate root representing a financial transaction record
 * - InvoiceScan: Document artifacts (images, PDFs) attached to invoices
 * - Analysis Options: AI processing configurations
 *
 * **Sharing Model:**
 * - Private: `sharedWith` is empty
 * - Shared: `sharedWith` contains specific user GUIDs
 * - Public: `sharedWith` contains a special "public" GUID sentinel
 *
 * @see {@link NamedEntity} for base entity contract
 * @see {@link PaymentInformation} for payment details
 * @see {@link Product} for line item structure
 */

import type {NamedEntity} from "../DDD";
import type {StandardClassification} from "./Classification";
import type {PaymentDetail, PaymentInformation, TaxDetail} from "./Payment";
import type {Product} from "./Product";
import type {RecipeSuggestion} from "./Recipe";

/**
 * Represents the document format type of an invoice scan.
 *
 * @remarks
 * Identifies the file format of uploaded invoice documents for proper
 * processing pipeline selection. Different formats require different
 * OCR strategies and preprocessing steps.
 *
 * **Supported Formats:**
 * - Image formats (JPG, JPEG, PNG, BMP, TIFF, HEIF): Direct OCR processing
 * - PDF: Multi-page document extraction with embedded text detection
 * - OTHER/UNKNOWN: Fallback processing with format detection
 *
 * **Backend Constraint:**
 * The backend `InvoiceScan.type` field accepts values `0`–`8` only.
 * `HEIC` (formerly `9`) has been removed to prevent rejected uploads.
 *
 * **Backend Processing:**
 * The scan type determines which Azure AI Document Intelligence model
 * is used for text extraction and layout analysis.
 *
 * @example
 * ```typescript
 * const scan: InvoiceScan = {
 *   type: InvoiceScanType.PDF,
 *   location: "https://storage.arolariu.ro/invoices/doc.pdf",
 *   metadata: {}
 * };
 * ```
 *
 * @see {@link InvoiceScan} for the complete scan object structure
 */
const INVOICE_SCAN_TYPE = {
  /** JPG image format */
  JPG: 0,
  /** JPEG image format */
  JPEG: 1,
  /** PNG image format */
  PNG: 2,
  /** PDF document format */
  PDF: 3,
  /** Other image format */
  OTHER: 4,
  /** Unknown or unsupported format */
  UNKNOWN: 5,
  /** BMP image format */
  BMP: 6,
  /** TIFF image format */
  TIFF: 7,
  /** HEIF image format */
  HEIF: 8,
} as const;

export {INVOICE_SCAN_TYPE as InvoiceScanType};
export type InvoiceScanType = (typeof INVOICE_SCAN_TYPE)[keyof typeof INVOICE_SCAN_TYPE];

/**
 * Represents a value that can be stored in InvoiceScan metadata.
 *
 * @remarks
 * Invoice scan metadata supports both object structures (for complex nested data)
 * and string primitives (for simple canonical scan metadata values).
 *
 * **Use Cases:**
 * - String values: Canonical scan metadata fields (scanId, ownerId, status, timestamps, etc.)
 * - Object values: Legacy OCR confidence scores, dimensions, custom nested structures
 *
 * @example
 * ```typescript
 * const metadata: Record<string, InvoiceScanMetadataValue> = {
 *   // String values from canonical scan metadata
 *   scanId: "scan-123",
 *   status: "attached",
 *   uploadedAt: "2026-01-01T00:00:00.000Z",
 *   // Object values for nested data
 *   ocrConfidence: { score: 0.95 },
 *   dimensions: { width: 1920, height: 2560 }
 * };
 * ```
 */
export type InvoiceScanMetadataValue = string | object;

/**
 * Represents a document scan (image or PDF) attached to an invoice.
 *
 * @remarks
 * Invoice scans are the source documents from which invoice data is extracted.
 * An invoice can have multiple scans (e.g., front and back of a receipt,
 * or multi-page documents).
 *
 * **Storage:**
 * Scans are stored in Azure Blob Storage with the `location` property
 * containing the full CDN URL (https://cdn.arolariu.ro/...).
 *
 * **Metadata:**
 * The `metadata` object stores scan-specific information such as:
 * - Canonical scan metadata (scanId, ownerId, status, timestamps as strings)
 * - OCR confidence scores (as objects)
 * - Page numbers (for multi-page documents)
 * - Extraction timestamps
 * - Original file dimensions (as objects)
 *
 * **Immutability:**
 * Once created, scan locations are immutable. To replace a scan,
 * delete the old one and create a new scan entry.
 *
 * @example
 * ```typescript
 * const scan: InvoiceScan = {
 *   type: InvoiceScanType.JPEG,
 *   location: "https://cdn.arolariu.ro/invoices/user123/scan-001.jpg",
 *   metadata: {
 *     // Canonical scan metadata (string values)
 *     scanId: "scan-001",
 *     status: "attached",
 *     uploadedAt: "2026-01-01T00:00:00.000Z",
 *     // Legacy nested structures (object values)
 *     ocrConfidence: { score: 0.95 },
 *     dimensions: { width: 1920, height: 2560 }
 *   }
 * };
 * ```
 *
 * @see {@link InvoiceScanType} for supported document formats
 * @see {@link CreateInvoiceScanDtoPayload} for creating new scans
 */
export type InvoiceScan = {
  /**
   * The numeric scan format type, matching the backend `InvoiceScanResponseDto.type`.
   */
  type: InvoiceScanType;
  /** The location (URL or path) of the invoice scan. */
  location: string;
  /** Additional metadata associated with the invoice scan (supports both string and object values). */
  metadata: Record<string, InvoiceScanMetadataValue>;
};

/**
 * The invoice aggregate root - core entity of the invoices bounded context.
 *
 * @remarks
 * **Domain Concept:**
 * An invoice represents a financial transaction record between a user and
 * a merchant. It is the aggregate root that ensures consistency across
 * all related entities (products, payment info, scans).
 *
 * **Identity:**
 * - `id`: Immutable UUIDv7 string assigned at creation
 * - `userIdentifier`: Owner's Clerk user ID (GUIDv4)
 * - `merchantReference`: Link to merchant entity (GUIDv4)
 *
 * **Lifecycle:**
 * 1. Created with initial scan via `CreateInvoiceDtoPayload`
 * 2. AI analysis enriches products, merchant, and metadata
 * 3. User can edit, share, or categorize
 * 4. Soft-deleted when removed (data retained for analytics)
 *
 * **Sharing Model:**
 * - Empty `sharedWith`: Private to owner only
 * - Contains GUIDs: Shared with specific users
 * - Contains special GUID: Publicly accessible
 *
 * **Invariants:**
 * - `paymentInformation.totalCostAmount` must equal sum of `items[].totalPrice`
 * - `items` array must not be empty for analyzed invoices
 * - `scans` array must have at least one scan
 *
 * @example
 * ```typescript
 * const invoice: Invoice = {
 *   id: "019234ab-cdef-7890-abcd-ef1234567890",
 *   name: "Grocery Shopping",
 *   description: "Weekly groceries from Lidl",
 *   userIdentifier: "user_abc123",
 *   sharedWith: [],
 *   scans: [scan],
 *   paymentInformation: paymentInfo,
 *   merchantReference: "merchant-guid-here",
 *   items: [product1, product2],
 *   possibleRecipes: [],
 *   additionalMetadata: {},
 *   createdAt: new Date(),
 *   lastUpdatedAt: new Date(),
 *   isDeleted: false
 * };
 * ```
 *
 * @see {@link NamedEntity} for inherited properties (id, name, description, audit fields)
 * @see {@link PaymentInformation} for payment details structure
 * @see {@link Product} for line item structure
 * @see {@link RecipeSuggestion} for AI-generated recipe suggestions
 */
export interface Invoice extends NamedEntity<string> {
  /**
   * The user identifier, usually represents the user that created the invoice.
   * It is a GUIDv4 formatted identifier string.
   */
  userIdentifier: string;

  /**
   * The list of users that the invoice is shared with.
   * It is a list of GUIDv4 formatted identifier strings.
   * If the list is empty, the invoice is considered private.
   * If the list contains a special GUIDv4 identifier string, the invoice is considered public.
   */
  sharedWith: string[];

  /**
   * The invoice scans.
   */
  scans: InvoiceScan[];

  /**
   * The payment information of the invoice.
   */
  paymentInformation: PaymentInformation;

  /**
   * The reference identifier of the merchant that issued the invoice.
   * It is a GUIDv4 formatted identifier string.
   */
  merchantReference: string;

  /**
   * The list of items that are present on the invoice.
   */
  items: Product[];

  /**
   * AI-generated structured recipe suggestions derived from the invoice products.
   */
  possibleRecipes: readonly RecipeSuggestion[];

  /**
   * The standard taxonomy classification for this invoice.
   * @remarks Expected system is ECOICOP v2. Null when the invoice has not been classified.
   */
  classification: StandardClassification | null;

  /**
   * Additional metadata for the invoice.
   */
  additionalMetadata: Record<string, string>;

  /**
   * Receipt type as classified by Document Intelligence.
   * Values: "Itemized", "Meal", "Gas", "Parking", "Hotel", "CreditCard", or empty.
   */
  receiptType: string;

  /**
   * Country or region where the receipt was issued (ISO code).
   */
  countryRegion: string;

  /**
   * Structured tax breakdown extracted from the receipt.
   * Supplements the flat totalTaxAmount with granular per-tax-line detail.
   */
  taxDetails: TaxDetail[];

  /**
   * Payment methods and amounts used to settle the transaction.
   * Supports split payments (e.g., partial cash + card).
   */
  payments: PaymentDetail[];
}

/**
 * Reserved metadata keys with special semantic meaning.
 *
 * @remarks
 * These keys trigger specific backend behaviors:
 * - `isImportant`: Flags invoice for priority in UI and prevents auto-archiving
 * - `requiresAnalysis`: Queues invoice for AI analysis processing
 *
 * @internal
 */
type SpecialMetadataKeys = "isImportant" | "requiresAnalysis";

/**
 * DTO payload for creating a new invoice via the API.
 *
 * @remarks
 * **Required Fields:**
 * - `userIdentifier`: The authenticated user's ID (from Clerk)
 * - `initialScan`: At least one document scan to process
 *
 * **Metadata Handling:**
 * The `additionalMetadata` field accepts both reserved keys (`SpecialMetadataKeys`)
 * and arbitrary string keys for extensibility. Reserved keys trigger
 * special backend behaviors.
 *
 * **Validation:**
 * - `userIdentifier` must be a valid Clerk user ID
 * - `initialScan.location` must be a valid Azure Blob Storage URL
 * - Scan type must match the actual file format
 *
 * @example
 * ```typescript
 * const payload: CreateInvoiceDtoPayload = {
 *   userIdentifier: "user_abc123",
 *   initialScan: {
 *     type: InvoiceScanType.JPEG,
 *     location: "https://cdn.arolariu.ro/uploads/receipt.jpg",
 *     metadata: {}
 *   },
 *   additionalMetadata: {
 *     isImportant: "true",
 *     requiresAnalysis: "true",
 *     source: "mobile-app"
 *   }
 * };
 *
 * const response = await fetch("/api/invoices", {
 *   method: "POST",
 *   body: JSON.stringify(payload)
 * });
 * ```
 *
 * @see {@link Invoice} for the created entity structure
 * @see {@link InvoiceScan} for scan details
 */
export type CreateInvoiceDtoPayload = {
  /** The user identifier associated with the invoice. */
  readonly userIdentifier: string;
  /** The initial scan associated with the invoice. */
  readonly initialScan: InvoiceScan;
  /** Additional metadata associated with the invoice. */
  // eslint-disable-next-line sonarjs/no-useless-intersection -- we want to allow extensibility.
  readonly additionalMetadata: Record<SpecialMetadataKeys | (string & {}), string>;
};

/**
 * DTO payload for updating an existing invoice via the API.
 *
 * @remarks
 * **Partial Updates:**
 * Only the fields provided will be updated. Omitted fields retain
 * their current values. The `id` and `userIdentifier` are required
 * for authorization and entity lookup.
 *
 * **Authorization:**
 * The `userIdentifier` must match the invoice owner or be in the
 * `sharedWith` list with edit permissions.
 *
 * **Immutable Fields:**
 * - `id`: Cannot be changed after creation
 * - `userIdentifier`: Invoice ownership cannot be transferred
 * - `createdAt`: Audit timestamp is immutable
 *
 * @typeParam T - The type of the invoice identifier. Defaults to `string`.
 *
 * @example
 * ```typescript
 * const updatePayload: UpdateInvoiceDtoPayload = {
 *   id: "invoice-uuid-here",
 *   userIdentifier: "user_abc123",
 *   name: "Updated Invoice Name"
 * };
 * ```
 *
 * @see {@link Invoice} for the full entity structure
 */
export type UpdateInvoiceDtoPayload<T = string> = {
  /** The unique identifier of the invoice. */
  readonly id: T;
  /** The user identifier associated with the invoice. */
  readonly userIdentifier: string;
} & Partial<Omit<Invoice, "id" | "userIdentifier">>;

/**
 * DTO payload for deleting an invoice via the API.
 *
 * @remarks
 * **Soft Delete:**
 * Invoices are soft-deleted by default. The `isDeleted` flag is set
 * to `true` and the invoice is excluded from normal queries. Data
 * is retained for analytics and potential recovery.
 *
 * **Authorization:**
 * Only the invoice owner (`userIdentifier`) can delete an invoice.
 * Shared users cannot delete invoices they don't own.
 *
 * **Cascade Behavior:**
 * Deleting an invoice does NOT delete:
 * - Associated scans (retained for audit trail)
 * - Merchant references (shared across invoices)
 * - User account data
 *
 * @typeParam T - The type of the invoice identifier. Defaults to `string`.
 *
 * @example
 * ```typescript
 * const deletePayload: DeleteInvoiceDtoPayload = {
 *   id: "invoice-uuid-to-delete",
 *   userIdentifier: "user_abc123"
 * };
 *
 * await fetch(`/api/invoices/${deletePayload.id}`, {
 *   method: "DELETE",
 *   body: JSON.stringify(deletePayload)
 * });
 * ```
 *
 * @see {@link Invoice} for the entity being deleted
 */
export type DeleteInvoiceDtoPayload<T = string> = {
  /** The unique identifier of the invoice to be deleted. */
  readonly id: T;
  /** The user identifier associated with the invoice. */
  readonly userIdentifier: string;
};

/**
 * DTO payload for adding a new scan to an existing invoice.
 *
 * @remarks
 * **Use Cases:**
 * - Adding back-side of a two-sided receipt
 * - Uploading higher quality rescan
 * - Attaching supporting documents (warranties, etc.)
 *
 * **Storage:**
 * The `location` should be a pre-signed Azure Blob Storage URL
 * obtained from the upload API endpoint before calling this.
 *
 * **Processing:**
 * New scans automatically trigger OCR processing to extract
 * additional product data and merge with existing invoice items.
 *
 * @example
 * ```typescript
 * const scanPayload: CreateInvoiceScanDtoPayload = {
 *   type: InvoiceScanType.PNG,
 *   location: "https://cdn.arolariu.ro/invoices/user123/scan-002.png",
 *   additionalMetadata: {
 *     pageNumber: "2",
 *     side: "back"
 *   }
 * };
 *
 * await fetch(`/api/invoices/${invoiceId}/scans`, {
 *   method: "POST",
 *   body: JSON.stringify(scanPayload)
 * });
 * ```
 *
 * @see {@link InvoiceScan} for the created scan structure
 * @see {@link InvoiceScanType} for supported formats
 */
export type CreateInvoiceScanDtoPayload = {
  /** The type of the invoice scan. */
  readonly type: InvoiceScanType;
  /** The location (URL or path) of the invoice scan. */
  readonly location: string;
  /** Additional metadata associated with the invoice scan. */
  readonly additionalMetadata: Record<string, string>;
};

/**
 * DTO payload for removing a scan from an invoice.
 *
 * @remarks
 * **Constraints:**
 * An invoice must have at least one scan. Attempting to delete
 * the last remaining scan will result in a validation error.
 *
 * **Storage Cleanup:**
 * The actual blob in Azure Storage is marked for deletion
 * and cleaned up by a background job after a retention period.
 *
 * @example
 * ```typescript
 * const deletePayload: DeleteInvoiceScanDtoPayload = {
 *   id: "scan-uuid-to-delete"
 * };
 *
 * await fetch(`/api/invoices/${invoiceId}/scans/${deletePayload.id}`, {
 *   method: "DELETE"
 * });
 * ```
 *
 * @see {@link InvoiceScan} for the scan entity structure
 */
export type DeleteInvoiceScanDtoPayload = {
  /** The unique identifier of the invoice scan to be deleted. */
  readonly id: string;
};
