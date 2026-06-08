/**
 * @fileoverview Batch upload runner for route-scoped scan uploads.
 * @module app/domains/invoices/upload-scans/_upload/uploadBatchRunner
 *
 * @remarks
 * Batch execution is intentionally tolerant: one upload failing must not stop
 * the rest of the selected queue. The result preserves per-item outcomes so the
 * React controller can dispatch success/failure events and show summary toasts.
 */

import {withConcurrencyLimitAndProgress} from "@/lib/concurrency.client";
import type {PendingUpload, UploadRunnerCallbacks, UploadRunnerDependencies, UploadRunnerResult} from "../_utils/uploadTypes";
import {UPLOAD_CONCURRENCY_LIMIT} from "../_utils/uploadTypes";
import {uploadPendingScan} from "./uploadRunner";

type UploadOne = (
  upload: PendingUpload,
  dependencies: UploadRunnerDependencies,
  callbacks: UploadRunnerCallbacks,
) => Promise<UploadRunnerResult>;

/** Input accepted by the batch upload runner. */
export type UploadBatchRunnerInput = Readonly<{
  /** Uploads to execute in queue order. */
  uploads: readonly PendingUpload[];
  /** Dependencies passed to each one-file runner invocation. */
  dependencies: UploadRunnerDependencies;
  /** Progress callbacks passed to each one-file runner invocation. */
  callbacks: UploadRunnerCallbacks;
  /** Maximum concurrent uploads. */
  concurrencyLimit?: number;
  /** Injectable one-file runner for tests. */
  uploadOne?: UploadOne;
}>;

/** Aggregated batch upload outcome. */
export type UploadBatchRunnerResult = Readonly<{
  /** Per-item upload results in queue order. */
  results: UploadRunnerResult[];
  /** Number of successful item uploads. */
  successCount: number;
  /** Number of failed item uploads. */
  failureCount: number;
}>;

/**
 * Converts an unexpected thrown item upload into a normal failed result.
 *
 * @param upload - Upload that threw.
 * @param error - Thrown value.
 * @returns Failed upload result.
 */
function normalizeThrownUpload(upload: PendingUpload, error: unknown): UploadRunnerResult {
  return {
    success: false,
    uploadId: upload.id,
    attempts: 0,
    reason: "unexpected-error",
    error: error instanceof Error ? error.message : "Unexpected upload error",
  };
}

/**
 * Executes pending scan uploads with bounded concurrency.
 *
 * @param input - Batch runner configuration.
 * @returns Aggregated success and failure results.
 */
export async function uploadPendingScanBatch({
  uploads,
  dependencies,
  callbacks,
  concurrencyLimit = UPLOAD_CONCURRENCY_LIMIT,
  uploadOne = uploadPendingScan,
}: UploadBatchRunnerInput): Promise<UploadBatchRunnerResult> {
  const tasks = uploads.map((upload) => async (): Promise<UploadRunnerResult> => {
    try {
      return await uploadOne(upload, dependencies, callbacks);
    } catch (error) {
      return normalizeThrownUpload(upload, error);
    }
  });

  const settledResults = await withConcurrencyLimitAndProgress(tasks, {limit: concurrencyLimit});
  const allResults = settledResults
    .map((result, index): UploadRunnerResult | undefined => {
      const upload = uploads[index];
      if (upload === undefined) return undefined;
      if (result === undefined) return undefined;
      return result instanceof Error ? normalizeThrownUpload(upload, result) : result;
    })
    .filter((result): result is UploadRunnerResult => result !== undefined);

  return {
    results: allResults,
    successCount: allResults.filter((result) => result.success).length,
    failureCount: allResults.filter((result) => !result.success).length,
  };
}
