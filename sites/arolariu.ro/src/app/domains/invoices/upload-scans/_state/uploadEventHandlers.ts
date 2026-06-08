/**
 * @fileoverview Pure event handlers for the scan upload reducer facade.
 * @module app/domains/invoices/upload-scans/_state/uploadEventHandlers
 *
 * @remarks
 * Each handler owns one small state transition. Handlers must stay pure:
 * no timers, toasts, network calls, object URL revocation, or clock reads.
 */

import type {PendingUpload, UploadState} from "../_utils/uploadTypes";
import type {UploadEvent} from "./uploadEvents";
import {isRemovableUpload} from "./uploadSelectors";
import {initialSessionStats} from "./uploadState";

/** Extracts one upload event shape by event type. */
type EventOf<TType extends UploadEvent["type"]> = Extract<UploadEvent, {type: TType}>;

/** State-transition handler for one upload event type. */
type UploadEventHandler<TType extends UploadEvent["type"]> = (state: UploadState, event: EventOf<TType>) => UploadState;

/**
 * Updates one upload while preserving queue order.
 *
 * @param uploads - Current upload queue.
 * @param uploadId - Identifier of the upload to update.
 * @param update - Mapping function for the matched upload.
 * @returns Updated queue.
 */
function updateUpload(uploads: readonly PendingUpload[], uploadId: string, update: (upload: PendingUpload) => PendingUpload): PendingUpload[] {
  return uploads.map((upload) => (upload.id === uploadId ? update(upload) : upload));
}

/**
 * Removes the optional `error` property without assigning `undefined`.
 *
 * @param upload - Upload that may contain an error.
 * @returns Upload fields without the optional error property.
 */
function removeError(upload: PendingUpload): Omit<PendingUpload, "error"> {
  const {error: _error, ...uploadWithoutError} = upload;
  return uploadWithoutError;
}

/** Handles accepted files entering the local queue. */
export const handleFilesAccepted: UploadEventHandler<"scanUpload.queue.filesAccepted"> = (state, event) => ({
  ...state,
  pendingUploads: [...state.pendingUploads, ...event.uploads],
  sessionStats: {
    ...state.sessionStats,
    totalAdded: state.sessionStats.totalAdded + event.uploads.length,
  },
});

/** Handles removal requests while keeping active uploads locked. */
export const handleQueueItemRemoved: UploadEventHandler<"scanUpload.queue.itemRemoved"> = (state, event) => {
  const ids = new Set(event.ids);
  return {
    ...state,
    pendingUploads: state.pendingUploads.filter((upload) => !ids.has(upload.id) || !isRemovableUpload(upload)),
  };
};

/** Handles clearing all idle or failed uploads. */
export const handleRemovableItemsCleared: UploadEventHandler<"scanUpload.queue.removableItemsCleared"> = (state) => ({
  ...state,
  pendingUploads: state.pendingUploads.filter((upload) => !isRemovableUpload(upload)),
});

/** Handles renaming an idle or failed queue item. */
export const handleQueueItemRenamed: UploadEventHandler<"scanUpload.queue.itemRenamed"> = (state, event) => ({
  ...state,
  pendingUploads: updateUpload(state.pendingUploads, event.id, (upload) => (isRemovableUpload(upload) ? {...upload, name: event.name} : upload)),
});

/** Handles a user request to start a new batch. */
export const handleBatchRequested: UploadEventHandler<"scanUpload.batch.requested"> = (state) => ({
  ...state,
  completedBatch: [],
});

/** Handles the batch entering its uploading state. */
export const handleBatchStarted: UploadEventHandler<"scanUpload.batch.started"> = (state) => ({
  ...state,
  isUploading: true,
});

/** Handles a batch finishing all item work. */
export const handleBatchFinished: UploadEventHandler<"scanUpload.batch.finished"> = (state) => ({
  ...state,
  isUploading: false,
});

/** Handles the first upload attempt for an item. */
export const handleAttemptStarted: UploadEventHandler<"scanUpload.item.attemptStarted"> = (state, event) => ({
  ...state,
  pendingUploads: updateUpload(state.pendingUploads, event.uploadId, (upload) => ({
    ...upload,
    status: "uploading",
    progress: 0,
    attempts: event.attempt,
  })),
});

