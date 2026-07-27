/**
 * @fileoverview Status → presentation descriptor for pending upload cards.
 * @module app/domains/invoices/upload-scans/_components/statusDescriptors
 *
 * @remarks
 * Centralizes the per-status display rules (badge label key, lock, progress, and
 * center overlay) so `UploadPreview` stops repeating status ternaries.
 */

import type {PendingUploadStatus} from "../_types";

/** Presentation descriptor for one pending upload status. */
export type UploadStatusDescriptor = Readonly<{
  /** Key under `pages.invoices.uploadScans.preview.status`. */
  badgeStatusKey: "pending" | "uploading" | "retrying" | "completed" | "failed";
  /** Whether the card blocks remove/rename/rotate. */
  isLocked: boolean;
  /** Whether to render the progress bar. */
  showProgress: boolean;
  /** Center overlay to render, or `null` for none. */
  overlay: "spinner" | "success" | "error" | null;
}>;

const DESCRIPTORS: Record<PendingUploadStatus, UploadStatusDescriptor> = {
  idle: {badgeStatusKey: "pending", isLocked: false, showProgress: false, overlay: null},
  uploading: {badgeStatusKey: "uploading", isLocked: true, showProgress: true, overlay: "spinner"},
  retrying: {badgeStatusKey: "retrying", isLocked: true, showProgress: true, overlay: "spinner"},
  completed: {badgeStatusKey: "completed", isLocked: true, showProgress: false, overlay: "success"},
  failed: {badgeStatusKey: "failed", isLocked: false, showProgress: false, overlay: "error"},
};

/**
 * Returns the presentation descriptor for a pending upload status.
 *
 * @param status - Current pending upload status.
 * @returns Stable descriptor used by the preview card.
 */
export function describeUploadStatus(status: PendingUploadStatus): UploadStatusDescriptor {
  return DESCRIPTORS[status];
}
