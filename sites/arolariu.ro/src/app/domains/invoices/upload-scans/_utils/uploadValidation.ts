/**
 * @fileoverview File validation helpers for the scan upload route.
 * @module app/domains/invoices/upload-scans/_utils/uploadValidation
 *
 * @remarks
 * These helpers are shared by the context and browser event handlers so input,
 * drag/drop, and paste paths enforce identical upload constraints.
 */

import {
  ACCEPTED_UPLOAD_FILE_EXTENSIONS,
  ACCEPTED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_FILE_SIZE_BYTES,
  type UploadBatchValidationResult,
  type UploadValidationResult,
} from "./uploadTypes";

/**
 * Extracts a lowercase extension from a file name.
 *
 * @param fileName - Name reported by the browser for the candidate file.
 * @returns The extension without the dot, or `null` when no usable extension exists.
 */
function getFileExtension(fileName: string): string | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension && extension.length > 0 ? extension : null;
}

/**
 * Validates a single candidate scan upload file.
 *
 * @param file - Browser `File` selected, dropped, or pasted by the user.
 * @returns A typed validation result with a user-facing error message on failure.
 */
export function validateUploadFile(file: File): UploadValidationResult {
  if (!ACCEPTED_UPLOAD_MIME_TYPES.has(file.type)) {
    return {
      isValid: false,
      file,
      reason: "unsupported-type",
      message: `Unsupported file type: ${file.type || "unknown"}`,
    };
  }

  const extension = getFileExtension(file.name);
  if (extension === null || !ACCEPTED_UPLOAD_FILE_EXTENSIONS.has(extension)) {
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
 * @returns Split valid files and invalid validation results.
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
 * Extracts files from a `DataTransferItemList`.
 *
 * @param items - Drag/drop or clipboard transfer items.
 * @returns File objects present in the transfer list; non-file items are ignored.
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
