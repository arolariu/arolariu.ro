/**
 * @fileoverview Initial state for the scan upload state machine.
 * @module app/domains/invoices/upload-scans/_state/uploadState
 *
 * @remarks
 * This module is intentionally pure. It contains no React, browser, timer,
 * network, or toast behavior so reducer tests can import it safely.
 */

import type {SessionStats, UploadState} from "../_utils/uploadTypes";

/** Initial upload statistics for a route session. */
export const initialSessionStats: SessionStats = {
  totalAdded: 0,
  totalCompleted: 0,
  totalFailed: 0,
};

/** Initial route-scoped upload state. */
export const initialUploadState: UploadState = {
  pendingUploads: [],
  isUploading: false,
  sessionStats: initialSessionStats,
  completedBatch: [],
};
