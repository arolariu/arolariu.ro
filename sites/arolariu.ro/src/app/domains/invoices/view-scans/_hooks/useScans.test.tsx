/**
 * @fileoverview Tests for useScans custom hook.
 * @module app/domains/invoices/view-scans/_hooks/useScans.test
 */

// Import types early for mock typing
import {ScanStatus, ScanType, type CachedScan} from "@/types/scans";

// Create mock store state and actions
const mockStoreState = {
  scans: [] as Array<CachedScan>,
  selectedScans: [] as Array<CachedScan>,
  hasHydrated: true,
  isSyncing: false,
  lastSyncTimestamp: null as Date | null,
  setScans: vi.fn(),
  toggleScanSelection: vi.fn(),
  selectAllScans: vi.fn(),
  clearSelectedScans: vi.fn(),
  setIsSyncing: vi.fn(),
  setLastSyncTimestamp: vi.fn(),
  removeScan: vi.fn(),
};

// Mock server-only modules FIRST
vi.mock("@/instrumentation.server", () => ({
  addSpanEvent: vi.fn(),
  logWithTrace: vi.fn(),
  withSpan: vi.fn((_name: string, fn: () => Promise<unknown>) => fn()),
  getTraceparentHeader: vi.fn(() => ""),
  injectTraceContextHeaders: vi.fn(() => ({})),
}));

vi.mock("@/lib/utils.server", () => ({
  fetchWithTimeout: vi.fn(),
}));

// Mock the fetchScans server action
const mockFetchScans = vi.fn();
vi.mock("@/lib/actions/scans", () => ({
  fetchScans: () => mockFetchScans(),
}));

// Mock the scans store
vi.mock("@/stores", () => {
  const useScansStore = vi.fn((selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState));
  // The hook reads the latest `isSyncing` via `useScansStore.getState()` to
  // avoid stale-closure issues; expose it on the mock so tests can exercise
  // both the in-flight guard and the cross-instance contract.
  (useScansStore as unknown as {getState: () => typeof mockStoreState}).getState = () => mockStoreState;
  return {useScansStore};
});

// Mock zustand shallow
vi.mock("zustand/react/shallow", () => ({
  useShallow: vi.fn((fn: unknown) => fn),
}));

