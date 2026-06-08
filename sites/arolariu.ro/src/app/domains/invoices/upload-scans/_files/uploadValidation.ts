/**
 * @fileoverview File validation helpers for the scan upload route.
 * @module app/domains/invoices/upload-scans/_files/uploadValidation
 *
 * @remarks
 * These helpers are shared by input, drag/drop, and paste handlers so every
 * browser file-intake path enforces the same upload constraints.
 */

import type {UploadBatchValidationResult, UploadValidationResult} from "../_utils/uploadTypes";
import {
  ACCEPTED_SCAN_FILE_EXTENSIONS,
  extractFileExtension,
  getMimeTypeForExtension,
  isSupportedScanExtension,
  normalizeScanMimeType,
} from "../../_utils/mimeTypeUtilities";

/** Maximum accepted upload size in bytes. */
export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** File input accept attribute value derived from scan document extensions. */
export const SCAN_UPLOAD_INPUT_ACCEPT = ACCEPTED_SCAN_FILE_EXTENSIONS.map((extension) => `.${extension}`).join(",");

/**
 * Resolves the canonical scan MIME type for a candidate upload file.
 *
 * @remarks
 * Browser-provided MIME types are preferred when they normalize to a supported
 * scan MIME type. When browsers omit MIME type metadata, the resolver infers a
 * canonical MIME type from supported scan file extensions.
 *
 * @param file - Candidate browser file.
 * @returns Canonical scan MIME type, or an empty string when unsupported.
 */
export function resolveValidatedScanMimeType(file: File): string {
  const extension = extractFileExtension(file.name);
  if (extension === null || !isSupportedScanExtension(extension)) {
    return "";
  }

  const normalizedMimeType = normalizeScanMimeType(file.type);
  if (normalizedMimeType !== null) {
    return normalizedMimeType;
  }

  if (file.type.trim().length > 0) {
    return "";
  }

  return getMimeTypeForExtension(extension) ?? "";
}

/**
 * Validates a single candidate scan upload file.
 *
 * @param file - Browser `File` selected, dropped, or pasted by the user.
 * @returns Typed validation result with a user-facing message on failure.
 */
function validateUploadFile(file: File): UploadValidationResult {
  const extension = extractFileExtension(file.name);
  if (extension === null || !isSupportedScanExtension(extension)) {
    return {
      isValid: false,
      file,
      reason: "unsupported-extension",
      message: `Unsupported file extension: ${file.name}`,
    };
  }

  const mimeType = resolveValidatedScanMimeType(file);
  if (mimeType.length === 0) {
    return {
      isValid: false,
      file,
      reason: "unsupported-type",
      message: `Unsupported file type: ${file.type || "unknown"}`,
    };
  }

  if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      file,
      reason: "file-too-large",
      message: `File too large: ${file.name} (max 10MB)`,
    };
  }

  return {isValid: true, file};
}

/**
 * Validates a batch of candidate scan upload files.
 *
 * @param files - Iterable collection of browser files.
 * @returns Valid files and invalid validation results.
 */
export function validateUploadFiles(files: Iterable<File>): UploadBatchValidationResult {
  const validFiles: File[] = [];
  const invalidFiles: UploadBatchValidationResult["invalidFiles"] = [];

  for (const file of files) {
    const result = validateUploadFile(file);
    if (result.isValid) {
      validFiles.push(result.file);
    } else {
      invalidFiles.push(result);
    }
  }

  return {validFiles, invalidFiles};
}

/**
 * Extracts file objects from a data transfer item list.
 *
 * @param items - Drag/drop or clipboard transfer items.
 * @returns Files present in the transfer list; non-file items are ignored.
 */
export function extractFilesFromDataTransferItems(items: DataTransferItemList): File[] {
  const files: File[] = [];
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item?.kind === "file") {
      const file = item.getAsFile();
      if (file) {
        files.push(file);
      }
    }
  }
  return files;
}
