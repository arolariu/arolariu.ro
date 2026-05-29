/**
 * @fileoverview Unit tests for useScanRename client hook.
 * @module app/domains/invoices/_hooks/scan/useScanRename.test
 */

import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {invokeHookCallback} from "../../../../../../tests/helpers";
import {buildCachedScan} from "../../../../../../tests/helpers/invoiceDomain";
import {useScanRename} from "./useScanRename";

vi.mock("@/stores", () => ({
  useScansStore: vi.fn(),
}));

vi.mock("@arolariu/components", () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock("next-intl-selector", () => ({
  useTranslations: vi.fn(
    () =>
      (
        fn: (m: {
          pages: {
            invoices: {
              viewScans: {
                scanCard: {
                  rename: string;
                };
              };
            };
          };
        }) => string,
      ) =>
        fn({
          pages: {
            invoices: {
              viewScans: {
                scanCard: {
                  rename: "Scan renamed",
                },
              },
            },
          },
        }),
  ),
}));

const {useScansStore} = await import("@/stores");
const {toast} = await import("@arolariu/components");

const mockUseScansStore = vi.mocked(useScansStore);
const mockToast = vi.mocked(toast);

describe("useScanRename", () => {
  const testScan = buildCachedScan({
    id: "scan-rename",
    name: "receipt.jpg",
  });
  const mockUpdateScanName = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockUseScansStore.mockImplementation(((selector: (state: {updateScanName: typeof mockUpdateScanName}) => typeof mockUpdateScanName) =>
      selector({
        updateScanName: mockUpdateScanName,
      })) as never);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initializes from the scan name", () => {
    const {result} = renderHook(() => useScanRename(testScan));

    expect(result.current.value).toBe("receipt.jpg");
    expect(result.current.isEditing).toBe(false);
    expect(result.current.isCommitting).toBe(false);
    expect(result.current.justRenamed).toBe(false);
    expect(result.current.inputRef.current).toBeNull();
  });

  it("enters edit mode and resets the current value to the scan name", () => {
    const {result} = renderHook(() => useScanRename(testScan));

    act(() => {
      result.current.change("draft name");
      result.current.start();
    });

    expect(result.current.isEditing).toBe(true);
    expect(result.current.value).toBe("receipt.jpg");
  });

  it("updates the draft value", () => {
    const {result} = renderHook(() => useScanRename(testScan));

    act(() => {
      result.current.change("renamed.png");
    });

    expect(result.current.value).toBe("renamed.png");
  });

  it("cancels editing and restores the original scan name", () => {
    const {result} = renderHook(() => useScanRename(testScan));

    act(() => {
      result.current.start();
      result.current.change("renamed.png");
      result.current.cancel();
    });

    expect(result.current.isEditing).toBe(false);
    expect(result.current.value).toBe("receipt.jpg");
  });

  it("commits a trimmed rename to the local store", async () => {
    const {result} = renderHook(() => useScanRename(testScan));

    act(() => {
      result.current.start();
      result.current.change("  renamed.png  ");
    });

    await invokeHookCallback(() => result.current.commit());

    expect(mockUpdateScanName).toHaveBeenCalledWith(testScan.id, "renamed.png");
    expect(mockToast.success).toHaveBeenCalledWith("Scan renamed");
    expect(result.current.isEditing).toBe(false);
    expect(result.current.justRenamed).toBe(true);

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.justRenamed).toBe(false);
  });

  it("exits edit mode without updating when the value is empty", async () => {
    const {result} = renderHook(() => useScanRename(testScan));

    act(() => {
      result.current.start();
      result.current.change("   ");
    });
    await invokeHookCallback(() => result.current.commit());

    expect(mockUpdateScanName).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(result.current.isEditing).toBe(false);
  });

  it("exits edit mode without updating when the trimmed value is unchanged", async () => {
    const {result} = renderHook(() => useScanRename(testScan));

    act(() => {
      result.current.start();
      result.current.change(" receipt.jpg ");
    });
    await invokeHookCallback(() => result.current.commit());

    expect(mockUpdateScanName).not.toHaveBeenCalled();
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(result.current.isEditing).toBe(false);
  });

  it("propagates store update failures without marking rename success", async () => {
    mockUpdateScanName.mockImplementation(() => {
      throw new Error("store failed");
    });
    const {result} = renderHook(() => useScanRename(testScan));

    act(() => {
      result.current.start();
      result.current.change("renamed.png");
    });

    await expect(invokeHookCallback(() => result.current.commit())).rejects.toThrow("store failed");

    expect(mockToast.success).not.toHaveBeenCalled();
    expect(result.current.justRenamed).toBe(false);
  });
});
