/**
 * @fileoverview Scan metadata blob serialization and deserialization utilities.
 * @module app/domains/invoices/_utils/metadataUtilities
 */

import {ScanDocumentKind, ScanDocumentRole, ScanMetadataKey, ScanMetadataStatus} from "@/types/scans";
import type {ScanMetadata} from "@/types/scans";

/**
 * Serializes typed scan metadata into provider-neutral blob metadata.
 *
 * @param metadata - Typed scan metadata.
 * @returns String-only metadata suitable for blob storage providers.
 *
 * @example
 * ```typescript
 * const blobMetadata = writeBlobMetadata(scanMetadata);
 * ```
 */
export function writeBlobMetadata(metadata: ScanMetadata): Record<string, string> {
  const blobMetadata: Record<string, string> = {
    [ScanMetadataKey.SCAN_ID]: metadata.scanId,
    [ScanMetadataKey.OWNER_ID]: metadata.ownerId,
    [ScanMetadataKey.DOCUMENT_KIND]: metadata.documentKind,
    [ScanMetadataKey.DOCUMENT_ROLE]: metadata.documentRole,
    [ScanMetadataKey.STATUS]: metadata.status,
    [ScanMetadataKey.UPLOADED_AT]: metadata.uploadedAt.toISOString(),
    [ScanMetadataKey.UPLOADED_BY]: metadata.uploadedBy,
  };

  const optionalStringValues: ReadonlyArray<readonly [ScanMetadataKey, string | undefined]> = [
    [ScanMetadataKey.DISPLAY_NAME, metadata.displayName],
    [ScanMetadataKey.COLLECTION_NAME, metadata.collectionName],
    [ScanMetadataKey.LAST_MODIFIED_BY, metadata.lastModifiedBy],
    [ScanMetadataKey.ATTACHED_BY, metadata.attachedBy],
    [ScanMetadataKey.ATTACHED_TO, metadata.attachedTo],
    [ScanMetadataKey.DETACHED_BY, metadata.detachedBy],
    [ScanMetadataKey.DETACHED_FROM, metadata.detachedFrom],
    [ScanMetadataKey.ARCHIVED_BY, metadata.archivedBy],
  ];

  for (const [key, value] of optionalStringValues) {
    if (value) {
      blobMetadata[key] = value;
    }
  }

  const optionalDateValues: ReadonlyArray<readonly [ScanMetadataKey, Date | undefined]> = [
    [ScanMetadataKey.LAST_MODIFIED_AT, metadata.lastModifiedAt],
    [ScanMetadataKey.ATTACHED_AT, metadata.attachedAt],
    [ScanMetadataKey.DETACHED_AT, metadata.detachedAt],
    [ScanMetadataKey.ARCHIVED_AT, metadata.archivedAt],
  ];

  for (const [key, value] of optionalDateValues) {
    if (value) {
      blobMetadata[key] = value.toISOString();
    }
  }

  return blobMetadata;
}

/**
 * Parses provider-neutral blob metadata into typed scan metadata.
 *
 * @param metadata - String metadata returned by blob storage.
 * @returns Typed scan metadata.
 * @throws {Error} When required fields are missing or enum/date values are invalid.
 *
 * @example
 * ```typescript
 * const scanMetadata = readBlobMetadata(blob.metadata ?? {});
 * ```
 */
