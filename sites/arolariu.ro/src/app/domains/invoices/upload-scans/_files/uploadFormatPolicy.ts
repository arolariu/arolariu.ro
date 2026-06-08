/**
 * @fileoverview File format policy for scan uploads.
 * @module app/domains/invoices/upload-scans/_files/uploadFormatPolicy
 *
 * @remarks
 * This module is the route-level source of truth for upload intake. It keeps
 * the browser file input accept string, extension checks, MIME checks, and
 * binary `.bin` handling aligned so users do not see one format in the UI and
 * get rejected by validation for the same format.
 */

import {extractFileExtension, isSupportedScanExtension, normalizeScanMimeType} from "../../_utils/mimeTypeUtilities";

/** Maximum accepted upload size in bytes. */
export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Extensions accepted by the upload scans route, in input display order. */
export const ACCEPTED_UPLOAD_EXTENSIONS = ["bin", "pdf", "jpg", "jpeg", "png", "bmp", "heif", "heic", "tif", "tiff"] as const;

/** Accepted upload file extension. */
export type AcceptedUploadExtension = (typeof ACCEPTED_UPLOAD_EXTENSIONS)[number];

/** File input accept attribute value for supported scan upload formats. */
export const UPLOAD_INPUT_ACCEPT = ACCEPTED_UPLOAD_EXTENSIONS.map((extension) => `.${extension}`).join(",");

/** MIME type used by browsers for generic binary data. */
export const BINARY_UPLOAD_MIME_TYPE = "application/octet-stream";

const ACCEPTED_UPLOAD_EXTENSION_SET = new Set<string>(ACCEPTED_UPLOAD_EXTENSIONS);

/**
 * Extracts a normalized extension from an upload file name.
 *
 * @param fileName - Candidate upload file name.
 * @returns Lowercase extension without a leading dot, or `null`.
 */
export function getUploadFileExtension(fileName: string): string | null {
  return extractFileExtension(fileName);
}

/**
 * Checks whether an extension is accepted by the upload route.
 *
 * @param extension - Extension with or without original casing.
 * @returns `true` when the route accepts this extension.
 */
export function isAcceptedUploadExtension(extension: string): boolean {
  return ACCEPTED_UPLOAD_EXTENSION_SET.has(extension.toLowerCase());
}

/**
 * Resolves the MIME type that should be sent through the upload workflow.
 *
 * @param file - Browser file selected, dropped, or pasted by the user.
 * @returns Browser MIME type, or `application/octet-stream` for empty `.bin` files.
 */
export function resolveUploadMimeType(file: File): string {
  const extension = getUploadFileExtension(file.name);
  if (extension === "bin" && file.type.length === 0) {
    return BINARY_UPLOAD_MIME_TYPE;
  }

  return file.type;
}

/**
 * Checks whether a file's MIME type is accepted for its extension.
 *
 * @param file - Candidate upload file.
 * @returns `true` when MIME and extension policy are compatible.
 */
export function isAcceptedUploadMimeType(file: File): boolean {
  const extension = getUploadFileExtension(file.name);
  const mimeType = resolveUploadMimeType(file);

  if (extension === "bin") {
    return mimeType === BINARY_UPLOAD_MIME_TYPE;
  }

  return normalizeScanMimeType(mimeType) !== null;
}

/**
 * Checks whether a file is accepted by extension and MIME policy.
 *
 * @param file - Candidate upload file.
 * @returns `true` when the file can enter the local upload queue.
 */
export function isAcceptedUploadFile(file: File): boolean {
  const extension = getUploadFileExtension(file.name);
  if (extension === null) return false;
  if (!isAcceptedUploadExtension(extension)) return false;

  if (extension === "bin") {
    return isAcceptedUploadMimeType(file);
  }

  return isSupportedScanExtension(extension) && normalizeScanMimeType(resolveUploadMimeType(file)) !== null;
}
