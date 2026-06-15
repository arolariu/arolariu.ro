/**
 * @fileoverview Reducer facade for the event-driven scan upload state machine.
 * @module app/domains/invoices/upload-scans/_model/reducer
 *
 * @remarks
 * The reducer intentionally delegates immediately to named handlers. This keeps
 * lifecycle routing visible while preventing one large switch statement from
 * accumulating business logic.
 */

import type {UploadState} from "../_types";
import type {UploadEvent} from "./events";
import {
  handleBatchFinished,
  handleBatchRequested,
  handleBatchStarted,
  handleCompletedBatchCleared,
  handleCompletedItemHidden,
  handleFilesAccepted,
  handleProgressChanged,
  handleQueueItemRemoved,
  handleQueueItemRenamed,
  handleQueueItemRotated,
  handleRemovableItemsCleared,
  handleSessionStatsReset,
  handleUploadFailed,
  handleUploadSucceeded,
} from "./handlers";

/**
 * Applies one upload event to route-scoped upload state.
 *
 * @param state - Current upload state.
 * @param event - Namespaced upload lifecycle event.
 * @returns Next upload state.
 */
export function uploadReducer(state: UploadState, event: UploadEvent): UploadState {
  switch (event.type) {
    case "scanUpload.queue.filesAccepted":
      return handleFilesAccepted(state, event);
    case "scanUpload.queue.itemRemoved":
      return handleQueueItemRemoved(state, event);
    case "scanUpload.queue.removableItemsCleared":
      return handleRemovableItemsCleared(state, event);
    case "scanUpload.queue.itemRenamed":
      return handleQueueItemRenamed(state, event);
    case "scanUpload.queue.itemRotated":
      return handleQueueItemRotated(state, event);
    case "scanUpload.batch.requested":
      return handleBatchRequested(state, event);
    case "scanUpload.batch.started":
      return handleBatchStarted(state, event);
    case "scanUpload.batch.finished":
      return handleBatchFinished(state, event);
    case "scanUpload.item.progressChanged":
      return handleProgressChanged(state, event);
    case "scanUpload.item.uploadSucceeded":
      return handleUploadSucceeded(state, event);
    case "scanUpload.item.uploadFailed":
      return handleUploadFailed(state, event);
    case "scanUpload.preview.completedItemHidden":
      return handleCompletedItemHidden(state, event);
    case "scanUpload.prompt.completedBatchCleared":
      return handleCompletedBatchCleared(state, event);
    case "scanUpload.session.statsReset":
      return handleSessionStatsReset(state, event);
  }
}
