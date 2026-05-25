/**
 * @fileoverview Unit tests for useScanRename hook.
 * @module app/domains/invoices/_hooks/useScanRename.test
 */

import {updateScan} from "@/lib/actions/scans";
import {useScansStore} from "@/stores";
import type {CachedScan} from "@/types/scans";
import {toast} from "@arolariu/components";
import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useScanRename} from "./useScanRename";

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

describe("useScanRename", () => {
  const mockUpdateScanName = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useScansStore).mockReturnValue(mockUpdateScanName);
  });

  it("should initialize with correct default state", () => {
    const {result} = renderHook(() => useScanRename(mockScan));

    expect(result.current.value).toBe(mockScan.name);
    expect(result.current.isEditing).toBe(false);
    expect(result.current.isCommitting).toBe(false);
    expect(result.current.justRenamed).toBe(false);
    expect(result.current.inputRef.current).toBeNull();
  });

  it("should start editing mode", () => {
    const {result} = renderHook(() => useScanRename(mockScan));

    act(() => {
      result.current.start();
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.value).toBe(mockScan.name);
  });

  it("should cancel editing and restore original name", () => {
    const {result} = renderHook(() => useScanRename(mockScan));

    act(() => {
      result.current.start();
      result.current.change("new-name.jpg");
    });

    expect(result.current.value).toBe("new-name.jpg");

    act(() => {
      result.current.cancel();
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.value).toBe(mockScan.name);
  });

  it("should update value when change is called", () => {
    const {result} = renderHook(() => useScanRename(mockScan));

    act(() => {
      result.current.start();
      result.current.change("updated-name.jpg");
    });

    expect(result.current.value).toBe("updated-name.jpg");
  });

  it("should commit successfully when value differs and is non-empty", async () => {
    vi.mocked(updateScan).mockResolvedValue({
      success: true,
      blobUrl: mockScan.blobUrl,
    });

    const {result} = renderHook(() => useScanRename(mockScan));

    act(() => {
      result.current.start();
      result.current.change("new-name.jpg");
    });

    await act(async () => {
      await result.current.commit();
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.justRenamed).toBe(true);
    expect(mockUpdateScanName).toHaveBeenCalledWith(mockScan.id, "new-name.jpg");
    expect(toast.success).toHaveBeenCalled();
  });

  it("should silently exit when committing unchanged value", async () => {
    const {result} = renderHook(() => useScanRename(mockScan));

    act(() => {
      result.current.start();
    });

    await act(async () => {
      await result.current.commit();
    });

    expect(result.current.isEditing).toBe(false);
    expect(updateScan).not.toHaveBeenCalled();
    expect(mockUpdateScanName).not.toHaveBeenCalled();
  });

  it("should silently exit when committing empty value", async () => {
    const {result} = renderHook(() => useScanRename(mockScan));

    act(() => {
      result.current.start();
      result.current.change("   ");
    });

    await act(async () => {
      await result.current.commit();
    });

    expect(result.current.isEditing).toBe(false);
    expect(mockUpdateScanName).not.toHaveBeenCalled();
  });

  it("should reset justRenamed flag after timeout", async () => {
    vi.useFakeTimers();

    const {result} = renderHook(() => useScanRename(mockScan));

    act(() => {
      result.current.start();
      result.current.change("new-name.jpg");
    });

    await act(async () => {
      await result.current.commit();
    });

    expect(result.current.justRenamed).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.justRenamed).toBe(false);

    vi.useRealTimers();
  });
});
