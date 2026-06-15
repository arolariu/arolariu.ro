/**
 * @fileoverview Shared type contracts for the route-scoped scan upload workflow.
 * @module app/domains/invoices/upload-scans/_types/types
 *
 * @remarks
 * This module intentionally contains no React state or reducer events. It
 * defines shared route contracts used across the context, upload runners,
 * validation helpers, hooks, and presentation components.
 */

import type {Scan, ScanMetadata} from "@/types/scans";

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
export type UploadFailureReason = "missing-file" | "server-upload-failed" | "unexpected-error";

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

/** Translation code returned by the upload session for the React layer to toast. */
export type ToastCode =
  | Readonly<{kind: "success"; key: "uploadSucceeded"; count: number}>
  | Readonly<{kind: "error"; key: "uploadFailed"; count: number}>;

/** Aggregated outcome returned by `runUploadSession`. */
export type UploadOutcome = Readonly<{
  /** Number of scans uploaded successfully in this batch. */
  successCount: number;
  /** Number of scans that failed in this batch. */
  failureCount: number;
  /** Translation codes to surface as toasts (translated by the caller). */
  toasts: readonly ToastCode[];
}>;
