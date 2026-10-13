/**
 * @fileoverview Canonical metadata domain for scan blobs.
 * @module types/scans/ScanMetadata
 */

/** Canonical blob metadata keys used by scan storage projections. */
const scanMetadataKeys = {
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

export {scanMetadataKeys as ScanMetadataKey};
export type ScanMetadataKey = (typeof scanMetadataKeys)[keyof typeof scanMetadataKeys];

/** Lifecycle states that may be persisted as blob metadata. */
const scanMetadataStatuses = {
  READY: "ready",
  ATTACHED: "attached",
  DETACHED: "detached",
  ARCHIVED: "archived",
  FAILED: "failed",
} as const;

export {scanMetadataStatuses as ScanMetadataStatus};
export type ScanMetadataStatus = (typeof scanMetadataStatuses)[keyof typeof scanMetadataStatuses];

/** User-facing document kind classification. */
const scanDocumentKinds = {
  RECEIPT: "receipt",
  INVOICE: "invoice",
  WARRANTY: "warranty",
  SUPPORTING_DOCUMENT: "supporting-document",
  UNKNOWN: "unknown",
} as const;

export {scanDocumentKinds as ScanDocumentKind};
export type ScanDocumentKind = (typeof scanDocumentKinds)[keyof typeof scanDocumentKinds];

/** Role of a scan in an invoice/document context. */
const scanDocumentRoles = {
  PRIMARY: "primary",
  ADDITIONAL_PAGE: "additional-page",
  FRONT_SIDE: "front-side",
  BACK_SIDE: "back-side",
  SUPPLEMENT: "supplement",
  UNKNOWN: "unknown",
} as const;

export {scanDocumentRoles as ScanDocumentRole};
export type ScanDocumentRole = (typeof scanDocumentRoles)[keyof typeof scanDocumentRoles];

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
