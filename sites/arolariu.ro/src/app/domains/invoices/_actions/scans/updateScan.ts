"use server";

/**
 * @fileoverview Server action for updating scan blob content and metadata in Azure Storage.
 * @module app/domains/invoices/_actions/scans/updateScan
 *
 * @remarks
 * Handles in-place update of scan blobs using scanId-based lookup with metadata patch semantics.
 * Primary use cases: image transformations (rotation, cropping) and metadata corrections.
 *
 * **Architecture Pattern**: Uses generic storage helpers (resolveBlobObjectByMetadata, updateBlobObject).
 *
 * **Update Semantics**:
 * - **Metadata patch**: Add/remove fields while preserving others
 * - **Content replacement**: Optional full binary content update
 * - **URL stability**: Blob URL remains unchanged (same blob name)
 * - **Lifecycle tracking**: Automatically sets lastModifiedAt and lastModifiedBy
 *
 * @see {@link createScan} - Creates new scans
 * @see {@link deleteScan} - Deletes scans
 * @see {@link fetchScans} - Retrieves user's scans
 */

import {addSpanEvent, logWithTrace, withSpan} from "@/instrumentation.server";
import fetchConfigurationValue from "@/lib/actions/storage/fetchConfig";
import {fetchBFFUserFromAuthService} from "@/lib/actions/user/fetchUser";
import {resolveBlobObjectByMetadata, updateBlobObject} from "@/lib/azure/storageClient";
import {convertBase64ToBlob, type ServerActionResult} from "@/lib/utils.server";
import {revalidatePath} from "next/cache";
import {type Scan, type ScanMetadata, ScanDocumentKind, ScanDocumentRole, ScanMetadataKey, ScanMetadataStatus} from "@/types/scans";
import {isHeicScanMimeType, isSupportedScanMimeType, mimeTypeToScanType} from "../../_utils/mimeTypeUtilities";
import {readBlobMetadata, writeBlobMetadata} from "../../_utils/metadataUtilities";

/**
 * Exact caller-controlled metadata fields for a scan update.
 *
 * Server-owned identity, upload, and lifecycle-audit fields never cross this
 * boundary. Attachment actor and timestamp fields are derived on the server.
 */
type MutableMetadataPatch = Readonly<{
  /** User-visible scan name. */
  readonly displayName?: string;
  /** User-controlled grouping label. */
  readonly collectionName?: string;
  /** Document classification selected by the user. */
  readonly documentKind?: ScanDocumentKind;
  /** Document role selected by the user. */
  readonly documentRole?: ScanDocumentRole;
  /** Lifecycle state requested by the authorized workflow. */
  readonly status?: ScanMetadataStatus;
  /** Invoice identifier associated with an attachment workflow. */
  readonly attachedTo?: string;
}>;

/** Validated outer request accepted by the update action. */
type ValidatedUpdateScanInput = Readonly<{
  scanId: string;
  scanObject?: Readonly<{
    base64Data: string;
    mediaType: string;
  }>;
  metadataAdd?: MutableMetadataPatch;
  metadataRemove: ReadonlyArray<"displayName" | "collectionName" | "attachedTo">;
}>;

/**
 * Response from the scan update operation.
 */
type ServerActionOutputType = ServerActionResult<
  Readonly<{
    /** The updated scan entity */
    scan: Scan;
  }>
>;

const MAXIMUM_METADATA_VALUE_LENGTH = 512;
const MAXIMUM_BASE64_DATA_LENGTH = 14 * 1024 * 1024;
const MUTABLE_METADATA_KEYS = new Set<keyof MutableMetadataPatch>([
  ScanMetadataKey.DISPLAY_NAME,
  ScanMetadataKey.COLLECTION_NAME,
  ScanMetadataKey.DOCUMENT_KIND,
  ScanMetadataKey.DOCUMENT_ROLE,
  ScanMetadataKey.STATUS,
  ScanMetadataKey.ATTACHED_TO,
]);
const DOCUMENT_KIND_VALUES = new Set<string>(Object.values(ScanDocumentKind));
const DOCUMENT_ROLE_VALUES = new Set<string>(Object.values(ScanDocumentRole));
const METADATA_STATUS_VALUES = new Set<string>(Object.values(ScanMetadataStatus));

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasOnlyKnownKeys(value: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isBoundedNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== "" && value.length <= MAXIMUM_METADATA_VALUE_LENGTH;
}

function isRemovableMetadataKey(value: unknown): value is ValidatedUpdateScanInput["metadataRemove"][number] {
  return value === ScanMetadataKey.DISPLAY_NAME || value === ScanMetadataKey.COLLECTION_NAME || value === ScanMetadataKey.ATTACHED_TO;
}

