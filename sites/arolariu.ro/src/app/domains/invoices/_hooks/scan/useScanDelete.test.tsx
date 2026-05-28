/**
 * @fileoverview Unit tests for useScanDelete client hook.
 * @module app/domains/invoices/_hooks/scan/useScanDelete.test
 */

import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import type {ServerActionResult} from "@/lib/utils.server";
import {buildCachedScan} from "../../../../../../tests/helpers/invoiceDomain";
import {useScanDelete} from "./useScanDelete";

vi.mock("@/stores", () => ({
  useScansStore: vi.fn(),
}));

vi.mock("../../_actions/scans", () => ({
  deleteScan: vi.fn(),
}));

vi.mock("@arolariu/components", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("next-intl-selector", () => ({
  useTranslations: vi.fn(() => (fn: (m: {
    pages: {
      invoices: {
        viewScans: {
          scanCard: {
            deleteDialog: {
              success: string;
              error: string;
            };
          };
        };
      };
    };
  }) => string) => fn({
    pages: {
      invoices: {
        viewScans: {
          scanCard: {
            deleteDialog: {
              success: "Scan deleted",
              error: "Scan delete failed",
            },
          },
        },
      },
    },
  })),
}));

const {useScansStore} = await import("@/stores");
const {deleteScan} = await import("../../_actions/scans");
const {toast} = await import("@arolariu/components");

const mockUseScansStore = vi.mocked(useScansStore);
const mockDeleteScan = vi.mocked(deleteScan);
const mockToast = vi.mocked(toast);

describe("useScanDelete", () => {
  const testScan = buildCachedScan({
    id: "scan-1",
    blobUrl: "https://storage.test/invoices/scans/user-1/receipt.jpg",
  });
  const mockRemoveScan = vi.fn();
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mockUseScansStore.mockImplementation(((selector: (state: {
      removeScan: typeof mockRemoveScan;
    }) => typeof mockRemoveScan) => selector({
      removeScan: mockRemoveScan,
    })) as never);
    mockDeleteScan.mockResolvedValue({
      success: true,
      data: undefined,
    } satisfies ServerActionResult<void>);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns idle state and callback", () => {
    const {result} = renderHook(() => useScanDelete(testScan));

    expect(result.current.isDeleting).toBe(false);
    expect(typeof result.current.deleteScanCallback).toBe("function");
  });

  it("deletes the scan server-side before removing it locally", async () => {
    const {result} = renderHook(() => useScanDelete(testScan));

    await act(async () => {
      await result.current.deleteScanCallback();
    });

    expect(mockDeleteScan).toHaveBeenCalledWith({blobUrl: testScan.blobUrl});
    expect(mockRemoveScan).toHaveBeenCalledWith(testScan.id);
    expect(mockToast.success).toHaveBeenCalledWith("Scan deleted");
    expect(result.current.isDeleting).toBe(false);
  });

  it("does not remove the local scan when the server action fails", async () => {
    mockDeleteScan.mockResolvedValue({
      success: false,
      error: {message: "forbidden"},
    });
    const {result} = renderHook(() => useScanDelete(testScan));

    await act(async () => {
      await result.current.deleteScanCallback();
    });

    expect(mockRemoveScan).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith("Scan delete failed");
  });

  it("swallows thrown server errors after notifying and logging", async () => {
    const thrownError = new Error("network down");
    mockDeleteScan.mockRejectedValue(thrownError);
    const {result} = renderHook(() => useScanDelete(testScan));

    await act(async () => {
      await result.current.deleteScanCallback();
    });

    expect(mockRemoveScan).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith("Scan delete failed");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error deleting scan:", thrownError);
    expect(result.current.isDeleting).toBe(false);
  });

  it("catches local store removal failures and resets deletion state", async () => {
    const storeError = new Error("store unavailable");
    mockRemoveScan.mockImplementation(() => {
      throw storeError;
    });
    const {result} = renderHook(() => useScanDelete(testScan));

    await act(async () => {
      await result.current.deleteScanCallback();
    });

    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockToast.error).toHaveBeenCalledWith("Scan delete failed");
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error deleting scan:", storeError);
    expect(result.current.isDeleting).toBe(false);
  });

  it("sets isDeleting true while the server deletion is pending", async () => {
    let resolveDelete: ((value: ServerActionResult<void>) => void) | undefined;
    mockDeleteScan.mockReturnValue(new Promise((resolve) => {
      resolveDelete = resolve;
    }));
    const {result} = renderHook(() => useScanDelete(testScan));

    let pendingDelete: Promise<void> | undefined;
    act(() => {
      pendingDelete = result.current.deleteScanCallback();
    });

    await waitFor(() => {
      expect(result.current.isDeleting).toBe(true);
    });

    await act(async () => {
      resolveDelete?.({success: true, data: undefined});
      await pendingDelete;
    });

    expect(result.current.isDeleting).toBe(false);
  });
});
