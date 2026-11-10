/**
 * @fileoverview Unit tests for upload progress event coalescing.
 * @module app/domains/invoices/upload-scans/_hooks/useUploadProgressEvents.test
 */

import {act, renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it, vi} from "vitest";
import {useUploadProgressEvents} from "./useUploadProgressEvents";
import type {UploadEvent} from "../_model/events";

describe("useUploadProgressEvents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("coalesces progress events into reducer events on the next animation frame", () => {
    const dispatch = vi.fn<(event: UploadEvent) => void>();
    let frameCallback: FrameRequestCallback | undefined;
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => undefined);

    const {result, unmount} = renderHook(() => useUploadProgressEvents(dispatch));

    act(() => {
      result.current.dispatchProgress({
        uploadId: "upload-1",
        status: "uploading",
        progress: 30,
        attempts: 1,
      });
      result.current.dispatchProgress({
        uploadId: "upload-1",
        status: "uploading",
        progress: 70,
        attempts: 1,
      });
    });

    expect(dispatch).not.toHaveBeenCalled();

    act(() => {
      frameCallback?.(1_779_999_999_000);
    });

    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "scanUpload.item.progressChanged",
        uploadId: "upload-1",
        status: "uploading",
        progress: 70,
        attempt: 1,
        source: "runner",
      }),
    );

    unmount();
  });

  it("forwards error and blobUrl when present and omits them otherwise", () => {
    const dispatch = vi.fn<(event: UploadEvent) => void>();
    let frameCallback: FrameRequestCallback | undefined;
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallback = callback;
      return 1;
    });
    vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => undefined);

    const {result} = renderHook(() => useUploadProgressEvents(dispatch));

    act(() => {
      result.current.dispatchProgress({
        uploadId: "upload-1",
        status: "failed",
        progress: 10,
        attempts: 2,
        error: "failure",
        blobUrl: "https://storage/1.jpg",
      });
      result.current.dispatchProgress({uploadId: "upload-2", status: "uploading", progress: 5, attempts: 1});
    });
    act(() => {
      frameCallback?.(1);
    });

    const [first, second] = dispatch.mock.calls.map(([event]) => event);
    expect(first).toMatchObject({uploadId: "upload-1", error: "failure", blobUrl: "https://storage/1.jpg"});
    expect(second).toMatchObject({uploadId: "upload-2"});
    expect(second).not.toHaveProperty("error");
    expect(second).not.toHaveProperty("blobUrl");
  });

  it("cancels the pending animation frame on unmount and not when none is pending", () => {
    const dispatch = vi.fn<(event: UploadEvent) => void>();
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 7);
    const cancel = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => undefined);

    const idle = renderHook(() => useUploadProgressEvents(dispatch));
    idle.unmount();
    expect(cancel).not.toHaveBeenCalled();

    const pending = renderHook(() => useUploadProgressEvents(dispatch));
    act(() => {
      pending.result.current.dispatchProgress({uploadId: "upload-1", status: "uploading", progress: 1, attempts: 1});
    });
    pending.unmount();

    expect(cancel).toHaveBeenCalledExactlyOnceWith(7);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