function isMutableMetadataPatch(value: unknown): value is MutableMetadataPatch {
  if (!isRecord(value) || !hasOnlyKnownKeys(value, [...MUTABLE_METADATA_KEYS])) {
    return false;
  }

  const displayName = value[ScanMetadataKey.DISPLAY_NAME];
  const collectionName = value[ScanMetadataKey.COLLECTION_NAME];
  const documentKind = value[ScanMetadataKey.DOCUMENT_KIND];
  const documentRole = value[ScanMetadataKey.DOCUMENT_ROLE];
  const status = value[ScanMetadataKey.STATUS];
  const attachedTo = value[ScanMetadataKey.ATTACHED_TO];

  return (
    (displayName === undefined || isBoundedNonBlankString(displayName))
    && (collectionName === undefined || isBoundedNonBlankString(collectionName))
    && (documentKind === undefined || (typeof documentKind === "string" && DOCUMENT_KIND_VALUES.has(documentKind)))
    && (documentRole === undefined || (typeof documentRole === "string" && DOCUMENT_ROLE_VALUES.has(documentRole)))
    && (status === undefined || (typeof status === "string" && METADATA_STATUS_VALUES.has(status)))
    && (attachedTo === undefined || isBoundedNonBlankString(attachedTo))
  );
}

function isMetadataRemovalList(value: unknown): value is ValidatedUpdateScanInput["metadataRemove"] {
  return Array.isArray(value) && value.every(isRemovableMetadataKey) && new Set(value).size === value.length;
}

function isScanObject(value: unknown): value is ValidatedUpdateScanInput["scanObject"] {
  return (
    isRecord(value)
    && Object.keys(value).length === 2
    && Object.hasOwn(value, "base64Data")
    && Object.hasOwn(value, "mediaType")
    && typeof value["base64Data"] === "string"
    && value["base64Data"].length > 0
    && value["base64Data"].length <= MAXIMUM_BASE64_DATA_LENGTH
    && typeof value["mediaType"] === "string"
    && !isHeicScanMimeType(value["mediaType"])
    && isSupportedScanMimeType(value["mediaType"])
  );
}

function isUpdateScanInput(value: unknown): value is ValidatedUpdateScanInput {
  return (
    isRecord(value)
    && hasOnlyKnownKeys(value, ["scanId", "scanObject", "metadataAdd", "metadataRemove"])
    && isBoundedNonBlankString(value["scanId"])
    && (!Object.hasOwn(value, "scanObject") || isScanObject(value["scanObject"]))
    && (!Object.hasOwn(value, "metadataAdd") || isMutableMetadataPatch(value["metadataAdd"]))
    && (!Object.hasOwn(value, "metadataRemove") || isMetadataRemovalList(value["metadataRemove"]))
  );
}

function includesRemoval(
  metadataRemove: ValidatedUpdateScanInput["metadataRemove"],
  key: ValidatedUpdateScanInput["metadataRemove"][number],
): boolean {
  return metadataRemove.includes(key);
}

/**
 * Merges validated caller metadata while writing immutable fields last.
 *
 * @param currentMetadata - Metadata read from the blob before mutation.
 * @param patch - Exact mutable patch from the caller.
 * @param metadataRemove - Validated optional metadata removals.
 * @param userIdentifier - Authenticated actor for server-owned audit fields.
 * @returns Complete metadata ready for provider serialization.
 */
function resolveOptionalMetadataValue(
  currentValue: string | undefined,
  patchedValue: string | undefined,
  metadataRemove: ValidatedUpdateScanInput["metadataRemove"],
  key: ValidatedUpdateScanInput["metadataRemove"][number],
): string | undefined {
  if (patchedValue !== undefined) {
    return patchedValue;
  }

  return includesRemoval(metadataRemove, key) ? undefined : currentValue;
}

function createFinalMetadata(
  currentMetadata: ScanMetadata,
  patch: MutableMetadataPatch | undefined,
  metadataRemove: ValidatedUpdateScanInput["metadataRemove"],
  userIdentifier: string,
): ScanMetadata {
  const status = patch?.status ?? currentMetadata.status;
  const now = new Date();
  const isAttached = status === ScanMetadataStatus.ATTACHED;
  const displayName = resolveOptionalMetadataValue(
    currentMetadata.displayName,
    patch?.displayName,
    metadataRemove,
    ScanMetadataKey.DISPLAY_NAME,
  );
  const collectionName = resolveOptionalMetadataValue(
    currentMetadata.collectionName,
    patch?.collectionName,
    metadataRemove,
    ScanMetadataKey.COLLECTION_NAME,
  );
  const attachedTo = resolveOptionalMetadataValue(
    currentMetadata.attachedTo,
    patch?.attachedTo,
    metadataRemove,
    ScanMetadataKey.ATTACHED_TO,
  );

  return {
    ...(displayName ? {displayName} : {}),
    ...(collectionName ? {collectionName} : {}),
    documentKind: patch?.documentKind ?? currentMetadata.documentKind,
    documentRole: patch?.documentRole ?? currentMetadata.documentRole,
    status,
    ...(isAttached && attachedTo ? {attachedTo} : {}),
    ...(isAttached ? {attachedAt: currentMetadata.attachedAt ?? now, attachedBy: currentMetadata.attachedBy ?? userIdentifier} : {}),
    // Server-owned metadata is written last so no caller patch can overwrite it.
    scanId: currentMetadata.scanId,
    ownerId: currentMetadata.ownerId,
    uploadedAt: currentMetadata.uploadedAt,
    uploadedBy: currentMetadata.uploadedBy,
    lastModifiedAt: now,
    lastModifiedBy: userIdentifier,
  };
}

