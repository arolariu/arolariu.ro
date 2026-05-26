import type {Scan} from "@/types/scans";

export const UPLOAD_CONCURRENCY_LIMIT = 5;
export const MAX_UPLOAD_ATTEMPTS = 3;
export const MAX_UPLOAD_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_UPLOAD_EXTENSIONS = ".jpg,.jpeg,.png,.pdf";
export const ACCEPTED_UPLOAD_MIME_TYPES: ReadonlySet<string> = new Set(["image/jpeg", "image/png", "application/pdf"]);
export const ACCEPTED_UPLOAD_FILE_EXTENSIONS: ReadonlySet<string> = new Set(["jpg", "jpeg", "png", "pdf"]);
export const COMPLETED_UPLOAD_REMOVAL_DELAY_MS = 1000;
export const POST_UPLOAD_PROMPT_DELAY_MS = 500;

export type PendingUploadStatus = "idle" | "uploading" | "retrying" | "completed" | "failed";

export type PendingUpload = Readonly<{
  id: string;
  name: string;
  file: File | null;
  mimeType: string;
  size: number;
  preview: string;
  status: PendingUploadStatus;
  progress: number;
  attempts: number;
  error?: string;
  blobUrl?: string;
}>;

export type UploadCompletionSummary = Readonly<{
  id: string;
  name: string;
  preview: string;
}>;

export type SessionStats = Readonly<{
  totalAdded: number;
  totalCompleted: number;
  totalFailed: number;
}>;

export type UploadValidationErrorReason = "unsupported-type" | "unsupported-extension" | "file-too-large";

export type UploadValidationResult =
  | Readonly<{isValid: true; file: File}>
  | Readonly<{
      isValid: false;
      file: File;
      reason: UploadValidationErrorReason;
      message: string;
    }>;

export type UploadBatchValidationResult = Readonly<{
  validFiles: File[];
  invalidFiles: Array<Extract<UploadValidationResult, {isValid: false}>>;
}>;

export type GenerateUploadSasUrlResult =
  | Readonly<{
      success: true;
      data: Readonly<{
        sasUrl: string;
        blobName: string;
        blobUrl: string;
        scanId: string;
      }>;
    }>
  | Readonly<{success: false; error: Readonly<{message: string}>}>;

export type RegisterScanResult = Readonly<{success: true; scan: Scan}> | Readonly<{success: false; error?: string; scan?: undefined}>;

export type ServerUploadScanResult =
  | Readonly<{success: true; data: Readonly<{status: number; scan: Scan}>}>
  | Readonly<{success: false; error: Readonly<{message: string}>}>;

export type UploadRunnerDependencies = Readonly<{
  generateUploadSasUrl: (input: Readonly<{fileName: string; mimeType: string}>) => Promise<GenerateUploadSasUrlResult>;
  registerScan: (
    input: Readonly<{
      scanId: string;
      blobUrl: string;
      fileName: string;
      mimeType: string;
      sizeInBytes: number;
    }>,
  ) => Promise<RegisterScanResult>;
  uploadScan: (input: Readonly<{base64Data: string; fileName: string; mimeType: string}>) => Promise<ServerUploadScanResult>;
  fetchImpl: typeof fetch;
  readFileAsBase64: (file: File) => Promise<string>;
}>;

export type UploadProgressEvent = Readonly<{
  uploadId: string;
  status: PendingUploadStatus;
  progress: number;
  attempts: number;
  error?: string;
  blobUrl?: string;
}>;

export type UploadRunnerCallbacks = Readonly<{
  onProgress: (event: UploadProgressEvent) => void;
}>;

export type UploadFailureReason =
  | "missing-file"
  | "sas-generation-failed"
  | "direct-upload-failed"
  | "registration-failed"
  | "server-upload-failed"
  | "unexpected-error";

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

export type UploadState = Readonly<{
  pendingUploads: PendingUpload[];
  isUploading: boolean;
  sessionStats: SessionStats;
  completedBatch: UploadCompletionSummary[];
}>;

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
