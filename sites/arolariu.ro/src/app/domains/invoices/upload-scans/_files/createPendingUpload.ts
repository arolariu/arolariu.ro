/**
 * @fileoverview Pending upload factory for scan upload files.
 * @module app/domains/invoices/upload-scans/_files/createPendingUpload
 *
 * @remarks
 * The factory is the only file-intake helper that creates object URLs. Cleanup
 * remains the responsibility of the provider lifecycle hook.
 */

import type {PendingUpload} from "../_utils/uploadTypes";
import {resolveUploadMimeType} from "./uploadFormatPolicy";

/**
 * Creates a route-scoped pending upload from a validated file.
 *
 * @param file - Validated browser file.
 * @param uploadId - Client-side queue identifier.
 * @returns Pending upload ready to enter reducer state.
 */
export function createPendingUpload(file: File, uploadId: string): PendingUpload {
  return {
    id: uploadId,
    name: file.name,
    file,
    mimeType: resolveUploadMimeType(file),
    size: file.size,
    preview: URL.createObjectURL(file),
    status: "idle",
    progress: 0,
    attempts: 0,
  };
}
