/**
 * @fileoverview Shared types and constants for the route-scoped scan upload workflow.
 * @module app/domains/invoices/upload-scans/_utils/uploadTypes
 *
 * @remarks
 * This module intentionally contains no React state. It defines the public
 * contracts used by the upload context, reducer, validation helpers, runner,
 * and presentation components.
 */

import type {Scan, ScanMetadata} from "@/types/scans";

/** Maximum number of scan uploads that may run in parallel. */
export const UPLOAD_CONCURRENCY_LIMIT = 5;

/** Maximum number of attempts for a single scan upload before it is marked failed. */
export const MAX_UPLOAD_ATTEMPTS = 3;

/** Maximum accepted upload size in bytes. */
export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** File input accept attribute value for supported scan upload formats. */
export const ACCEPTED_UPLOAD_EXTENSIONS = ".jpg,.jpeg,.png,.pdf";

/** MIME types accepted by the scan upload route. */
export {
  ACCEPTED_SCAN_MIME_TYPES as ACCEPTED_UPLOAD_MIME_TYPES,
} from "../../_utils/mimeTypeUtilities";

/** File extensions accepted by the scan upload route. */
export {
  ACCEPTED_SCAN_FILE_EXTENSIONS as ACCEPTED_UPLOAD_FILE_EXTENSIONS,
} from "../../_utils/mimeTypeUtilities";

/** Delay before removing a completed upload card from the route queue. */
export const COMPLETED_UPLOAD_REMOVAL_DELAY_MS = 1000;

/** Delay before showing the post-upload prompt after a batch completes. */
export const POST_UPLOAD_PROMPT_DELAY_MS = 500;

/** Status values for an individual client-side pending upload. */
export type PendingUploadStatus = "idle" | "uploading" | "retrying" | "completed" | "failed";

/**
 * A scan file tracked by the upload route before and during upload.
 *
 * @remarks
 * This is intentionally route-scoped and should not be persisted because it can
 * contain a live `File` reference and object URL.
 */
export type PendingUpload = Readonly<{
  /** Client-side queue identifier. */
  id: string;
  /** Display name and server registration file name. */
  name: string;
  /** Browser file reference; released after successful upload. */
  file: File | null;
  /** Browser-reported MIME type. */
  mimeType: string;
  /** File size in bytes. */
  size: number;
  /** Object URL preview while the upload is local. */
  preview: string;
  /** Current upload lifecycle status. */
  status: PendingUploadStatus;
  /** User-visible upload progress from 0 to 100. */
  progress: number;
  /** Number of attempts already made. */
  attempts: number;
  /** Last per-file upload error, if any. */
  error?: string;
  /** Server blob URL after successful upload and registration. */
  blobUrl?: string;
}>;

/** Minimal completed upload data needed by the post-upload prompt. */
export type UploadCompletionSummary = Readonly<{
  /** Client-side upload identifier. */
  id: string;
  /** Display name for the uploaded scan. */
  name: string;
  /** Preview URL, preferably the server blob URL when available. */
  preview: string;
}>;

/** Session-level upload counters displayed by the route. */
export type SessionStats = Readonly<{
  /** Number of valid files added during this route session. */
  totalAdded: number;
  /** Number of scans uploaded successfully during this route session. */
  totalCompleted: number;
  /** Number of scans that reached a failed state during this route session. */
  totalFailed: number;
}>;

/** Machine-readable validation error reasons for rejected upload files. */
export type UploadValidationErrorReason = "unsupported-type" | "unsupported-extension" | "file-too-large";

/** Validation result for one candidate upload file. */
export type UploadValidationResult =
  | Readonly<{isValid: true; file: File}>
  | Readonly<{
      isValid: false;
      file: File;
      reason: UploadValidationErrorReason;
      message: string;
    }>;

/** Valid and invalid files produced by batch upload validation. */
export type UploadBatchValidationResult = Readonly<{
  validFiles: File[];
  invalidFiles: Array<Extract<UploadValidationResult, {isValid: false}>>;
}>;

/** Result returned by the upload target creation action. */
export type CreateUploadTargetResult =
  | Readonly<{
      success: true;
      data: Readonly<{
        /** SAS URL for direct blob upload */
        sasUrl: string;
        /** Azure blob name */
        blobName: string;
        /** Public blob URL without SAS token */
        blobUrl: string;
        /** Generated scan identifier */
        scanId: string;
        /** HTTP headers required for direct PUT request */
        requiredHeaders: Readonly<Record<string, string>>;
        /** Canonical scan metadata for building Scan object */
        metadata: ScanMetadata;
      }>;
    }>
  | Readonly<{success: false; error: Readonly<{message: string}>}>;

/** Result returned by the server-side fallback upload action. */
export type ServerUploadScanResult =
  | Readonly<{success: true; data: Readonly<{status: number; scan: Scan}>}>
  | Readonly<{success: false; error: Readonly<{message: string}>}>;

/** Dependencies injected into the upload runner for testable side effects. */
export type UploadRunnerDependencies = Readonly<{
  createUploadTarget: (
    input: Readonly<{
      fileName: string;
      mimeType: string;
      sizeInBytes: number;
    }>,
  ) => Promise<CreateUploadTargetResult>;
  uploadScan: (input: Readonly<{base64Data: string; fileName: string; mimeType: string}>) => Promise<ServerUploadScanResult>;
  readFileAsBase64: (file: File) => Promise<string>;
}>;

/** Progress event emitted by the upload runner for a single upload. */
export type UploadProgressEvent = Readonly<{
  uploadId: string;
  status: PendingUploadStatus;
  progress: number;
  attempts: number;
  error?: string;
  blobUrl?: string;
}>;

/** Callbacks used by the upload runner to report progress. */
export type UploadRunnerCallbacks = Readonly<{
  onProgress: (event: UploadProgressEvent) => void;
}>;

/** Failure categories returned by the upload runner. */
export type UploadFailureReason =
  | "missing-file"
  | "upload-target-failed"
  | "direct-upload-failed"
  | "server-upload-failed"
  | "unexpected-error";

/** Final result for one pending scan upload. */
export type UploadRunnerResult =
  | Readonly<{
      success: true;
      uploadId: string;
      attempts: number;
      scan: Scan;
      blobUrl: string;
    }>
  | Readonly<{
      success: false;
      uploadId: string;
      attempts: number;
      reason: UploadFailureReason;
      error: string;
    }>;

/** Complete route-scoped upload state owned by the reducer. */
export type UploadState = Readonly<{
  pendingUploads: PendingUpload[];
  isUploading: boolean;
  sessionStats: SessionStats;
  completedBatch: UploadCompletionSummary[];
}>;

/** Actions accepted by the upload reducer state machine. */
export type UploadAction =
  | Readonly<{type: "uploads-added"; uploads: PendingUpload[]}>
  | Readonly<{type: "uploads-removed"; ids: string[]}>
  | Readonly<{type: "uploads-cleared"}>
  | Readonly<{type: "upload-renamed"; id: string; name: string}>
  | Readonly<{type: "batch-started"}>
  | Readonly<{type: "batch-finished"}>
  | Readonly<{
      type: "upload-progressed";
      id: string;
      status: PendingUploadStatus;
      progress: number;
      attempts: number;
      error?: string;
      blobUrl?: string;
    }>
  | Readonly<{type: "upload-completed"; id: string; attempts: number; blobUrl: string}>
  | Readonly<{type: "upload-failed"; id: string; attempts: number; error: string}>
  | Readonly<{type: "upload-removed-after-completion"; id: string}>
  | Readonly<{type: "session-stats-reset"}>
  | Readonly<{type: "completed-batch-cleared"}>;
