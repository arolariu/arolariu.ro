/**
 * @fileoverview React-agnostic upload session controller.
 * @module app/domains/invoices/upload-scans/_upload/uploadSession
 *
 * @remarks
 * Owns one batch's orchestration: emits lifecycle events, drives the multiple-file
 * runner, maps per-item results to reducer events, revokes consumed previews, and
 * schedules completed-card removal. It returns translation CODES (not strings) so the
 * React layer performs i18n. No React, timers, toasts, or DOM access live here.
 */

import type {UploadEvent} from "../_model/events";
import type {PendingUpload, ToastCode, UploadOutcome, UploadProgressEvent, UploadRunnerDependencies} from "../_types";
import {uploadPendingScanMultiple} from "./multipleUploadRunner";

/** Injectable multiple-file runner (defaults to the real one; overridden in tests). */
type RunBatch = typeof uploadPendingScanMultiple;

/** Input accepted by {@link runUploadSession}. */
export type UploadSessionInput = Readonly<{
  /** Idle/failed uploads selected for this batch, in queue order. */
  uploads: readonly PendingUpload[];
  /** Network + server-action + file-reading dependencies. */
  dependencies: UploadRunnerDependencies;
  /** Discrete lifecycle event sink (the reducer dispatch). */
  emit: (event: UploadEvent) => void;
  /** Coalesced progress sink (wired to the rAF-batched dispatcher). */
  onProgress: (event: UploadProgressEvent) => void;
  /** Revokes a consumed object-URL preview after a successful upload. */
  revokePreview: (preview: string) => void;
  /** Schedules removal of a completed upload card from the queue. */
  scheduleRemoval: (uploadId: string) => void;
  /** Injectable runner for tests. */
  runBatch?: RunBatch;
}>;

/**
 * Runs one upload batch end-to-end and returns its aggregated outcome.
 *
 * @param input - Session dependencies and sinks.
 * @returns Success/failure counts and translation codes for the caller to toast.
 */
export async function runUploadSession({
  uploads,
  dependencies,
  emit,
  onProgress,
  revokePreview,
  scheduleRemoval,
  runBatch = uploadPendingScanMultiple,
}: UploadSessionInput): Promise<UploadOutcome> {
  emit({type: "scanUpload.batch.requested", occurredAt: Date.now(), source: "batch"});
  emit({type: "scanUpload.batch.started", occurredAt: Date.now(), source: "batch"});

  const batchResult = await runBatch({uploads, dependencies, callbacks: {onProgress}});

  for (const result of batchResult.results) {
    const upload = uploads.find((item) => item.id === result.uploadId);

    if (result.success) {
      if (upload) {
        revokePreview(upload.preview);
        emit({
          type: "scanUpload.item.uploadSucceeded",
          occurredAt: Date.now(),
          source: "runner",
          uploadId: result.uploadId,
          attempt: result.attempts,
          blobUrl: result.blobUrl,
          completion: {id: upload.id, name: upload.name, preview: result.blobUrl},
        });
        scheduleRemoval(upload.id);
      }
    } else {
      emit({
        type: "scanUpload.item.uploadFailed",
        occurredAt: Date.now(),
        source: "runner",
        uploadId: result.uploadId,
        attempt: result.attempts,
        reason: result.reason,
        error: result.error,
      });
    }
  }

  emit({type: "scanUpload.batch.finished", occurredAt: Date.now(), source: "batch"});

  const toasts: ToastCode[] = [];
  if (batchResult.successCount > 0) {
    toasts.push({kind: "success", key: "uploadSucceeded", count: batchResult.successCount});
  }
  if (batchResult.failureCount > 0) {
    toasts.push({kind: "error", key: "uploadFailed", count: batchResult.failureCount});
  }

  return {successCount: batchResult.successCount, failureCount: batchResult.failureCount, toasts};
}
