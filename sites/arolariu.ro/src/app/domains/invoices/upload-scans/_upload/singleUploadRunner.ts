/**
 * @fileoverview Single-file upload runner for the scan upload route.
 * @module app/domains/invoices/upload-scans/_upload/singleUploadRunner
 *
 * @remarks
 * The runner owns one upload item's network journey: request a server-prepared
 * upload target, upload directly to blob storage, and fall back to server-side
 * upload when the direct path fails. It has explicit dependencies so tests can
 * exercise success, fallback, retry, and missing-file behavior without real I/O.
 */

import {mimeTypeToScanType} from "../../_utils/mimeTypeUtilities";
import {MAX_UPLOAD_ATTEMPTS} from "../_model/constants";
import type {PendingUpload, UploadFailureReason, UploadRunnerCallbacks, UploadRunnerDependencies, UploadRunnerResult} from "../_types";

type AttemptFailure = Readonly<{
  reason: UploadFailureReason;
  error: string;
}>;

type FileBackedUpload = PendingUpload & Readonly<{file: File}>;

/**
 * Maps an attempt number to its display status.
 *
 * @param attempt - One-based upload attempt.
 * @returns Uploading for first attempt; retrying afterward.
 */
function progressStatusForAttempt(attempt: number): "uploading" | "retrying" {
  return attempt === 1 ? "uploading" : "retrying";
}

/**
 * Narrows a runner result or attempt failure to successful runner output.
 *
 * @param result - Candidate result.
 * @returns Whether the candidate is successful upload output.
 */
function isSuccessfulUploadResult(result: UploadRunnerResult | AttemptFailure): result is Extract<UploadRunnerResult, {success: true}> {
  return "success" in result && result.success;
}

/**
 * Uploads a file through the server-side fallback action.
 *
 * @param upload - File-backed pending upload.
 * @param dependencies - Runner dependencies.
 * @returns Successful upload output or an attempt failure.
 */
async function uploadWithServerFallback(
  upload: FileBackedUpload,
  dependencies: UploadRunnerDependencies,
): Promise<UploadRunnerResult | AttemptFailure> {
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
 * Runs one upload attempt using direct upload first and fallback second.
 *
 * @param upload - File-backed pending upload.
 * @param attempt - One-based attempt number.
 * @param dependencies - Runner dependencies.
 * @param callbacks - Progress callbacks.
 * @returns Successful upload output or an attempt failure.
 */
async function runSingleAttempt(
  upload: FileBackedUpload,
  attempt: number,
  dependencies: UploadRunnerDependencies,
  callbacks: UploadRunnerCallbacks,
): Promise<UploadRunnerResult | AttemptFailure> {
  const status = progressStatusForAttempt(attempt);
  callbacks.onProgress({uploadId: upload.id, status, progress: 0, attempts: attempt});

  const targetResult = await dependencies.createUploadTarget({
    fileName: upload.name,
    mimeType: upload.mimeType,
    sizeInBytes: upload.size,
  });

  callbacks.onProgress({uploadId: upload.id, status, progress: 30, attempts: attempt});

  if (targetResult.success) {
    const uploadResponse = await globalThis.fetch(targetResult.data.sasUrl, {
      method: "PUT",
      body: upload.file,
      headers: targetResult.data.requiredHeaders,
    });

    callbacks.onProgress({uploadId: upload.id, status, progress: 70, attempts: attempt});

    if (uploadResponse.ok) {
      const {metadata} = targetResult.data;
      const scan = {
        id: metadata.scanId,
        userIdentifier: metadata.ownerId,
        name: upload.name,
        blobUrl: targetResult.data.blobUrl,
        mimeType: upload.mimeType,
        sizeInBytes: upload.size,
        scanType: mimeTypeToScanType(upload.mimeType),
        uploadedAt: metadata.uploadedAt,
        status: "ready" as const,
        metadata,
      };

      return {
        success: true,
        uploadId: upload.id,
        attempts: attempt,
        scan,
        blobUrl: targetResult.data.blobUrl,
      };
    }
  }

  const fallbackResult = await uploadWithServerFallback(upload, dependencies);
  return isSuccessfulUploadResult(fallbackResult) ? {...fallbackResult, attempts: attempt} : fallbackResult;
}

/**
 * Uploads a pending scan with retry and fallback behavior.
 *
 * @param upload - Pending upload item from route state.
 * @param dependencies - Network, server action, and file-reading dependencies.
 * @param callbacks - Progress callbacks consumed by the controller.
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