export function readBlobMetadata(metadata: Readonly<Record<string, string | undefined>>): ScanMetadata {
  const scanId = metadata[ScanMetadataKey.SCAN_ID];
  if (!scanId) {
    throw new Error(`Missing required blob metadata: ${ScanMetadataKey.SCAN_ID}`);
  }

  const ownerId = metadata[ScanMetadataKey.OWNER_ID];
  if (!ownerId) {
    throw new Error(`Missing required blob metadata: ${ScanMetadataKey.OWNER_ID}`);
  }

  const documentKindValue = metadata[ScanMetadataKey.DOCUMENT_KIND];
  if (!documentKindValue) {
    throw new Error(`Missing required blob metadata: ${ScanMetadataKey.DOCUMENT_KIND}`);
  }
  if (!Object.values(ScanDocumentKind).includes(documentKindValue as ScanDocumentKind)) {
    throw new Error(`Invalid blob metadata documentKind: ${documentKindValue}`);
  }
  const documentKind = documentKindValue as ScanDocumentKind;

  const documentRoleValue = metadata[ScanMetadataKey.DOCUMENT_ROLE];
  if (!documentRoleValue) {
    throw new Error(`Missing required blob metadata: ${ScanMetadataKey.DOCUMENT_ROLE}`);
  }
  if (!Object.values(ScanDocumentRole).includes(documentRoleValue as ScanDocumentRole)) {
    throw new Error(`Invalid blob metadata documentRole: ${documentRoleValue}`);
  }
  const documentRole = documentRoleValue as ScanDocumentRole;

  const statusValue = metadata[ScanMetadataKey.STATUS];
  if (!statusValue) {
    throw new Error(`Missing required blob metadata: ${ScanMetadataKey.STATUS}`);
  }
  if (!Object.values(ScanMetadataStatus).includes(statusValue as ScanMetadataStatus)) {
    throw new Error(`Invalid blob metadata status: ${statusValue}`);
  }
  const status = statusValue as ScanMetadataStatus;

  const uploadedAtValue = metadata[ScanMetadataKey.UPLOADED_AT];
  if (!uploadedAtValue) {
    throw new Error(`Missing required blob metadata: ${ScanMetadataKey.UPLOADED_AT}`);
  }
  const uploadedAt = new Date(uploadedAtValue);
  if (Number.isNaN(uploadedAt.getTime())) {
    throw new Error(`Invalid blob metadata date: ${ScanMetadataKey.UPLOADED_AT}`);
  }

  const uploadedBy = metadata[ScanMetadataKey.UPLOADED_BY];
  if (!uploadedBy) {
    throw new Error(`Missing required blob metadata: ${ScanMetadataKey.UPLOADED_BY}`);
  }

  const lastModifiedAtValue = metadata[ScanMetadataKey.LAST_MODIFIED_AT];
  const lastModifiedAt = lastModifiedAtValue ? new Date(lastModifiedAtValue) : undefined;
  if (lastModifiedAt && Number.isNaN(lastModifiedAt.getTime())) {
    throw new Error(`Invalid blob metadata date: ${ScanMetadataKey.LAST_MODIFIED_AT}`);
  }

  const attachedAtValue = metadata[ScanMetadataKey.ATTACHED_AT];
  const attachedAt = attachedAtValue ? new Date(attachedAtValue) : undefined;
  if (attachedAt && Number.isNaN(attachedAt.getTime())) {
    throw new Error(`Invalid blob metadata date: ${ScanMetadataKey.ATTACHED_AT}`);
  }

  const detachedAtValue = metadata[ScanMetadataKey.DETACHED_AT];
  const detachedAt = detachedAtValue ? new Date(detachedAtValue) : undefined;
  if (detachedAt && Number.isNaN(detachedAt.getTime())) {
    throw new Error(`Invalid blob metadata date: ${ScanMetadataKey.DETACHED_AT}`);
  }

  const archivedAtValue = metadata[ScanMetadataKey.ARCHIVED_AT];
  const archivedAt = archivedAtValue ? new Date(archivedAtValue) : undefined;
  if (archivedAt && Number.isNaN(archivedAt.getTime())) {
    throw new Error(`Invalid blob metadata date: ${ScanMetadataKey.ARCHIVED_AT}`);
  }

  return {
    scanId,
    ownerId,
    ...(metadata[ScanMetadataKey.DISPLAY_NAME] ? {displayName: metadata[ScanMetadataKey.DISPLAY_NAME]} : {}),
    ...(metadata[ScanMetadataKey.COLLECTION_NAME] ? {collectionName: metadata[ScanMetadataKey.COLLECTION_NAME]} : {}),
    documentKind,
    documentRole,
    status,
    uploadedAt,
    uploadedBy,
    ...(lastModifiedAt ? {lastModifiedAt} : {}),
    ...(metadata[ScanMetadataKey.LAST_MODIFIED_BY] ? {lastModifiedBy: metadata[ScanMetadataKey.LAST_MODIFIED_BY]} : {}),
    ...(attachedAt ? {attachedAt} : {}),
    ...(metadata[ScanMetadataKey.ATTACHED_BY] ? {attachedBy: metadata[ScanMetadataKey.ATTACHED_BY]} : {}),
    ...(metadata[ScanMetadataKey.ATTACHED_TO] ? {attachedTo: metadata[ScanMetadataKey.ATTACHED_TO]} : {}),
    ...(detachedAt ? {detachedAt} : {}),
    ...(metadata[ScanMetadataKey.DETACHED_BY] ? {detachedBy: metadata[ScanMetadataKey.DETACHED_BY]} : {}),
    ...(metadata[ScanMetadataKey.DETACHED_FROM] ? {detachedFrom: metadata[ScanMetadataKey.DETACHED_FROM]} : {}),
    ...(archivedAt ? {archivedAt} : {}),
    ...(metadata[ScanMetadataKey.ARCHIVED_BY] ? {archivedBy: metadata[ScanMetadataKey.ARCHIVED_BY]} : {}),
  };
}
