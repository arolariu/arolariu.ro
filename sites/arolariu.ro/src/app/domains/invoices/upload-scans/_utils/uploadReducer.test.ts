/**
 * @fileoverview Unit tests for the scan upload reducer state machine.
 * @module app/domains/invoices/upload-scans/_utils/uploadReducer.test
 */

import {describe, expect, it} from "vitest";
import {initialUploadState, selectUploadableItems, uploadReducer} from "./uploadReducer";
import type {PendingUpload} from "./uploadTypes";

/**
 * Creates a pending upload test fixture.
 *
 * @param overrides - Properties to override on the default upload.
 * @returns Pending upload fixture.
 */
function createUpload(overrides: Partial<PendingUpload> = {}): PendingUpload {
  const file = new File([new Uint8Array(4)], "receipt.jpg", {type: "image/jpeg"});
  return {
    id: "upload-1",
    name: "receipt.jpg",
    file,
    mimeType: "image/jpeg",
    size: file.size,
    preview: "blob:preview",
    status: "idle",
    progress: 0,
    attempts: 0,
    ...overrides,
  };
}

describe("uploadReducer", () => {
  it("adds uploads and increments totalAdded", () => {
    const upload = createUpload();

    const state = uploadReducer(initialUploadState, {type: "uploads-added", uploads: [upload]});

    expect(state.pendingUploads).toEqual([upload]);
    expect(state.sessionStats.totalAdded).toBe(1);
  });

  it("removes only idle and failed uploads", () => {
    const idle = createUpload({id: "idle", status: "idle"});
    const failed = createUpload({id: "failed", status: "failed"});
    const active = createUpload({id: "active", status: "uploading"});
    const state = uploadReducer(initialUploadState, {type: "uploads-added", uploads: [idle, failed, active]});

    const next = uploadReducer(state, {type: "uploads-removed", ids: ["idle", "failed", "active"]});

    expect(next.pendingUploads.map((upload) => upload.id)).toEqual(["active"]);
  });

  it("tracks retry attempt state", () => {
    const upload = createUpload();
    const withUpload = uploadReducer(initialUploadState, {type: "uploads-added", uploads: [upload]});

    const retrying = uploadReducer(withUpload, {
      type: "upload-progressed",
      id: upload.id,
      status: "retrying",
      progress: 30,
      attempts: 2,
    });

    expect(retrying.pendingUploads[0]).toMatchObject({
      status: "retrying",
      progress: 30,
      attempts: 2,
    });
    expect(retrying.pendingUploads[0]?.error).toBeUndefined();
  });

  it("records completion summary and releases local file reference", () => {
    const upload = createUpload();
    const withUpload = uploadReducer(initialUploadState, {type: "uploads-added", uploads: [upload]});

    const completed = uploadReducer(withUpload, {
      type: "upload-completed",
      id: upload.id,
      attempts: 1,
      blobUrl: "https://storage/scans/upload-1.jpg",
    });

    expect(completed.pendingUploads[0]).toMatchObject({
      file: null,
      preview: "",
      status: "completed",
      progress: 100,
      attempts: 1,
      blobUrl: "https://storage/scans/upload-1.jpg",
    });
    expect(completed.completedBatch).toEqual([
      {
        id: upload.id,
        name: upload.name,
        preview: "https://storage/scans/upload-1.jpg",
      },
    ]);
  });

  it("records failed uploads and increments failed stats", () => {
    const upload = createUpload();
    const withUpload = uploadReducer(initialUploadState, {type: "uploads-added", uploads: [upload]});

    const failed = uploadReducer(withUpload, {
      type: "upload-failed",
      id: upload.id,
      attempts: 3,
      error: "Server upload failed",
    });

    expect(failed.pendingUploads[0]).toMatchObject({
      status: "failed",
      progress: 0,
      attempts: 3,
      error: "Server upload failed",
    });
    expect(failed.sessionStats.totalFailed).toBe(1);
  });

  it("clears only removable uploads", () => {
    const idle = createUpload({id: "idle", status: "idle"});
    const active = createUpload({id: "active", status: "uploading"});
    const failed = createUpload({id: "failed", status: "failed"});
    const state = uploadReducer(initialUploadState, {type: "uploads-added", uploads: [idle, active, failed]});

    const cleared = uploadReducer(state, {type: "uploads-cleared"});

    expect(cleared.pendingUploads.map((upload) => upload.id)).toEqual(["active"]);
  });

  it("renames only removable uploads", () => {
    const idle = createUpload({id: "idle", status: "idle"});
    const active = createUpload({id: "active", status: "uploading", name: "active.jpg"});
    const state = uploadReducer(initialUploadState, {type: "uploads-added", uploads: [idle, active]});

    const renamedIdle = uploadReducer(state, {type: "upload-renamed", id: "idle", name: "renamed.jpg"});
    const renamedActive = uploadReducer(renamedIdle, {type: "upload-renamed", id: "active", name: "blocked.jpg"});

    expect(renamedActive.pendingUploads.find((upload) => upload.id === "idle")?.name).toBe("renamed.jpg");
    expect(renamedActive.pendingUploads.find((upload) => upload.id === "active")?.name).toBe("active.jpg");
  });

  it("sets batch uploading state and clears previous completion summaries", () => {
    const upload = createUpload();
    const withUpload = uploadReducer(initialUploadState, {type: "uploads-added", uploads: [upload]});
    const completed = uploadReducer(withUpload, {
      type: "upload-completed",
      id: upload.id,
      attempts: 1,
      blobUrl: "https://storage/scans/upload-1.jpg",
    });

    const started = uploadReducer(completed, {type: "batch-started"});
    const finished = uploadReducer(started, {type: "batch-finished"});

    expect(started.isUploading).toBe(true);
    expect(started.completedBatch).toEqual([]);
    expect(finished.isUploading).toBe(false);
  });

  it("stores optional progress errors and blob URLs", () => {
    const upload = createUpload();
    const withUpload = uploadReducer(initialUploadState, {type: "uploads-added", uploads: [upload]});

    const progressed = uploadReducer(withUpload, {
      type: "upload-progressed",
      id: upload.id,
      status: "uploading",
      progress: 70,
      attempts: 1,
      error: "slow network",
      blobUrl: "https://storage/scans/upload-1.jpg",
    });

    expect(progressed.pendingUploads[0]).toMatchObject({
      status: "uploading",
      progress: 70,
      attempts: 1,
      error: "slow network",
      blobUrl: "https://storage/scans/upload-1.jpg",
    });
  });

  it("removes completed uploads after the display delay", () => {
    const upload = createUpload({status: "completed"});
    const state = uploadReducer(initialUploadState, {type: "uploads-added", uploads: [upload]});

    const next = uploadReducer(state, {type: "upload-removed-after-completion", id: upload.id});

    expect(next.pendingUploads).toEqual([]);
  });

  it("resets session stats and clears completed batch", () => {
    const upload = createUpload();
    const withUpload = uploadReducer(initialUploadState, {type: "uploads-added", uploads: [upload]});
    const completed = uploadReducer(withUpload, {
      type: "upload-completed",
      id: upload.id,
      attempts: 1,
      blobUrl: "https://storage/scans/upload-1.jpg",
    });

    const reset = uploadReducer(completed, {type: "session-stats-reset"});
    const withoutCompletedBatch = uploadReducer(reset, {type: "completed-batch-cleared"});

    expect(reset.sessionStats).toEqual({
      totalAdded: 0,
      totalCompleted: 0,
      totalFailed: 0,
    });
    expect(withoutCompletedBatch.completedBatch).toEqual([]);
  });
});

describe("selectUploadableItems", () => {
  it("selects idle and failed uploads only", () => {
    const state = uploadReducer(initialUploadState, {
      type: "uploads-added",
      uploads: [
        createUpload({id: "idle", status: "idle"}),
        createUpload({id: "failed", status: "failed"}),
        createUpload({id: "uploading", status: "uploading"}),
        createUpload({id: "completed", status: "completed"}),
      ],
    });

    expect(selectUploadableItems(state).map((upload) => upload.id)).toEqual(["idle", "failed"]);
  });
});
