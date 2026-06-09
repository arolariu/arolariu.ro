/**
 * @fileoverview Unit tests for the event-driven scan upload reducer.
 * @module app/domains/invoices/upload-scans/_state/uploadReducer.test
 */

import {describe, expect, it} from "vitest";
import type {UploadEvent} from "./uploadEvents";
import {uploadReducer} from "./uploadReducer";
import {isRemovableUpload, selectRemovableUploads, selectUploadableItems} from "./uploadSelectors";
import {initialUploadState} from "./uploadState";
import type {PendingUpload} from "../_utils/uploadTypes";

/**
 * Creates a deterministic pending upload fixture for reducer tests.
 *
 * @param overrides - Fields to override on the default pending upload.
 * @returns A pending upload suitable for pure state-transition tests.
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

/**
 * Adds deterministic event metadata to a test upload event.
 *
 * @param uploadEvent - Event payload without metadata fields.
 * @returns A complete upload event with stable timestamp and source.
 */
function event<TEvent extends UploadEvent>(uploadEvent: Omit<TEvent, "occurredAt" | "source">): TEvent {
  return {
    occurredAt: 1_779_999_999_000,
    source: "test",
    ...uploadEvent,
  } as TEvent;
}

describe("uploadReducer", () => {
  it("handles scanUpload.queue.filesAccepted by appending uploads and incrementing totalAdded", () => {
    const upload = createUpload();

    const state = uploadReducer(
      initialUploadState,
      event<Extract<UploadEvent, {type: "scanUpload.queue.filesAccepted"}>>({
        type: "scanUpload.queue.filesAccepted",
        uploads: [upload],
      }),
    );

    expect(state.pendingUploads).toEqual([upload]);
    expect(state.sessionStats.totalAdded).toBe(1);
  });

  it("handles scanUpload.queue.itemRemoved by removing idle and failed items only", () => {
    const idle = createUpload({id: "idle", status: "idle"});
    const failed = createUpload({id: "failed", status: "failed"});
    const active = createUpload({id: "active", status: "uploading"});
    const queued = uploadReducer(
      initialUploadState,
      event<Extract<UploadEvent, {type: "scanUpload.queue.filesAccepted"}>>({
        type: "scanUpload.queue.filesAccepted",
        uploads: [idle, failed, active],
      }),
    );

    const state = uploadReducer(
      queued,
      event<Extract<UploadEvent, {type: "scanUpload.queue.itemRemoved"}>>({
        type: "scanUpload.queue.itemRemoved",
        ids: ["idle", "failed", "active"],
      }),
    );

    expect(state.pendingUploads.map((upload) => upload.id)).toEqual(["active"]);
  });

  it("handles scanUpload.queue.removableItemsCleared by preserving active uploads", () => {
    const idle = createUpload({id: "idle", status: "idle"});
    const active = createUpload({id: "active", status: "uploading"});
    const failed = createUpload({id: "failed", status: "failed"});
    const queued = uploadReducer(
      initialUploadState,
      event<Extract<UploadEvent, {type: "scanUpload.queue.filesAccepted"}>>({
        type: "scanUpload.queue.filesAccepted",
        uploads: [idle, active, failed],
      }),
    );

    const state = uploadReducer(
      queued,
      event<Extract<UploadEvent, {type: "scanUpload.queue.removableItemsCleared"}>>({
        type: "scanUpload.queue.removableItemsCleared",
      }),
    );

    expect(state.pendingUploads.map((upload) => upload.id)).toEqual(["active"]);
  });

  it("handles scanUpload.queue.itemRenamed for removable uploads only", () => {
    const idle = createUpload({id: "idle", name: "old.jpg", status: "idle"});
    const active = createUpload({id: "active", name: "active.jpg", status: "uploading"});
    const queued = uploadReducer(
      initialUploadState,
      event<Extract<UploadEvent, {type: "scanUpload.queue.filesAccepted"}>>({
        type: "scanUpload.queue.filesAccepted",
        uploads: [idle, active],
      }),
    );

    const renamedIdle = uploadReducer(
      queued,
      event<Extract<UploadEvent, {type: "scanUpload.queue.itemRenamed"}>>({
        type: "scanUpload.queue.itemRenamed",
        id: "idle",
        name: "renamed.jpg",
      }),
    );
    const renamedActive = uploadReducer(
      renamedIdle,
      event<Extract<UploadEvent, {type: "scanUpload.queue.itemRenamed"}>>({
        type: "scanUpload.queue.itemRenamed",
        id: "active",
        name: "blocked.jpg",
      }),
    );

    expect(renamedActive.pendingUploads.find((upload) => upload.id === "idle")?.name).toBe("renamed.jpg");
    expect(renamedActive.pendingUploads.find((upload) => upload.id === "active")?.name).toBe("active.jpg");
  });

  it("handles batch lifecycle events", () => {
    const upload = createUpload();
    const withCompletedBatch = uploadReducer(
      uploadReducer(
        initialUploadState,
        event<Extract<UploadEvent, {type: "scanUpload.queue.filesAccepted"}>>({
          type: "scanUpload.queue.filesAccepted",
          uploads: [upload],
        }),
      ),
      event<Extract<UploadEvent, {type: "scanUpload.item.uploadSucceeded"}>>({
        type: "scanUpload.item.uploadSucceeded",
        uploadId: upload.id,
        attempt: 1,
        blobUrl: "https://storage/scans/upload-1.jpg",
        completion: {
          id: upload.id,
          name: upload.name,
          preview: "https://storage/scans/upload-1.jpg",
        },
      }),
    );

    const requested = uploadReducer(
      withCompletedBatch,
      event<Extract<UploadEvent, {type: "scanUpload.batch.requested"}>>({
        type: "scanUpload.batch.requested",
      }),
    );
    const started = uploadReducer(
      requested,
      event<Extract<UploadEvent, {type: "scanUpload.batch.started"}>>({
        type: "scanUpload.batch.started",
      }),
    );
    const finished = uploadReducer(
      started,
      event<Extract<UploadEvent, {type: "scanUpload.batch.finished"}>>({
        type: "scanUpload.batch.finished",
      }),
    );

    expect(requested.completedBatch).toEqual([]);
    expect(started.isUploading).toBe(true);
    expect(finished.isUploading).toBe(false);
  });

  it("handles first attempts, retry attempts, and progress changes", () => {
    const upload = createUpload();
    const queued = uploadReducer(
      initialUploadState,
      event<Extract<UploadEvent, {type: "scanUpload.queue.filesAccepted"}>>({
        type: "scanUpload.queue.filesAccepted",
        uploads: [upload],
      }),
    );

    const attemptStarted = uploadReducer(
      queued,
      event<Extract<UploadEvent, {type: "scanUpload.item.attemptStarted"}>>({
        type: "scanUpload.item.attemptStarted",
        uploadId: upload.id,
        attempt: 1,
      }),
    );
    const retryStarted = uploadReducer(
      attemptStarted,
      event<Extract<UploadEvent, {type: "scanUpload.item.retryStarted"}>>({
        type: "scanUpload.item.retryStarted",
        uploadId: upload.id,
        attempt: 2,
      }),
    );
    const progressed = uploadReducer(
      retryStarted,
      event<Extract<UploadEvent, {type: "scanUpload.item.progressChanged"}>>({
        type: "scanUpload.item.progressChanged",
        uploadId: upload.id,
        status: "retrying",
        progress: 70,
        attempt: 2,
      }),
    );

    expect(attemptStarted.pendingUploads[0]).toMatchObject({status: "uploading", progress: 0, attempts: 1});
    expect(retryStarted.pendingUploads[0]).toMatchObject({status: "retrying", progress: 0, attempts: 2});
    expect(progressed.pendingUploads[0]).toMatchObject({status: "retrying", progress: 70, attempts: 2});
  });

  it("handles scanUpload.item.uploadSucceeded by completing an upload and recording prompt summary", () => {
    const upload = createUpload({error: "previous error"});
    const queued = uploadReducer(
      initialUploadState,
      event<Extract<UploadEvent, {type: "scanUpload.queue.filesAccepted"}>>({
        type: "scanUpload.queue.filesAccepted",
        uploads: [upload],
      }),
    );

    const state = uploadReducer(
      queued,
      event<Extract<UploadEvent, {type: "scanUpload.item.uploadSucceeded"}>>({
        type: "scanUpload.item.uploadSucceeded",
        uploadId: upload.id,
        attempt: 2,
        blobUrl: "https://storage/scans/upload-1.jpg",
        completion: {
          id: upload.id,
          name: upload.name,
          preview: "https://storage/scans/upload-1.jpg",
        },
      }),
    );

    expect(state.pendingUploads[0]).toMatchObject({
      file: null,
      preview: "",
      status: "completed",
      progress: 100,
      attempts: 2,
      blobUrl: "https://storage/scans/upload-1.jpg",
    });
    expect(state.pendingUploads[0]?.error).toBeUndefined();
    expect(state.completedBatch).toEqual([
      {
        id: upload.id,
        name: upload.name,
        preview: "https://storage/scans/upload-1.jpg",
      },
    ]);
    expect(state.sessionStats.totalCompleted).toBe(1);
  });

  it("handles scanUpload.item.uploadFailed by recording terminal failure", () => {
    const upload = createUpload();
    const queued = uploadReducer(
      initialUploadState,
      event<Extract<UploadEvent, {type: "scanUpload.queue.filesAccepted"}>>({
        type: "scanUpload.queue.filesAccepted",
        uploads: [upload],
      }),
    );

    const state = uploadReducer(
      queued,
      event<Extract<UploadEvent, {type: "scanUpload.item.uploadFailed"}>>({
        type: "scanUpload.item.uploadFailed",
        uploadId: upload.id,
        attempt: 3,
        reason: "server-upload-failed",
        error: "Fallback failed",
      }),
    );

    expect(state.pendingUploads[0]).toMatchObject({
      status: "failed",
      progress: 0,
      attempts: 3,
      error: "Fallback failed",
    });
    expect(state.sessionStats.totalFailed).toBe(1);
  });

  it("handles preview, prompt, and session cleanup events", () => {
    const upload = createUpload({status: "completed"});
    const queued = uploadReducer(
      initialUploadState,
      event<Extract<UploadEvent, {type: "scanUpload.queue.filesAccepted"}>>({
        type: "scanUpload.queue.filesAccepted",
        uploads: [upload],
      }),
    );
    const completed = uploadReducer(
      queued,
      event<Extract<UploadEvent, {type: "scanUpload.item.uploadSucceeded"}>>({
        type: "scanUpload.item.uploadSucceeded",
        uploadId: upload.id,
        attempt: 1,
        blobUrl: "https://storage/scans/upload-1.jpg",
        completion: {
          id: upload.id,
          name: upload.name,
          preview: "https://storage/scans/upload-1.jpg",
        },
      }),
    );

    const hidden = uploadReducer(
      completed,
      event<Extract<UploadEvent, {type: "scanUpload.preview.completedItemHidden"}>>({
        type: "scanUpload.preview.completedItemHidden",
        uploadId: upload.id,
      }),
    );
    const promptCleared = uploadReducer(
      hidden,
      event<Extract<UploadEvent, {type: "scanUpload.prompt.completedBatchCleared"}>>({
        type: "scanUpload.prompt.completedBatchCleared",
      }),
    );
    const reset = uploadReducer(
      promptCleared,
      event<Extract<UploadEvent, {type: "scanUpload.session.statsReset"}>>({
        type: "scanUpload.session.statsReset",
      }),
    );

    expect(hidden.pendingUploads).toEqual([]);
    expect(promptCleared.completedBatch).toEqual([]);
    expect(reset.sessionStats).toEqual({totalAdded: 0, totalCompleted: 0, totalFailed: 0});
  });

  it("handles scanUpload.queue.itemRotated for removable image uploads", () => {
    const originalFile = new File([new Uint8Array([1])], "receipt.jpg", {type: "image/jpeg"});
    const rotatedFile = new File([new Uint8Array([2])], "receipt.jpg", {type: "image/jpeg"});
    const idle = createUpload({
      id: "idle",
      file: originalFile,
      preview: "blob:old-preview",
      size: originalFile.size,
      mimeType: "image/jpeg",
      error: "previous error",
      status: "idle",
    });
    const active = createUpload({id: "active", status: "uploading", preview: "blob:active-preview"});
    const queued = uploadReducer(
      initialUploadState,
      event<Extract<UploadEvent, {type: "scanUpload.queue.filesAccepted"}>>({
        type: "scanUpload.queue.filesAccepted",
        uploads: [idle, active],
      }),
    );

    const state = uploadReducer(
      queued,
      event<Extract<UploadEvent, {type: "scanUpload.queue.itemRotated"}>>({
        type: "scanUpload.queue.itemRotated",
        id: "idle",
        file: rotatedFile,
        preview: "blob:new-preview",
        mimeType: "image/jpeg",
        size: rotatedFile.size,
      }),
    );

    expect(state.pendingUploads.find((upload) => upload.id === "idle")).toMatchObject({
      file: rotatedFile,
      preview: "blob:new-preview",
      mimeType: "image/jpeg",
      size: rotatedFile.size,
    });
    expect(state.pendingUploads.find((upload) => upload.id === "idle")).not.toHaveProperty("error");
    expect(state.pendingUploads.find((upload) => upload.id === "active")?.preview).toBe("blob:active-preview");
  });

  it("ignores scanUpload.queue.itemRotated for active uploads", () => {
    const active = createUpload({id: "active", status: "uploading", preview: "blob:active-preview"});
    const rotatedFile = new File([new Uint8Array([2])], "receipt.jpg", {type: "image/jpeg"});
    const queued = uploadReducer(
      initialUploadState,
      event<Extract<UploadEvent, {type: "scanUpload.queue.filesAccepted"}>>({
        type: "scanUpload.queue.filesAccepted",
        uploads: [active],
      }),
    );

    const state = uploadReducer(
      queued,
      event<Extract<UploadEvent, {type: "scanUpload.queue.itemRotated"}>>({
        type: "scanUpload.queue.itemRotated",
        id: "active",
        file: rotatedFile,
        preview: "blob:new-preview",
        mimeType: "image/jpeg",
        size: rotatedFile.size,
      }),
    );

    expect(state.pendingUploads[0]).toEqual(active);
  });
});

describe("upload selectors", () => {
  it("identifies removable, uploadable, and active-safe item sets", () => {
    const idle = createUpload({id: "idle", status: "idle"});
    const failed = createUpload({id: "failed", status: "failed"});
    const uploading = createUpload({id: "uploading", status: "uploading"});
    const retrying = createUpload({id: "retrying", status: "retrying"});
    const completed = createUpload({id: "completed", status: "completed"});
    const state = {
      ...initialUploadState,
      pendingUploads: [idle, failed, uploading, retrying, completed],
    };

    expect(isRemovableUpload(idle)).toBe(true);
    expect(isRemovableUpload(uploading)).toBe(false);
    expect(selectUploadableItems(state).map((upload) => upload.id)).toEqual(["idle", "failed"]);
    expect(selectRemovableUploads(state).map((upload) => upload.id)).toEqual(["idle", "failed"]);
  });
});
