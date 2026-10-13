/**
 * @fileoverview Scan metadata blob serialization and deserialization utilities.
 * @module app/domains/invoices/_utils/metadataUtilities
 */

import {type ScanMetadata, ScanDocumentKind, ScanDocumentRole, ScanMetadataKey, ScanMetadataStatus} from "@/types/scans";

function readRequiredMetadata(metadata: Readonly<Record<string, string | undefined>>, key: ScanMetadataKey): string {
  const value = metadata[key];
  if (!value) {
    throw new Error(`Missing required blob metadata: ${key}`);
  }
  return value;
}

function readMetadataChoice<T extends string>(
  metadata: Readonly<Record<string, string | undefined>>,
  key: ScanMetadataKey,
  choices: Readonly<Record<string, T>>,
): T {
  const value = readRequiredMetadata(metadata, key);
  const choice = Object.values(choices).find((candidate) => candidate === value);
  if (choice === undefined) {
    throw new Error(`Invalid blob metadata ${key}: ${value}`);
  }
  return choice;
}

function readOptionalMetadataDate(metadata: Readonly<Record<string, string | undefined>>, key: ScanMetadataKey): Date | undefined {
  const value = metadata[key];
  const date = value ? new Date(value) : undefined;
  if (date && Number.isNaN(date.getTime())) {
    throw new Error(`Invalid blob metadata date: ${key}`);
  }
  return date;
}

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
  const scanId = readRequiredMetadata(metadata, ScanMetadataKey.SCAN_ID);
  const ownerId = readRequiredMetadata(metadata, ScanMetadataKey.OWNER_ID);
  const documentKind = readMetadataChoice(metadata, ScanMetadataKey.DOCUMENT_KIND, ScanDocumentKind);
  const documentRole = readMetadataChoice(metadata, ScanMetadataKey.DOCUMENT_ROLE, ScanDocumentRole);
  const status = readMetadataChoice(metadata, ScanMetadataKey.STATUS, ScanMetadataStatus);
  const uploadedAt = new Date(readRequiredMetadata(metadata, ScanMetadataKey.UPLOADED_AT));
  if (Number.isNaN(uploadedAt.getTime())) {
    throw new TypeError(`Invalid blob metadata date: ${ScanMetadataKey.UPLOADED_AT}`);
  }

  const uploadedBy = readRequiredMetadata(metadata, ScanMetadataKey.UPLOADED_BY);
  const lastModifiedAt = readOptionalMetadataDate(metadata, ScanMetadataKey.LAST_MODIFIED_AT);
  const attachedAt = readOptionalMetadataDate(metadata, ScanMetadataKey.ATTACHED_AT);
  const detachedAt = readOptionalMetadataDate(metadata, ScanMetadataKey.DETACHED_AT);
  const archivedAt = readOptionalMetadataDate(metadata, ScanMetadataKey.ARCHIVED_AT);

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
