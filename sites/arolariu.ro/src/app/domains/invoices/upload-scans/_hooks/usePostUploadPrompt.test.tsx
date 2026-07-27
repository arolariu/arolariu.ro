/**
 * @fileoverview Unit tests for post-upload prompt timing.
 * @module app/domains/invoices/upload-scans/_hooks/usePostUploadPrompt.test
 */

import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {usePostUploadPrompt} from "./usePostUploadPrompt";

describe("usePostUploadPrompt", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows prompt after delay when queue is empty and completed batch exists", () => {
    const clearCompletedBatch = vi.fn();
    const completedBatch = [{id: "scan-1", name: "receipt.jpg", preview: "https://storage/scan-1.jpg"}];

    const {result} = renderHook(() =>
      usePostUploadPrompt({
        pendingUploadCount: 0,
        totalCompleted: 1,
        completedBatch,
        clearCompletedBatch,
      }),
    );

    expect(result.current.isVisible).toBe(false);

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.isVisible).toBe(true);
    expect(result.current.completedScans).toEqual(completedBatch);
    expect(clearCompletedBatch).toHaveBeenCalledOnce();
  });

  it("dismisses the visible prompt", () => {
    const completedBatch = [{id: "scan-1", name: "receipt.jpg", preview: "https://storage/scan-1.jpg"}];
    const {result} = renderHook(() =>
      usePostUploadPrompt({
        pendingUploadCount: 0,
        totalCompleted: 1,
        completedBatch,
        clearCompletedBatch: vi.fn(),
      }),
    );

    act(() => {
      vi.runAllTimers();
    });
    act(() => {
      result.current.dismissPrompt();
    });

    expect(result.current.isVisible).toBe(false);
  });

  it("remembers only the last three completed scans", () => {
    const completedBatch = Array.from({length: 5}, (_, index) => ({
      id: `scan-${index}`,
      name: `receipt-${index}.jpg`,
      preview: `https://storage/scan-${index}.jpg`,
    }));

    const {result} = renderHook(() =>
      usePostUploadPrompt({
        pendingUploadCount: 0,
        totalCompleted: 5,
        completedBatch,
        clearCompletedBatch: vi.fn(),
      }),
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(result.current.completedScans).toEqual(completedBatch.slice(-3));
    expect(result.current.completedScans).toHaveLength(3);
  });
});