// Mock the toast utility so we can assert on success/error calls.
// Use `vi.hoisted` because `vi.mock` is hoisted above top-level declarations.
const {mockToast} = vi.hoisted(() => ({
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));
vi.mock("@arolariu/components", () => ({
  toast: mockToast,
}));

// Import vitest functions AFTER mocks
import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// Import remaining types (CachedScan already imported above for mock typing)

// Import after mocks
import {useScans} from "./useScans";

describe("useScans", () => {
  const createMockScan = (overrides: Partial<CachedScan> = {}): CachedScan => ({
    id: "scan-001",
    userIdentifier: "user-123",
    name: "receipt.jpg",
    mimeType: "image/jpeg",
    scanType: ScanType.JPEG,
    status: ScanStatus.READY,
    blobUrl: "https://storage.blob.core.windows.net/invoices/scans/user-123/scan-001.jpg",
    sizeInBytes: 1024,
    uploadedAt: new Date(),
    metadata: {},
    cachedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock store state
    mockStoreState.scans = [];
    mockStoreState.selectedScans = [];
    mockStoreState.hasHydrated = true;
    mockStoreState.isSyncing = false;
    mockStoreState.lastSyncTimestamp = null;
    mockFetchScans.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should return empty scans array when store is empty", () => {
      const {result} = renderHook(() => useScans());

      expect(result.current.scans).toEqual([]);
      expect(result.current.selectedScans).toEqual([]);
    });

    it("should return hasHydrated from store", () => {
      mockStoreState.hasHydrated = true;

      const {result} = renderHook(() => useScans());

      expect(result.current.hasHydrated).toBe(true);
    });

    it("should return isSyncing from store", () => {
      mockStoreState.isSyncing = true;

      const {result} = renderHook(() => useScans());

      expect(result.current.isSyncing).toBe(true);
    });

    it("should return lastSyncTimestamp from store", () => {
      const timestamp = new Date("2024-01-15");
      mockStoreState.lastSyncTimestamp = timestamp;

      const {result} = renderHook(() => useScans());

      expect(result.current.lastSyncTimestamp).toEqual(timestamp);
    });
  });

  describe("scan filtering", () => {
    it("should only return READY scans", () => {
      const readyScan = createMockScan({id: "ready-scan", status: ScanStatus.READY});
      const archivedScan = createMockScan({id: "archived-scan", status: ScanStatus.ARCHIVED});
      const processingScan = createMockScan({id: "processing-scan", status: ScanStatus.PROCESSING});
      mockStoreState.scans = [readyScan, archivedScan, processingScan];

      const {result} = renderHook(() => useScans());

      expect(result.current.scans).toHaveLength(1);
      expect(result.current.scans[0]?.id).toBe("ready-scan");
    });

    it("should return all READY scans when multiple exist", () => {
      const scan1 = createMockScan({id: "scan-1", status: ScanStatus.READY});
      const scan2 = createMockScan({id: "scan-2", status: ScanStatus.READY});
      mockStoreState.scans = [scan1, scan2];

      const {result} = renderHook(() => useScans());

      expect(result.current.scans).toHaveLength(2);
    });
  });

  describe("actions", () => {
    it("should expose toggleSelection action", () => {
      const {result} = renderHook(() => useScans());
      const scan = createMockScan();

      act(() => {
        result.current.toggleSelection(scan);
      });

      expect(mockStoreState.toggleScanSelection).toHaveBeenCalledWith(scan);
    });

    it("should expose selectAll action", () => {
      const {result} = renderHook(() => useScans());

      act(() => {
        result.current.selectAll();
      });

      expect(mockStoreState.selectAllScans).toHaveBeenCalled();
    });

    it("should expose clearSelection action", () => {
      const {result} = renderHook(() => useScans());

      act(() => {
        result.current.clearSelection();
      });

      expect(mockStoreState.clearSelectedScans).toHaveBeenCalled();
    });

    it("should expose removeScan action", () => {
      const {result} = renderHook(() => useScans());

      act(() => {
        result.current.removeScan("scan-123");
      });

      expect(mockStoreState.removeScan).toHaveBeenCalledWith("scan-123");
    });
  });

  describe("syncScans", () => {
    it("should fetch scans and update store", async () => {
      const fetchedScans = [
        {
          id: "scan-001",
          userIdentifier: "user-123",
          name: "receipt.jpg",
          mimeType: "image/jpeg",
          scanType: ScanType.JPEG,
          status: ScanStatus.READY,
          blobUrl: "https://storage.blob.core.windows.net/invoices/scans/user-123/scan-001.jpg",
          size: 1024,
          uploadedAt: new Date(),
        },
      ];
      mockFetchScans.mockResolvedValue(fetchedScans);

      const {result} = renderHook(() => useScans());

      await act(async () => {
        await result.current.syncScans();
      });

      expect(mockStoreState.setIsSyncing).toHaveBeenCalledWith(true);
      expect(mockFetchScans).toHaveBeenCalled();
      expect(mockStoreState.setScans).toHaveBeenCalled();
      expect(mockStoreState.setLastSyncTimestamp).toHaveBeenCalled();
      expect(mockStoreState.setIsSyncing).toHaveBeenCalledWith(false);
    });

    it("should not sync when already syncing", async () => {
      mockStoreState.isSyncing = true;

      const {result} = renderHook(() => useScans());

      await act(async () => {
        await result.current.syncScans();
      });

      expect(mockFetchScans).not.toHaveBeenCalled();
    });

    it("should handle sync errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetchScans.mockRejectedValue(new Error("Network error"));

      const {result} = renderHook(() => useScans());

      await act(async () => {
        await result.current.syncScans(true);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to sync scans:", expect.any(Error));
      expect(mockStoreState.setIsSyncing).toHaveBeenCalledWith(false);
      consoleErrorSpy.mockRestore();
    });

    it("should NOT show error toast for auto-sync (manual=false) failures", async () => {
      // Regression: previously every auto-sync failure spammed a toast,
      // which combined with an infinite re-render loop froze the page on
      // mobile networks. Auto-sync failures must now stay silent.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetchScans.mockRejectedValue(new Error("Network error"));

      const {result} = renderHook(() => useScans());

      await act(async () => {
        await result.current.syncScans(false);
      });

      expect(mockToast.error).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should show error toast for manual sync (manual=true) failures", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockFetchScans.mockRejectedValue(new Error("Network error"));

      const {result} = renderHook(() => useScans());

      await act(async () => {
        await result.current.syncScans(true);
      });

      expect(mockToast.error).toHaveBeenCalledWith("Failed to sync scans");
      consoleErrorSpy.mockRestore();
    });

    it("should suppress error toast when component is unmounted before sync rejects", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Use a deferred promise so we can control when the fetch resolves/rejects
      let rejectFetch!: (err: Error) => void;
      const deferredFetch = new Promise<never>((_, reject) => {
        rejectFetch = reject;
      });
      mockFetchScans.mockReturnValue(deferredFetch);

      const {result, unmount} = renderHook(() => useScans());

      // Kick off the sync as a MANUAL sync — manual=true is what makes the
      // error toast path eligible to fire at all. The mount guard then
      // suppresses it because the component unmounts before the rejection.
      let syncDone = false;
      const syncPromise = result.current.syncScans(true).then(() => {
        syncDone = true;
      });

      // Unmount to set isMountedRef.current = false
      unmount();

      // Now reject the deferred fetch
      rejectFetch(new Error("Network error after unmount"));
      await syncPromise.catch(() => {});
      await Promise.resolve(); // flush microtasks

      expect(syncDone).toBe(true);
      expect(mockStoreState.setIsSyncing).toHaveBeenCalledWith(false);
      // The suppression contract: with isMountedRef.current=false, the
      // error toast must NOT fire even though sync rejected. console.error
      // still logs (the guard wraps only the toast call).
      expect(mockToast.error).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should add cachedAt timestamp to fetched scans", async () => {
      const fetchedScans = [
        {
          id: "scan-001",
          userIdentifier: "user-123",
          name: "receipt.jpg",
          mimeType: "image/jpeg",
          scanType: ScanType.JPEG,
          status: ScanStatus.READY,
          blobUrl: "https://storage.blob.core.windows.net/invoices/scans/user-123/scan-001.jpg",
          size: 1024,
          uploadedAt: new Date(),
        },
      ];
      mockFetchScans.mockResolvedValue(fetchedScans);

      const {result} = renderHook(() => useScans());

      await act(async () => {
        await result.current.syncScans();
      });

      expect(mockStoreState.setScans).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "scan-001",
            cachedAt: expect.any(Date),
          }),
        ]),
      );
    });
  });

  describe("manual sync", () => {
    it("should show success toast when manual=true and component is mounted", async () => {
      mockFetchScans.mockResolvedValue([]);

      const {result} = renderHook(() => useScans());

      await act(async () => {
        await result.current.syncScans(true);
      });

      expect(mockStoreState.setScans).toHaveBeenCalled();
      expect(mockStoreState.setLastSyncTimestamp).toHaveBeenCalled();
      expect(mockStoreState.setIsSyncing).toHaveBeenCalledWith(false);
      // The manual-sync contract: success toast fires exactly when
      // `manual=true && isMountedRef.current=true`.
      expect(mockToast.success).toHaveBeenCalledWith("Scans synced successfully");
    });
  });

  describe("auto-sync behavior", () => {
    it("should auto-sync when hydrated and no lastSyncTimestamp", async () => {
      mockStoreState.hasHydrated = true;
      mockStoreState.lastSyncTimestamp = null;
      mockFetchScans.mockResolvedValue([]);

      renderHook(() => useScans());

      await waitFor(() => {
        expect(mockFetchScans).toHaveBeenCalled();
      });
    });

    it("should not auto-sync when lastSyncTimestamp exists", () => {
      mockStoreState.hasHydrated = true;
      mockStoreState.lastSyncTimestamp = new Date();

      renderHook(() => useScans());

      expect(mockFetchScans).not.toHaveBeenCalled();
    });

    it("should not auto-sync when not hydrated", () => {
      mockStoreState.hasHydrated = false;
      mockStoreState.lastSyncTimestamp = null;

      renderHook(() => useScans());

      expect(mockFetchScans).not.toHaveBeenCalled();
    });

    it("should not loop when auto-sync fails (regression for mobile freeze)", async () => {
      // Regression: when `isSyncing` was a dep of the `syncScans` useCallback,
      // each `setIsSyncing(true)`/`setIsSyncing(false)` toggle recreated
      // `syncScans`, which in turn changed the auto-sync effect's deps and
      // re-fired the effect. On a failing fetch (lastSyncTimestamp stays
      // null) this created an infinite loop that froze mobile devices and
      // spammed "failed to sync" toasts. The fix removes `isSyncing` from
      // the callback's deps and reads it via `useScansStore.getState()`.
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockStoreState.hasHydrated = true;
      mockStoreState.lastSyncTimestamp = null;
      mockFetchScans.mockRejectedValue(new Error("Network error"));

      renderHook(() => useScans());

      // Wait for the auto-sync to fire and reject.
      await waitFor(() => {
        expect(mockFetchScans).toHaveBeenCalled();
      });

      // Give React several ticks to flush any re-renders / re-runs that the
      // old buggy code would have produced.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // No auto-sync toast spam.
      // NOTE: this assertion is what actually caught the regression for the
      // user-visible symptom. The fetch-count assertion below is a weaker
      // smoke check — the test mock does not reproduce Zustand's reactivity
      // (setIsSyncing here is a `vi.fn()` that does NOT mutate state and
      // therefore does NOT trigger React re-renders), so the in-test loop
      // never spins up. The referential-stability test below is the real
      // structural guarantee that the loop cannot occur.
      expect(mockToast.error).not.toHaveBeenCalled();
      expect(mockFetchScans).toHaveBeenCalledTimes(1);
      consoleErrorSpy.mockRestore();
    });

    it("should keep syncScans referentially stable when isSyncing toggles (regression invariant)", () => {
      // STRUCTURAL regression test: the freeze was caused by
      // `syncScans` being recreated every time `isSyncing` flipped, which
      // changed the auto-sync useEffect's dep array and re-fired the effect.
      //
      // This test forces the mock store's `isSyncing` value to flip across
      // renders (simulating what `setIsSyncing(true)` then `setIsSyncing(false)`
      // would do in the real store) and asserts that `syncScans` keeps the
      // same identity. If `isSyncing` ever sneaks back into the useCallback
      // dep array, this assertion fails and we have proven the loop is back.
      mockStoreState.hasHydrated = true;
      mockStoreState.lastSyncTimestamp = new Date(); // suppress auto-sync
      mockStoreState.isSyncing = false;

      const {result, rerender} = renderHook(() => useScans());
      const syncScansAtMount = result.current.syncScans;

      // Flip isSyncing -> true and rerender.
      mockStoreState.isSyncing = true;
      rerender();
      expect(result.current.syncScans).toBe(syncScansAtMount);

      // Flip isSyncing -> false and rerender again.
      mockStoreState.isSyncing = false;
      rerender();
      expect(result.current.syncScans).toBe(syncScansAtMount);
    });
  });
});