/** Handles a retry attempt for an item. */
export const handleRetryStarted: UploadEventHandler<"scanUpload.item.retryStarted"> = (state, event) => ({
  ...state,
  pendingUploads: updateUpload(state.pendingUploads, event.uploadId, (upload) => ({
    ...upload,
    status: "retrying",
    progress: 0,
    attempts: event.attempt,
  })),
});

/** Handles progress updates emitted by the upload runner. */
export const handleProgressChanged: UploadEventHandler<"scanUpload.item.progressChanged"> = (state, event) => ({
  ...state,
  pendingUploads: updateUpload(state.pendingUploads, event.uploadId, (upload) => ({
    ...upload,
    status: event.status,
    progress: Math.max(0, Math.min(event.progress, 100)),
    attempts: event.attempt,
    ...(event.error === undefined ? {} : {error: event.error}),
    ...(event.blobUrl === undefined ? {} : {blobUrl: event.blobUrl}),
  })),
});

/** Handles a successful item upload. */
export const handleUploadSucceeded: UploadEventHandler<"scanUpload.item.uploadSucceeded"> = (state, event) => ({
  ...state,
  pendingUploads: updateUpload(state.pendingUploads, event.uploadId, (upload) => ({
    ...removeError(upload),
    file: null,
    preview: "",
    status: "completed",
    progress: 100,
    attempts: event.attempt,
    blobUrl: event.blobUrl,
  })),
  completedBatch: [...state.completedBatch, event.completion],
  sessionStats: {
    ...state.sessionStats,
    totalCompleted: state.sessionStats.totalCompleted + 1,
  },
});

/** Handles a terminal item upload failure. */
export const handleUploadFailed: UploadEventHandler<"scanUpload.item.uploadFailed"> = (state, event) => ({
  ...state,
  pendingUploads: updateUpload(state.pendingUploads, event.uploadId, (upload) => ({
    ...upload,
    status: "failed",
    progress: 0,
    attempts: event.attempt,
    error: event.error,
  })),
  sessionStats: {
    ...state.sessionStats,
    totalFailed: state.sessionStats.totalFailed + 1,
  },
});

/** Handles hiding a completed upload card after its display delay. */
export const handleCompletedItemHidden: UploadEventHandler<"scanUpload.preview.completedItemHidden"> = (state, event) => ({
  ...state,
  pendingUploads: state.pendingUploads.filter((upload) => upload.id !== event.uploadId),
});

/** Handles clearing the completed batch consumed by the post-upload prompt. */
export const handleCompletedBatchCleared: UploadEventHandler<"scanUpload.prompt.completedBatchCleared"> = (state) => ({
  ...state,
  completedBatch: [],
});

/** Handles resetting route-session counters. */
export const handleSessionStatsReset: UploadEventHandler<"scanUpload.session.statsReset"> = (state) => ({
  ...state,
  sessionStats: initialSessionStats,
});

/** Handler registry used by tests to enforce complete event coverage. */
export const uploadEventHandlers = {
  "scanUpload.queue.filesAccepted": handleFilesAccepted,
  "scanUpload.queue.itemRemoved": handleQueueItemRemoved,
  "scanUpload.queue.removableItemsCleared": handleRemovableItemsCleared,
  "scanUpload.queue.itemRenamed": handleQueueItemRenamed,
  "scanUpload.batch.requested": handleBatchRequested,
  "scanUpload.batch.started": handleBatchStarted,
  "scanUpload.batch.finished": handleBatchFinished,
  "scanUpload.item.attemptStarted": handleAttemptStarted,
  "scanUpload.item.progressChanged": handleProgressChanged,
  "scanUpload.item.retryStarted": handleRetryStarted,
  "scanUpload.item.uploadSucceeded": handleUploadSucceeded,
  "scanUpload.item.uploadFailed": handleUploadFailed,
  "scanUpload.preview.completedItemHidden": handleCompletedItemHidden,
  "scanUpload.prompt.completedBatchCleared": handleCompletedBatchCleared,
  "scanUpload.session.statsReset": handleSessionStatsReset,
} satisfies {
  readonly [TType in UploadEvent["type"]]: UploadEventHandler<TType>;
};
