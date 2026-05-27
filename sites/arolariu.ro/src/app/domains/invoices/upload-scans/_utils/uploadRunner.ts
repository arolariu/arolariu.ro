/**
 * @fileoverview Single-file upload runner for the scan upload route.
 * @module app/domains/invoices/upload-scans/_utils/uploadRunner
 *
 * @remarks
 * The runner performs one pending upload's server journey with explicit
 * dependency injection so network, server actions, and file reading remain
 * testable.
 */

import {
  MAX_UPLOAD_ATTEMPTS,
  type PendingUpload,
  type UploadFailureReason,
  type UploadRunnerCallbacks,
  type UploadRunnerDependencies,
  type UploadRunnerResult,
} from "./uploadTypes";

type AttemptFailure = Readonly<{
  reason: UploadFailureReason;
  error: string;
}>;

type FileBackedUpload = PendingUpload & Readonly<{file: File}>;

/**
 * Reads a browser file as a base64 data URL for the server-side fallback path.
 *
 * @param file - Browser file to encode.
 * @returns Base64 data URL.
 */
export async function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unable to read file as base64"));
      }
    });
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Unable to read file")));
    reader.readAsDataURL(file);
  });
}

/**
 * Maps the current attempt number to the UI status used for progress events.
 *
 * @param attempt - One-based upload attempt number.
 * @returns `uploading` for the first attempt; `retrying` for later attempts.
 */
function progressStatusForAttempt(attempt: number): "uploading" | "retrying" {
  return attempt === 1 ? "uploading" : "retrying";
}

/**
 * Narrows upload runner output to a successful result.
 *
 * @param result - Upload attempt result or attempt failure.
 * @returns Whether the result is a successful upload result.
 */
function isSuccessfulUploadResult(result: UploadRunnerResult | AttemptFailure): result is Extract<UploadRunnerResult, {success: true}> {
  return "success" in result && result.success;
}

/**
 * Uploads through the server-side fallback action.
 *
 * @param upload - File-backed pending upload.
 * @param dependencies - Runner dependencies.
 * @returns Upload success result or a typed attempt failure.
 */
async function uploadWithServerFallback(upload: FileBackedUpload, dependencies: UploadRunnerDependencies): Promise<UploadRunnerResult | AttemptFailure> {
  const base64Data = await dependencies.readFileAsBase64(upload.file);
  const result = await dependencies.uploadScan({
    base64Data,
    fileName: upload.name,
    mimeType: upload.mimeType,
  });

  if (!result.success) {
    return {reason: "server-upload-failed", error: result.error.message};
  }

  return {
    success: true,
    uploadId: upload.id,
    attempts: 1,
    scan: result.data.scan,
    blobUrl: result.data.scan.blobUrl,
  };
}

/**
 * Runs one upload attempt using direct Azure upload first, then server fallback.
 *
 * @param upload - File-backed pending upload.
 * @param attempt - One-based attempt number.
 * @param dependencies - Runner dependencies.
 * @param callbacks - Progress callbacks.
 * @returns Upload success result or a typed attempt failure.
 */
async function runSingleAttempt(
  upload: FileBackedUpload,
  attempt: number,
  dependencies: UploadRunnerDependencies,
  callbacks: UploadRunnerCallbacks,
): Promise<UploadRunnerResult | AttemptFailure> {
  const status = progressStatusForAttempt(attempt);
  callbacks.onProgress({uploadId: upload.id, status, progress: 0, attempts: attempt});

  const sasResult = await dependencies.generateUploadSasUrl({
    fileName: upload.name,
    mimeType: upload.mimeType,
  });

  callbacks.onProgress({uploadId: upload.id, status, progress: 30, attempts: attempt});

  if (sasResult.success) {
    const uploadResponse = await dependencies.fetchImpl(sasResult.data.sasUrl, {
      method: "PUT",
      body: upload.file,
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "Content-Type": upload.mimeType,
      },
    });

    callbacks.onProgress({uploadId: upload.id, status, progress: 70, attempts: attempt});

    if (uploadResponse.ok) {
      const registerResult = await dependencies.registerScan({
        scanId: sasResult.data.scanId,
        blobUrl: sasResult.data.blobUrl,
        fileName: upload.name,
        mimeType: upload.mimeType,
        sizeInBytes: upload.size,
      });

      callbacks.onProgress({uploadId: upload.id, status, progress: 90, attempts: attempt});

      if (registerResult.success && registerResult.scan) {
        return {
          success: true,
          uploadId: upload.id,
          attempts: attempt,
          scan: registerResult.scan,
          blobUrl: registerResult.scan.blobUrl,
        };
      }

      const fallbackResult = await uploadWithServerFallback(upload, dependencies);
      return isSuccessfulUploadResult(fallbackResult) ? {...fallbackResult, attempts: attempt} : fallbackResult;
    }

    const fallbackResult = await uploadWithServerFallback(upload, dependencies);
    return isSuccessfulUploadResult(fallbackResult) ? {...fallbackResult, attempts: attempt} : fallbackResult;
  }

  const fallbackResult = await uploadWithServerFallback(upload, dependencies);
  return isSuccessfulUploadResult(fallbackResult) ? {...fallbackResult, attempts: attempt} : fallbackResult;
}

/**
 * Uploads a pending scan with automatic retry up to the configured max attempt count.
 *
 * @param upload - Pending upload item from the route queue.
 * @param dependencies - Network, server action, and file-reading dependencies.
 * @param callbacks - Progress callbacks consumed by the context provider.
 * @returns Final upload result after success or exhausted attempts.
 */
export async function uploadPendingScan(
  upload: PendingUpload,
  dependencies: UploadRunnerDependencies,
  callbacks: UploadRunnerCallbacks,
): Promise<UploadRunnerResult> {
  if (!upload.file) {
    return {
      success: false,
      uploadId: upload.id,
      attempts: 0,
      reason: "missing-file",
      error: "File reference lost",
    };
  }

  let lastFailure: AttemptFailure = {reason: "unexpected-error", error: "Upload failed"};

  for (let attempt = 1; attempt <= MAX_UPLOAD_ATTEMPTS; attempt += 1) {
    try {
      const result = await runSingleAttempt({...upload, file: upload.file}, attempt, dependencies, callbacks);
      if (isSuccessfulUploadResult(result)) {
        return {...result, attempts: attempt};
      }
      lastFailure = result;
    } catch (error) {
      lastFailure = {
        reason: "unexpected-error",
        error: error instanceof Error ? error.message : "Unexpected upload error",
      };
    }
  }

  return {
    success: false,
    uploadId: upload.id,
    attempts: MAX_UPLOAD_ATTEMPTS,
    reason: lastFailure.reason,
    error: lastFailure.error,
  };
}
