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
});
