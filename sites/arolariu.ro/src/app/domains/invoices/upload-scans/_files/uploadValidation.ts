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
  ACCEPTED_UPLOAD_EXTENSIONS,
  BINARY_UPLOAD_MIME_TYPE,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  resolveUploadMimeType,
} from "./uploadFormatPolicy";
import {extractFileExtension, normalizeScanMimeType} from "../../_utils/mimeTypeUtilities";

const ACCEPTED_UPLOAD_EXTENSION_SET = new Set<string>(ACCEPTED_UPLOAD_EXTENSIONS);

/**
 * Extracts a normalized extension from an upload file name.
 *
 * @param fileName - Candidate upload file name.
 * @returns Lowercase extension without a leading dot, or `null`.
 */
function getUploadFileExtension(fileName: string): string | null {
  return extractFileExtension(fileName);
}

/**
 * Checks whether an extension is accepted by the upload route.
 *
 * @param extension - Extension with or without original casing.
 * @returns `true` when the route accepts this extension.
 */
function isAcceptedUploadExtension(extension: string): boolean {
  return ACCEPTED_UPLOAD_EXTENSION_SET.has(extension.toLowerCase());
}

/**
 * Checks whether a file's MIME type is accepted for its extension.
 *
 * @param file - Candidate upload file.
 * @returns `true` when MIME and extension policy are compatible.
 */
function isAcceptedUploadMimeType(file: File): boolean {
  const extension = getUploadFileExtension(file.name);
  const mimeType = resolveUploadMimeType(file);

  if (extension === "bin") {
    return mimeType === BINARY_UPLOAD_MIME_TYPE;
  }

  return normalizeScanMimeType(mimeType) !== null;
}

/**
 * Validates a single candidate scan upload file.
 *
 * @param file - Browser `File` selected, dropped, or pasted by the user.
 * @returns Typed validation result with a user-facing message on failure.
 */
function validateUploadFile(file: File): UploadValidationResult {
  const mimeType = resolveUploadMimeType(file);
  if (!isAcceptedUploadMimeType(file)) {
    return {
      isValid: false,
      file,
      reason: "unsupported-type",
      message: `Unsupported file type: ${mimeType || "unknown"}`,
    };
  }

  const extension = getUploadFileExtension(file.name);
  if (extension === null || !isAcceptedUploadExtension(extension)) {
    return {
      isValid: false,
      file,
      reason: "unsupported-extension",
      message: `Unsupported file extension: ${file.name}`,
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
