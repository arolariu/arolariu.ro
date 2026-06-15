/**
 * @fileoverview Pure selectors for scan upload state.
 * @module app/domains/invoices/upload-scans/_model/selectors
 *
 * @remarks
 * Selectors centralize queue business rules so reducer handlers and React
 * controllers do not duplicate status predicates.
 */

import type {PendingUpload, UploadState} from "../_types";

/**
 * Determines whether the user can remove or rename an upload.
 *
 * @param upload - Pending upload to inspect.
 * @returns `true` when the upload is idle or failed.
 */
export function isRemovableUpload(upload: PendingUpload): boolean {
  return upload.status === "idle" || upload.status === "failed";
}

/**
 * Determines whether an upload can be included in a new batch.
 *
 * @param upload - Pending upload to inspect.
 * @returns `true` when the upload is idle or failed.
 */
export function isUploadableUpload(upload: PendingUpload): boolean {
  return isRemovableUpload(upload);
}

/**
 * Selects uploads that may be removed or renamed by user actions.
 *
 * @param state - Current upload state.
 * @returns Removable uploads in queue order.
 */
export function selectRemovableUploads(state: UploadState): PendingUpload[] {
  return state.pendingUploads.filter(isRemovableUpload);
}

/**
 * Selects uploads eligible for a batch upload.
 *
 * @param state - Current upload state.
 * @returns Idle and failed uploads in queue order.
 */
export function selectUploadableItems(state: UploadState): PendingUpload[] {
  return state.pendingUploads.filter(isUploadableUpload);
}
