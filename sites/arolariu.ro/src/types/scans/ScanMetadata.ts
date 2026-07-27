/**
 * @fileoverview Canonical metadata domain for scan blobs.
 * @module types/scans/ScanMetadata
 */

/** Canonical blob metadata keys used by scan storage projections. */
export const ScanMetadataKey = {
  SCAN_ID: "scanId",
  OWNER_ID: "ownerId",
  DISPLAY_NAME: "displayName",
  COLLECTION_NAME: "collectionName",
  DOCUMENT_KIND: "documentKind",
  DOCUMENT_ROLE: "documentRole",
  STATUS: "status",
  UPLOADED_AT: "uploadedAt",
  UPLOADED_BY: "uploadedBy",
  LAST_MODIFIED_AT: "lastModifiedAt",
  LAST_MODIFIED_BY: "lastModifiedBy",
  ATTACHED_AT: "attachedAt",
  ATTACHED_BY: "attachedBy",
  ATTACHED_TO: "attachedTo",
  DETACHED_AT: "detachedAt",
  DETACHED_BY: "detachedBy",
  DETACHED_FROM: "detachedFrom",
  ARCHIVED_AT: "archivedAt",
  ARCHIVED_BY: "archivedBy",
} as const;

export type ScanMetadataKey = (typeof ScanMetadataKey)[keyof typeof ScanMetadataKey];

/** Lifecycle states that may be persisted as blob metadata. */
export const ScanMetadataStatus = {
  READY: "ready",
  ATTACHED: "attached",
  DETACHED: "detached",
  ARCHIVED: "archived",
  FAILED: "failed",
} as const;

export type ScanMetadataStatus = (typeof ScanMetadataStatus)[keyof typeof ScanMetadataStatus];

/** User-facing document kind classification. */
export const ScanDocumentKind = {
  RECEIPT: "receipt",
  INVOICE: "invoice",
  WARRANTY: "warranty",
  SUPPORTING_DOCUMENT: "supporting-document",
  UNKNOWN: "unknown",
} as const;

export type ScanDocumentKind = (typeof ScanDocumentKind)[keyof typeof ScanDocumentKind];

/** Role of a scan in an invoice/document context. */
export const ScanDocumentRole = {
  PRIMARY: "primary",
  ADDITIONAL_PAGE: "additional-page",
  FRONT_SIDE: "front-side",
  BACK_SIDE: "back-side",
  SUPPLEMENT: "supplement",
  UNKNOWN: "unknown",
} as const;

export type ScanDocumentRole = (typeof ScanDocumentRole)[keyof typeof ScanDocumentRole];

/** Canonical typed metadata stored for scan blobs. */
export type ScanMetadata = Readonly<{
  scanId: string;
  ownerId: string;
  displayName?: string;
  collectionName?: string;
  documentKind: ScanDocumentKind;
  documentRole: ScanDocumentRole;
  status: ScanMetadataStatus;
  uploadedAt: Date;
  uploadedBy: string;
  lastModifiedAt?: Date;
  lastModifiedBy?: string;
  attachedAt?: Date;
  attachedBy?: string;
  attachedTo?: string;
  detachedAt?: Date;
  detachedBy?: string;
  detachedFrom?: string;
  archivedAt?: Date;
  archivedBy?: string;
}>;
