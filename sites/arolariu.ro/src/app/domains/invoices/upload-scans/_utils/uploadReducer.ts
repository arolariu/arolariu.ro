/**
 * @fileoverview Pure reducer for the route-scoped scan upload state machine.
 * @module app/domains/invoices/upload-scans/_utils/uploadReducer
 *
 * @remarks
 * The reducer has no side effects. Object URL cleanup, timers, toasts, and
 * network operations remain in the context/provider layer.
 */

import type {PendingUpload, SessionStats, UploadAction, UploadState} from "./uploadTypes";

/** Initial upload statistics for a route session. */
const initialSessionStats: SessionStats = {
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

/**
 * Determines whether an upload may be removed by user actions.
 *
 * @param upload - Upload queue item to inspect.
 * @returns `true` when the upload is idle or failed.
 */
function isRemovable(upload: PendingUpload): boolean {
  return upload.status === "idle" || upload.status === "failed";
}

/**
 * Updates one upload item while preserving queue order.
 *
 * @param uploads - Current upload queue.
 * @param uploadId - Identifier of the upload to update.
 * @param update - Mapping function for the matching upload.
 * @returns Updated upload queue.
 */
function updateUpload(uploads: PendingUpload[], uploadId: string, update: (upload: PendingUpload) => PendingUpload): PendingUpload[] {
  return uploads.map((upload) => (upload.id === uploadId ? update(upload) : upload));
}

/**
 * Selects uploads that can be started by the next batch.
 *
 * @param state - Current upload state.
 * @returns Idle and failed uploads, preserving queue order.
 */
export function selectUploadableItems(state: UploadState): PendingUpload[] {
  return state.pendingUploads.filter((upload) => upload.status === "idle" || upload.status === "failed");
}

/**
 * Applies one upload state-machine action.
 *
 * @param state - Current upload state.
 * @param action - State transition action.
 * @returns Next upload state.
 */
export function uploadReducer(state: UploadState, action: UploadAction): UploadState {
  switch (action.type) {
    case "uploads-added":
      return {
        ...state,
        pendingUploads: [...state.pendingUploads, ...action.uploads],
        sessionStats: {
          ...state.sessionStats,
          totalAdded: state.sessionStats.totalAdded + action.uploads.length,
        },
      };

    case "uploads-removed": {
      const ids = new Set(action.ids);
      return {
        ...state,
        pendingUploads: state.pendingUploads.filter((upload) => !ids.has(upload.id) || !isRemovable(upload)),
      };
    }

    case "uploads-cleared":
      return {
        ...state,
        pendingUploads: state.pendingUploads.filter((upload) => !isRemovable(upload)),
      };

    case "upload-renamed":
      return {
        ...state,
        pendingUploads: updateUpload(state.pendingUploads, action.id, (upload) =>
          isRemovable(upload) ? {...upload, name: action.name} : upload,
        ),
      };

    case "batch-started":
      return {...state, isUploading: true, completedBatch: []};

    case "batch-finished":
      return {...state, isUploading: false};

    case "upload-progressed":
      return {
        ...state,
        pendingUploads: updateUpload(state.pendingUploads, action.id, (upload) => ({
          ...upload,
          status: action.status,
          progress: action.progress,
          attempts: action.attempts,
          ...(action.error === undefined ? {} : {error: action.error}),
          ...(action.blobUrl === undefined ? {} : {blobUrl: action.blobUrl}),
        })),
      };

    case "upload-completed":
      return {
        ...state,
        pendingUploads: updateUpload(state.pendingUploads, action.id, (upload) => {
          const {error: _error, ...uploadWithoutError} = upload;
          return {
            ...uploadWithoutError,
            file: null,
            preview: "",
            status: "completed",
            progress: 100,
            attempts: action.attempts,
            blobUrl: action.blobUrl,
          };
        }),
        completedBatch: [
          ...state.completedBatch,
          ...state.pendingUploads
            .filter((upload) => upload.id === action.id)
            .map((upload) => ({
              id: upload.id,
              name: upload.name,
              preview: action.blobUrl || upload.preview,
            })),
        ],
        sessionStats: {
          ...state.sessionStats,
          totalCompleted: state.sessionStats.totalCompleted + 1,
        },
      };

    case "upload-failed":
      return {
        ...state,
        pendingUploads: updateUpload(state.pendingUploads, action.id, (upload) => ({
          ...upload,
          status: "failed",
          progress: 0,
          attempts: action.attempts,
          error: action.error,
        })),
        sessionStats: {
          ...state.sessionStats,
          totalFailed: state.sessionStats.totalFailed + 1,
        },
      };

    case "upload-removed-after-completion":
      return {
        ...state,
        pendingUploads: state.pendingUploads.filter((upload) => upload.id !== action.id),
      };

    case "session-stats-reset":
      return {...state, sessionStats: initialSessionStats};

    case "completed-batch-cleared":
      return {...state, completedBatch: []};
  }
}
