/**
 * @fileoverview Unit tests for useScanDelete hook.
 * @module app/domains/invoices/_hooks/useScanDelete.test
 */

import {deleteScan} from "@/lib/actions/scans";
import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {toast} from "@arolariu/components";
import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useScanDelete} from "./useScanDelete";

// Mock dependencies
vi.mock("@/lib/actions/scans");
vi.mock("@/stores");
vi.mock("@arolariu/components", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

const mockScan: CachedScan = {
  id: "scan-123",
  userIdentifier: "user_abc",
  name: "receipt-001.jpg",
  blobUrl: "https://cdn.arolariu.ro/scans/user_abc/scan-123.jpg",
  mimeType: "image/jpeg",
  sizeInBytes: 1048576,
  scanType: "JPEG",
  uploadedAt: new Date(),
  status: "ready",
  metadata: {},
  cachedAt: new Date(),
};

describe("useScanDelete", () => {
  const mockRemoveScan = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useScansStore).mockReturnValue(mockRemoveScan);
  });

  it("should initialize with isDeleting false", () => {
    const {result} = renderHook(() => useScanDelete(mockScan));

    expect(result.current.isDeleting).toBe(false);
  });

  it("should delete scan successfully", async () => {
    vi.mocked(deleteScan).mockResolvedValue({success: true});

    const {result} = renderHook(() => useScanDelete(mockScan));

    await act(async () => {
      await result.current.performDelete();
    });

    expect(deleteScan).toHaveBeenCalledWith({blobUrl: mockScan.blobUrl});
    expect(mockRemoveScan).toHaveBeenCalledWith(mockScan.id);
    expect(toast.success).toHaveBeenCalled();
    expect(result.current.isDeleting).toBe(false);
  });

  it("should handle deletion failure", async () => {
    vi.mocked(deleteScan).mockResolvedValue({success: false, error: "Deletion failed"});

    const {result} = renderHook(() => useScanDelete(mockScan));

    await act(async () => {
      await result.current.performDelete();
    });

    expect(deleteScan).toHaveBeenCalledWith({blobUrl: mockScan.blobUrl});
    expect(mockRemoveScan).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Deletion failed");
    expect(result.current.isDeleting).toBe(false);
  });

  it("should call onComplete callback after successful deletion", async () => {
    vi.mocked(deleteScan).mockResolvedValue({success: true});
    const onComplete = vi.fn();

    const {result} = renderHook(() => useScanDelete(mockScan, onComplete));

    await act(async () => {
      await result.current.performDelete();
    });

    expect(onComplete).toHaveBeenCalledOnce();
  });

  it("should not call onComplete callback on deletion failure", async () => {
    vi.mocked(deleteScan).mockResolvedValue({success: false, error: "Deletion failed"});
    const onComplete = vi.fn();

    const {result} = renderHook(() => useScanDelete(mockScan, onComplete));

    await act(async () => {
      await result.current.performDelete();
    });

    expect(onComplete).not.toHaveBeenCalled();
  });

  it("should handle exception during deletion", async () => {
    vi.mocked(deleteScan).mockRejectedValue(new Error("Network error"));

    const {result} = renderHook(() => useScanDelete(mockScan));

    await act(async () => {
      await result.current.performDelete();
    });

    expect(mockRemoveScan).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(result.current.isDeleting).toBe(false);
  });
});
