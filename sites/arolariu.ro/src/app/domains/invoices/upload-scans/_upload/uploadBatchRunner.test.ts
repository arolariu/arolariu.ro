/**
 * @fileoverview Unit tests for batch scan upload execution.
 * @module app/domains/invoices/upload-scans/_upload/uploadBatchRunner.test
 */

import {describe, expect, it, vi} from "vitest";
import type {PendingUpload, UploadRunnerCallbacks, UploadRunnerDependencies, UploadRunnerResult} from "../_types";
import {uploadPendingScanBatch} from "./uploadBatchRunner";

/**
 * Creates a pending upload fixture for batch runner tests.
 *
 * @param id - Upload identifier and file name stem.
 * @returns Pending upload fixture.
 */
function createUpload(id: string): PendingUpload {
  const file = new File([new Uint8Array(4)], `${id}.jpg`, {type: "image/jpeg"});
  return {
    id,
    name: `${id}.jpg`,
    file,
    mimeType: "image/jpeg",
    size: file.size,
    preview: `blob:${id}`,
    status: "idle",
    progress: 0,
    attempts: 0,
  };
}

/**
 * Creates a runner result for one batch item.
 *
 * @param uploadId - Upload identifier.
 * @param success - Whether the result should be successful.
 * @returns Upload runner result.
 */
function createResult(uploadId: string, success: boolean): UploadRunnerResult {
  if (!success) {
    return {
      success: false,
      uploadId,
      attempts: 3,
      reason: "server-upload-failed",
      error: "Fallback failed",
    };
  }

  return {
    success: true,
    uploadId,
    attempts: 1,
    blobUrl: `https://storage/${uploadId}.jpg`,
    scan: {
      id: uploadId,
      userIdentifier: "user-1",
      name: `${uploadId}.jpg`,
      blobUrl: `https://storage/${uploadId}.jpg`,
      mimeType: "image/jpeg",
      sizeInBytes: 4,
      scanType: "JPEG",
      uploadedAt: new Date("2026-05-26T00:00:00.000Z"),
      status: "ready",
      metadata: {
        scanId: uploadId,
        ownerId: "user-1",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: new Date("2026-05-26T00:00:00.000Z"),
        uploadedBy: "user-1",
      },
    },
  };
}

describe("uploadPendingScanBatch", () => {
  it("returns partial success and failure results without fail-fast behavior", async () => {
    const uploads = [createUpload("success-1"), createUpload("failed-1"), createUpload("success-2")];
    const uploadOne = vi
      .fn<(upload: PendingUpload, dependencies: UploadRunnerDependencies, callbacks: UploadRunnerCallbacks) => Promise<UploadRunnerResult>>()
      .mockResolvedValueOnce(createResult("success-1", true))
      .mockResolvedValueOnce(createResult("failed-1", false))
      .mockResolvedValueOnce(createResult("success-2", true));

    const result = await uploadPendingScanBatch({
      uploads,
      dependencies: {
        createUploadTarget: vi.fn(),
        uploadScan: vi.fn(),
        readFileAsBase64: vi.fn(),
      },
      callbacks: {onProgress: vi.fn()},
      concurrencyLimit: 2,
      uploadOne,
    });

    expect(result.results).toHaveLength(3);
    expect(result.successCount).toBe(2);
    expect(result.failureCount).toBe(1);
    expect(result.results.map((item) => item.uploadId)).toEqual(["success-1", "failed-1", "success-2"]);
  });

  it("normalizes thrown item uploads into failure results", async () => {
    const uploads = [createUpload("throws-1")];
    const uploadOne = vi.fn().mockRejectedValue(new Error("Network exploded"));

    const result = await uploadPendingScanBatch({
      uploads,
      dependencies: {
        createUploadTarget: vi.fn(),
        uploadScan: vi.fn(),
        readFileAsBase64: vi.fn(),
      },
      callbacks: {onProgress: vi.fn()},
      concurrencyLimit: 1,
      uploadOne,
    });

    expect(result).toEqual({
      results: [
        {
          success: false,
          uploadId: "throws-1",
          attempts: 0,
          reason: "unexpected-error",
          error: "Network exploded",
        },
      ],
      successCount: 0,
      failureCount: 1,
    });
  });
});
