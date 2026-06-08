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

/**
 * Resolves the MIME type that should be sent through the upload workflow.
 *
 * @param file - Browser file selected, dropped, or pasted by the user.
 * @returns Browser MIME type, or `application/octet-stream` for empty `.bin` files.
 */
export function resolveUploadMimeType(file: File): string {
  if (file.name.toLowerCase().endsWith(".bin") && file.type.length === 0) {
    return BINARY_UPLOAD_MIME_TYPE;
  }

  return file.type;
}
