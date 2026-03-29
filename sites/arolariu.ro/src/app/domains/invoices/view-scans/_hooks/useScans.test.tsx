/**
 * @fileoverview Tests for useScans custom hook.
 * @module app/domains/invoices/view-scans/_hooks/useScans.test
 */

import {ScanStatus, ScanType, type CachedScan} from "@/types/scans";
import {act, renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// Create mock store state and actions
const mockStoreState = {
  scans: [] as CachedScan[],
  selectedScans: [] as CachedScan[],
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

// Mock the scans store
vi.mock("@/stores", () => ({
  useScansStore: vi.fn((selector: (state: typeof mockStoreState) => unknown) => selector(mockStoreState)),
}));

// Mock zustand shallow
vi.mock("zustand/react/shallow", () => ({
  useShallow: vi.fn((fn: unknown) => fn),
}));

// Mock the fetchScans server action
const mockFetchScans = vi.fn();
vi.mock("@/lib/actions/scans", () => ({
  fetchScans: () => mockFetchScans(),
}));

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
    size: 1024,
    uploadedAt: new Date(),
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
        await result.current.syncScans();
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to sync scans:", expect.any(Error));
      expect(mockStoreState.setIsSyncing).toHaveBeenCalledWith(false);
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
  });
});