/**
 * Updates scan blob content and/or metadata by scanId.
 *
 * @param input - Update parameters with scanId, optional content, and metadata patch
 * @returns A result object containing the updated scan entity on success
 */
export async function updateScan(input: unknown): ServerActionOutputType {
  return withSpan("api.actions.scans.updateScan", async () => {
    if (!isUpdateScanInput(input)) {
      addSpanEvent("scan.update.rejected", {errorCode: "VALIDATION_ERROR"});
      logWithTrace("warn", "scan.update.rejected", {errorCode: "VALIDATION_ERROR"}, "server");
      return {success: false, error: {code: "VALIDATION_ERROR", message: "Scan update request is invalid."}};
    }

    const {scanId, scanObject, metadataAdd} = input;
    const metadataRemove = input.metadataRemove ?? [];
    try {
      // Step 1. Fetch user from auth service
      addSpanEvent("bff.user.fetch.start");
      logWithTrace("info", "scan.update.start", undefined, "server");
      const {userIdentifier} = await fetchBFFUserFromAuthService();
      addSpanEvent("bff.user.fetch.complete");

      // Step 2. Prepare for blob update
      const containerName = "invoices";
      const storageEndpoint = await fetchConfigurationValue("Endpoints:Storage:Blob");

      // Step 3. Resolve scanId to blob by metadata
      addSpanEvent("azure.blob.resolve.start");
      const prefix = `scans/${userIdentifier}/`;
      const blobObject = await resolveBlobObjectByMetadata({
        storageEndpoint,
        containerName,
        prefix,
        predicate: (blob) => {
          try {
            const metadata = readBlobMetadata(blob.metadata);
            return metadata.scanId === scanId;
          } catch {
            return false;
          }
        },
      });
      addSpanEvent("azure.blob.resolve.complete");

      if (!blobObject) {
        addSpanEvent("scan.not.found");
        logWithTrace("warn", "scan.update.not-found", {errorCode: "NOT_FOUND"}, "server");
        return {success: false, error: {code: "NOT_FOUND", message: "Scan not found."}};
      }

      // Step 4. Parse and validate current metadata
      const currentMetadata = readBlobMetadata(blobObject.metadata);

      if (currentMetadata.ownerId !== userIdentifier) {
        addSpanEvent("authorization.failed");
        logWithTrace("warn", "scan.update.unauthorized", {errorCode: "AUTH_ERROR"}, "server");
        return {success: false, error: {code: "AUTH_ERROR", message: "You are not authorized to update this scan."}};
      }

      // Step 5. Apply metadata patch
      const finalMetadata = createFinalMetadata(currentMetadata, metadataAdd, metadataRemove, userIdentifier);

      const updatedBlobMetadata = writeBlobMetadata(finalMetadata);

      // Step 6. Update blob content and/or metadata
      addSpanEvent("azure.blob.update.start");
      logWithTrace("info", "scan.update.storage.start", undefined, "server");

      const contentType = scanObject?.mediaType;
      const content: Uint8Array | undefined = await (async () => {
        if (!scanObject) {
          return;
        }
        const blob = await convertBase64ToBlob(scanObject.base64Data);
        const buffer = await blob.arrayBuffer();
        return new Uint8Array(buffer);
      })();

      const updatedBlob = await updateBlobObject({
        storageEndpoint,
        containerName,
        blobName: blobObject.name,
        content,
        contentType,
        metadata: updatedBlobMetadata,
        etag: blobObject.etag,
      });
      addSpanEvent("azure.blob.update.complete");

      logWithTrace("info", "scan.update.complete", undefined, "server");
      revalidatePath("/domains/invoices/view-scans", "page");

      // Step 7. Construct and return updated Scan entity
      const scan: Scan = {
        id: finalMetadata.scanId,
        userIdentifier: finalMetadata.ownerId,
        name: finalMetadata.displayName ?? blobObject.name.split("/").pop() ?? "Unknown",
        blobUrl: updatedBlob.url,
        mimeType: updatedBlob.contentType,
        sizeInBytes: updatedBlob.contentLength,
        scanType: mimeTypeToScanType(updatedBlob.contentType),
        uploadedAt: finalMetadata.uploadedAt,
        status: finalMetadata.status,
        metadata: finalMetadata,
      };

      return {
        success: true,
        data: {scan},
      } as const;
    } catch {
      addSpanEvent("scan.update.error");
      logWithTrace("error", "scan.update.failed", {errorCode: "NETWORK_ERROR"}, "server");
      return {success: false, error: {code: "NETWORK_ERROR", message: "Unable to update the scan. Please try again."}};
    }
  }) satisfies ServerActionOutputType;
}
