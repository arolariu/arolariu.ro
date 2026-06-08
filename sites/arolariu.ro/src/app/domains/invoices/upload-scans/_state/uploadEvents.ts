/**
 * @fileoverview Event contracts for the scan upload state machine.
 * @module app/domains/invoices/upload-scans/_state/uploadEvents
 *
 * @remarks
 * The upload route uses namespaced lifecycle events so queue, batch, item,
 * preview, prompt, and session transitions are easy to search and reason
 * about. Events are intentionally rich: handlers receive all data needed for a
 * pure state transition instead of looking up side-effect state.
 */

import type {PendingUpload, PendingUploadStatus, UploadCompletionSummary, UploadFailureReason} from "../_utils/uploadTypes";

/**
 * Complete event type inventory handled by the upload reducer facade.
 *
 * @remarks
 * Tests assert every entry has a registered handler. Add new values here only
 * when they describe a distinct state transition.
 */
export const ALL_SCAN_UPLOAD_EVENT_TYPES = [
  "scanUpload.queue.filesAccepted",
  "scanUpload.queue.itemRemoved",
  "scanUpload.queue.removableItemsCleared",
  "scanUpload.queue.itemRenamed",
  "scanUpload.batch.requested",
  "scanUpload.batch.started",
  "scanUpload.batch.finished",
  "scanUpload.item.attemptStarted",
  "scanUpload.item.progressChanged",
  "scanUpload.item.retryStarted",
  "scanUpload.item.uploadSucceeded",
  "scanUpload.item.uploadFailed",
  "scanUpload.preview.completedItemHidden",
  "scanUpload.prompt.completedBatchCleared",
  "scanUpload.session.statsReset",
] as const;

/** Namespaced upload event type string. */
export type ScanUploadEventType = (typeof ALL_SCAN_UPLOAD_EVENT_TYPES)[number];

/** Origin that produced an upload event, useful for debugging and tests. */
export type ScanUploadEventSource = "input" | "drop" | "paste" | "batch" | "runner" | "timer" | "test";

/**
 * Metadata shared by every scan upload event.
 *
 * @template TType - Concrete event type.
 */
type UploadEventBase<TType extends ScanUploadEventType> = Readonly<{
  /** Namespaced lifecycle event type. */
  type: TType;
  /** Millisecond timestamp supplied by the dispatcher. */
  occurredAt: number;
  /** Source responsible for dispatching this event. */
  source: ScanUploadEventSource;
}>;

/** Rich discriminated union of every reducer-handled upload event. */
export type UploadEvent =
  | (UploadEventBase<"scanUpload.queue.filesAccepted"> &
      Readonly<{
        /** Prepared pending uploads accepted into the queue. */
        uploads: readonly PendingUpload[];
      }>)
  | (UploadEventBase<"scanUpload.queue.itemRemoved"> &
      Readonly<{
        /** Queue item identifiers requested for removal. */
        ids: readonly string[];
      }>)
  | UploadEventBase<"scanUpload.queue.removableItemsCleared">
  | (UploadEventBase<"scanUpload.queue.itemRenamed"> &
      Readonly<{
        /** Queue item identifier to rename. */
        id: string;
        /** New display name. */
        name: string;
      }>)
  | UploadEventBase<"scanUpload.batch.requested">
  | UploadEventBase<"scanUpload.batch.started">
  | UploadEventBase<"scanUpload.batch.finished">
  | (UploadEventBase<"scanUpload.item.attemptStarted"> &
      Readonly<{
        /** Upload item identifier. */
        uploadId: string;
        /** One-based attempt number. */
        attempt: number;
      }>)
  | (UploadEventBase<"scanUpload.item.progressChanged"> &
      Readonly<{
        /** Upload item identifier. */
        uploadId: string;
        /** Lifecycle status to display while progress changes. */
        status: PendingUploadStatus;
        /** Bounded progress percentage. */
        progress: number;
        /** One-based attempt number. */
        attempt: number;
        /** Optional latest user-visible error. */
        error?: string;
        /** Optional uploaded blob URL. */
        blobUrl?: string;
      }>)
  | (UploadEventBase<"scanUpload.item.retryStarted"> &
      Readonly<{
        /** Upload item identifier. */
        uploadId: string;
        /** One-based retry attempt number. */
        attempt: number;
      }>)
  | (UploadEventBase<"scanUpload.item.uploadSucceeded"> &
      Readonly<{
        /** Upload item identifier. */
        uploadId: string;
        /** Successful one-based attempt number. */
        attempt: number;
        /** Final server blob URL. */
        blobUrl: string;
        /** Completion data consumed by the post-upload prompt. */
        completion: UploadCompletionSummary;
      }>)
  | (UploadEventBase<"scanUpload.item.uploadFailed"> &
      Readonly<{
        /** Upload item identifier. */
        uploadId: string;
        /** Final attempted attempt count. */
        attempt: number;
        /** Machine-readable failure category. */
        reason: UploadFailureReason;
        /** User-visible failure message. */
        error: string;
      }>)
  | (UploadEventBase<"scanUpload.preview.completedItemHidden"> &
      Readonly<{
        /** Completed upload item identifier to hide from the queue. */
        uploadId: string;
      }>)
  | UploadEventBase<"scanUpload.prompt.completedBatchCleared">
  | UploadEventBase<"scanUpload.session.statsReset">;
