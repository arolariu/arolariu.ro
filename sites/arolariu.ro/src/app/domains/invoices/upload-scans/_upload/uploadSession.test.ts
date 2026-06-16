/**
 * @fileoverview Unit tests for the React-agnostic upload session controller.
 * @module app/domains/invoices/upload-scans/_upload/uploadSession.test
 */

import {describe, expect, it, vi} from "vitest";
import type {UploadEvent} from "../_model/events";
import type {PendingUpload, UploadRunnerResult} from "../_types";
import type {UploadBatchRunnerResult} from "./multipleUploadRunner";
import {runUploadSession} from "./uploadSession";

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

function successResult(uploadId: string): Extract<UploadRunnerResult, {success: true}> {
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
      uploadedAt: new Date("2026-06-15T00:00:00.000Z"),
      status: "ready",
      metadata: {
        scanId: uploadId,
        ownerId: "user-1",
        documentKind: "receipt",
        documentRole: "primary",
        status: "ready",
        uploadedAt: new Date("2026-06-15T00:00:00.000Z"),
        uploadedBy: "user-1",
      },
    },
  };
}

function failureResult(uploadId: string): Extract<UploadRunnerResult, {success: false}> {
  return {success: false, uploadId, attempts: 3, reason: "server-upload-failed", error: "boom"};
}

function fakeBatch(result: UploadBatchRunnerResult): () => Promise<UploadBatchRunnerResult> {
  return vi.fn().mockResolvedValue(result);
}

const noopDeps = {createUploadTarget: vi.fn(), uploadScan: vi.fn(), readFileAsBase64: vi.fn()};

describe("runUploadSession", () => {
  it("emits batch + per-item events and returns translation codes for a mixed batch", async () => {
    const uploads = [createUpload("ok-1"), createUpload("bad-1")];
    const emit = vi.fn<(event: UploadEvent) => void>();
    const revokePreview = vi.fn();
    const scheduleRemoval = vi.fn();

    const outcome = await runUploadSession({
      uploads,
      dependencies: noopDeps,
      emit,
      onProgress: vi.fn(),
      revokePreview,
      scheduleRemoval,
      runBatch: fakeBatch({
        results: [successResult("ok-1"), failureResult("bad-1")],
        successCount: 1,
        failureCount: 1,
      }),
    });

    const emittedTypes = emit.mock.calls.map(([event]) => event.type);
    expect(emittedTypes).toEqual([
      "scanUpload.batch.requested",
      "scanUpload.batch.started",
      "scanUpload.item.uploadSucceeded",
      "scanUpload.item.uploadFailed",
      "scanUpload.batch.finished",
    ]);
    expect(revokePreview).toHaveBeenCalledExactlyOnceWith("blob:ok-1");
    expect(scheduleRemoval).toHaveBeenCalledExactlyOnceWith("ok-1");
    expect(outcome).toEqual({
      successCount: 1,
      failureCount: 1,
      toasts: [
        {kind: "success", key: "uploadSucceeded", count: 1},
        {kind: "error", key: "uploadFailed", count: 1},
      ],
    });
  });

  it("returns no toasts and schedules nothing for an empty batch", async () => {
    const emit = vi.fn<(event: UploadEvent) => void>();
    const scheduleRemoval = vi.fn();

    const outcome = await runUploadSession({
      uploads: [],
      dependencies: noopDeps,
      emit,
      onProgress: vi.fn(),
      revokePreview: vi.fn(),
      scheduleRemoval,
      runBatch: fakeBatch({results: [], successCount: 0, failureCount: 0}),
    });

    expect(emit.mock.calls.map(([event]) => event.type)).toEqual([
      "scanUpload.batch.requested",
      "scanUpload.batch.started",
      "scanUpload.batch.finished",
    ]);
    expect(scheduleRemoval).not.toHaveBeenCalled();
    expect(outcome.toasts).toEqual([]);
  });
});
