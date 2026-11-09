/**
 * @fileoverview Unit tests for the slim scan upload provider.
 * @module app/domains/invoices/upload-scans/_context/ScanUploadContext.test
 */

import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {notify} from "@/lib/notify";
import {ScanUploadProvider, useScanUpload} from "./ScanUploadContext";

vi.mock("@/lib/notify", async () => ({notify: (await import("@arolariu/components")).toast}));
vi.mock("@arolariu/components", () => ({
  toast: {success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn()},
}));

vi.mock("../../_actions/scans", () => ({
  createScan: vi.fn(),
  createScanUploadTarget: vi.fn(),
}));

describe("ScanUploadProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("toasts a localized message when uploading with an empty queue", async () => {
    const {result} = renderHook(() => useScanUpload(), {wrapper: ScanUploadProvider});

    await act(async () => {
      await result.current.uploadAll();
    });

    expect(notify.info).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notify.info).mock.calls[0]?.[0])).toContain("noFilesToUpload");
  });

  it("rejects an oversized file with a localized error toast and adds nothing", async () => {
    const {result} = renderHook(() => useScanUpload(), {wrapper: ScanUploadProvider});
    const oversized = new File([new Uint8Array(11 * 1024 * 1024)], "big.jpg", {type: "image/jpeg"});

    await act(async () => {
      await result.current.addFiles([oversized]);
    });

    expect(notify.error).toHaveBeenCalledTimes(1);
    expect(String(vi.mocked(notify.error).mock.calls[0]?.[0])).toContain("tooLarge");
    expect(result.current.pendingUploads).toHaveLength(0);
  });
});
