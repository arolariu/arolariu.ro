/**
 * @fileoverview Unit tests for the scans Zustand store
 * @module stores/scansStore.test
 *
 * Note: These tests focus on store logic and state management.
 * IndexedDB persistence is tested separately in indexedDBStorage.test.ts.
 */

import type {CachedScan} from "@/types/scans";
import {ScanStatus, ScanType} from "@/types/scans";
import {act} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

// Mock IndexedDB storage to avoid actual persistence during tests
vi.mock("./storage/indexedDBStorage", () => ({
  createIndexedDBStorage: () => ({
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Import store after mocking
import {useScansStore} from "./scansStore";

/**
 * Creates a test scan with default values
 */
function createTestScan(id: string, overrides: Partial<CachedScan> = {}): CachedScan {
  return {
    id,
    userIdentifier: "test-user",
    name: `Scan ${id}`,
    blobUrl: `https://storage.blob.core.windows.net/invoices/scans/test-user/${id}.jpg`,
    mimeType: "image/jpeg",
    sizeInBytes: 1024,
    scanType: ScanType.JPEG,
    uploadedAt: new Date("2024-01-01"),
    status: ScanStatus.READY,
    metadata: {},
    cachedAt: new Date(),
    ...overrides,
  };
}

describe("useScansStore", () => {
  beforeEach(() => {
    // Reset store state before each test
    const store = useScansStore.getState();
    store.clearScans();
    store.setHasHydrated(false);
    store.setIsSyncing(false);
    store.setLastSyncTimestamp(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Initial State", () => {
    it("should have empty scans array initially", () => {
      const {scans} = useScansStore.getState();
      expect(scans).toEqual([]);
    });

    it("should have empty selectedScans array initially", () => {
      const {selectedScans} = useScansStore.getState();
      expect(selectedScans).toEqual([]);
    });

    it("should have hasHydrated as false initially", () => {
      const {hasHydrated} = useScansStore.getState();
      expect(hasHydrated).toBe(false);
    });

    it("should have isSyncing as false initially", () => {
      const {isSyncing} = useScansStore.getState();
      expect(isSyncing).toBe(false);
    });

    it("should have lastSyncTimestamp as null initially", () => {
      const {lastSyncTimestamp} = useScansStore.getState();
      expect(lastSyncTimestamp).toBeNull();
    });
  });

  describe("setScans", () => {
    it("should set scans array", () => {
      const scans = [createTestScan("1"), createTestScan("2")];

      act(() => {
        useScansStore.getState().setScans(scans);
      });

      expect(useScansStore.getState().scans).toEqual(scans);
    });

    it("should replace existing scans", () => {
      const initialScans = [createTestScan("1")];
      const newScans = [createTestScan("2"), createTestScan("3")];

      act(() => {
        useScansStore.getState().setScans(initialScans);
        useScansStore.getState().setScans(newScans);
      });

      expect(useScansStore.getState().scans).toEqual(newScans);
      expect(useScansStore.getState().scans).not.toContainEqual(initialScans[0]);
    });
  });

  describe("addScan", () => {
    it("should add a scan to the store", () => {
      const scan = createTestScan("1");

      act(() => {
        useScansStore.getState().addScan(scan);
      });

      expect(useScansStore.getState().scans).toContainEqual(scan);
    });

    it("should append to existing scans", () => {
      const scan1 = createTestScan("1");
      const scan2 = createTestScan("2");

      act(() => {
        useScansStore.getState().addScan(scan1);
        useScansStore.getState().addScan(scan2);
      });

      expect(useScansStore.getState().scans).toHaveLength(2);
      expect(useScansStore.getState().scans).toContainEqual(scan1);
      expect(useScansStore.getState().scans).toContainEqual(scan2);
    });
  });

  describe("upsertScan", () => {
    it("should add a new scan if it does not exist", () => {
      const scan = createTestScan("1");

      act(() => {
        useScansStore.getState().upsertScan(scan);
      });

      expect(useScansStore.getState().scans).toContainEqual(scan);
    });

    it("should update an existing scan if it exists", () => {
      const originalScan = createTestScan("1", {name: "Original"});
      const updatedScan = createTestScan("1", {name: "Updated"});

      act(() => {
        useScansStore.getState().addScan(originalScan);
        useScansStore.getState().upsertScan(updatedScan);
      });

      expect(useScansStore.getState().scans).toHaveLength(1);
      expect(useScansStore.getState().scans[0]?.name).toBe("Updated");
    });
  });

  describe("removeScan", () => {
    it("should remove a scan by ID", () => {
      const scan1 = createTestScan("1");
      const scan2 = createTestScan("2");

      act(() => {
        useScansStore.getState().setScans([scan1, scan2]);
        useScansStore.getState().removeScan("1");
      });

      expect(useScansStore.getState().scans).toHaveLength(1);
      expect(useScansStore.getState().scans).not.toContainEqual(scan1);
      expect(useScansStore.getState().scans).toContainEqual(scan2);
    });

    it("should also remove from selectedScans", () => {
      const scan = createTestScan("1");

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().toggleScanSelection(scan);
        useScansStore.getState().removeScan("1");
      });

      expect(useScansStore.getState().selectedScans).toHaveLength(0);
    });

    it("should do nothing if scan ID does not exist", () => {
      const scan = createTestScan("1");

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().removeScan("non-existent");
      });

      expect(useScansStore.getState().scans).toHaveLength(1);
    });
  });

  describe("removeScans", () => {
    it("should remove multiple scans by ID", () => {
      const scan1 = createTestScan("1");
      const scan2 = createTestScan("2");
      const scan3 = createTestScan("3");

      act(() => {
        useScansStore.getState().setScans([scan1, scan2, scan3]);
        useScansStore.getState().removeScans(["1", "3"]);
      });

      expect(useScansStore.getState().scans).toHaveLength(1);
      expect(useScansStore.getState().scans).toContainEqual(scan2);
    });

    it("should also remove from selectedScans", () => {
      const scan1 = createTestScan("1");
      const scan2 = createTestScan("2");

      act(() => {
        useScansStore.getState().setScans([scan1, scan2]);
        useScansStore.getState().toggleScanSelection(scan1);
        useScansStore.getState().toggleScanSelection(scan2);
        useScansStore.getState().removeScans(["1"]);
      });

      expect(useScansStore.getState().selectedScans).toHaveLength(1);
      expect(useScansStore.getState().selectedScans).toContainEqual(scan2);
    });
  });

  describe("updateScanStatus", () => {
    it("should update a scan status", () => {
      const scan = createTestScan("1", {status: ScanStatus.READY});

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().updateScanStatus("1", ScanStatus.ARCHIVED);
      });

      expect(useScansStore.getState().scans[0]?.status).toBe(ScanStatus.ARCHIVED);
    });

    it("should also update status in selectedScans", () => {
      const scan = createTestScan("1", {status: ScanStatus.READY});

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().toggleScanSelection(scan);
        useScansStore.getState().updateScanStatus("1", ScanStatus.PROCESSING);
      });

      expect(useScansStore.getState().selectedScans[0]?.status).toBe(ScanStatus.PROCESSING);
    });
  });

  describe("updateScanName", () => {
    it("should update a scan name", () => {
      const scan = createTestScan("1", {name: "Original"});

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().updateScanName("1", "New Name");
      });

      expect(useScansStore.getState().scans[0]?.name).toBe("New Name");
    });

    it("should also update name in selectedScans", () => {
      const scan = createTestScan("1", {name: "Original"});

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().toggleScanSelection(scan);
        useScansStore.getState().updateScanName("1", "New Name");
      });

      expect(useScansStore.getState().selectedScans[0]?.name).toBe("New Name");
    });
  });

  describe("toggleScanSelection", () => {
    it("should add scan to selectedScans when not selected", () => {
      const scan = createTestScan("1");

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().toggleScanSelection(scan);
      });

      expect(useScansStore.getState().selectedScans).toContainEqual(scan);
    });

    it("should remove scan from selectedScans when already selected", () => {
      const scan = createTestScan("1");

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().toggleScanSelection(scan);
        useScansStore.getState().toggleScanSelection(scan);
      });

      expect(useScansStore.getState().selectedScans).toHaveLength(0);
    });
  });

  describe("selectAllScans", () => {
    it("should select all ready scans", () => {
      const readyScan1 = createTestScan("1", {status: ScanStatus.READY});
      const readyScan2 = createTestScan("2", {status: ScanStatus.READY});
      const archivedScan = createTestScan("3", {status: ScanStatus.ARCHIVED});

      act(() => {
        useScansStore.getState().setScans([readyScan1, readyScan2, archivedScan]);
        useScansStore.getState().selectAllScans();
      });

      expect(useScansStore.getState().selectedScans).toHaveLength(2);
      expect(useScansStore.getState().selectedScans).toContainEqual(readyScan1);
      expect(useScansStore.getState().selectedScans).toContainEqual(readyScan2);
      expect(useScansStore.getState().selectedScans).not.toContainEqual(archivedScan);
    });
  });

  describe("clearSelectedScans", () => {
    it("should clear all selected scans", () => {
      const scan1 = createTestScan("1");
      const scan2 = createTestScan("2");

      act(() => {
        useScansStore.getState().setScans([scan1, scan2]);
        useScansStore.getState().toggleScanSelection(scan1);
        useScansStore.getState().toggleScanSelection(scan2);
        useScansStore.getState().clearSelectedScans();
      });

      expect(useScansStore.getState().selectedScans).toHaveLength(0);
    });
  });

  describe("archiveScans", () => {
    it("should set status to ARCHIVED for specified scans", () => {
      const scan1 = createTestScan("1");
      const scan2 = createTestScan("2");

      act(() => {
        useScansStore.getState().setScans([scan1, scan2]);
        useScansStore.getState().archiveScans(["1"]);
      });

      expect(useScansStore.getState().scans.find((s) => s.id === "1")?.status).toBe(ScanStatus.ARCHIVED);
      expect(useScansStore.getState().scans.find((s) => s.id === "2")?.status).toBe(ScanStatus.READY);
    });

    it("should remove archived scans from selectedScans", () => {
      const scan1 = createTestScan("1");
      const scan2 = createTestScan("2");

      act(() => {
        useScansStore.getState().setScans([scan1, scan2]);
        useScansStore.getState().toggleScanSelection(scan1);
        useScansStore.getState().toggleScanSelection(scan2);
        useScansStore.getState().archiveScans(["1"]);
      });

      expect(useScansStore.getState().selectedScans).toHaveLength(1);
      expect(useScansStore.getState().selectedScans).toContainEqual(scan2);
    });
  });

  describe("clearScans", () => {
    it("should clear all scans and selectedScans", () => {
      const scan1 = createTestScan("1");
      const scan2 = createTestScan("2");

      act(() => {
        useScansStore.getState().setScans([scan1, scan2]);
        useScansStore.getState().toggleScanSelection(scan1);
        useScansStore.getState().clearScans();
      });

      expect(useScansStore.getState().scans).toHaveLength(0);
      expect(useScansStore.getState().selectedScans).toHaveLength(0);
    });
  });

  describe("setHasHydrated", () => {
    it("should set hasHydrated state", () => {
      act(() => {
        useScansStore.getState().setHasHydrated(true);
      });

      expect(useScansStore.getState().hasHydrated).toBe(true);
    });
  });

  describe("setIsSyncing", () => {
    it("should set isSyncing state", () => {
      act(() => {
        useScansStore.getState().setIsSyncing(true);
      });

      expect(useScansStore.getState().isSyncing).toBe(true);
    });
  });

  describe("setLastSyncTimestamp", () => {
    it("should set lastSyncTimestamp", () => {
      const timestamp = new Date();

      act(() => {
        useScansStore.getState().setLastSyncTimestamp(timestamp);
      });

      expect(useScansStore.getState().lastSyncTimestamp).toBe(timestamp);
    });

    it("should allow setting to null", () => {
      const timestamp = new Date();

      act(() => {
        useScansStore.getState().setLastSyncTimestamp(timestamp);
        useScansStore.getState().setLastSyncTimestamp(null);
      });

      expect(useScansStore.getState().lastSyncTimestamp).toBeNull();
    });
  });

  describe("setSelectedScans", () => {
    it("should directly set selectedScans", () => {
      const scan1 = createTestScan("1");
      const scan2 = createTestScan("2");

      act(() => {
        useScansStore.getState().setScans([scan1, scan2]);
        useScansStore.getState().setSelectedScans([scan1]);
      });

      expect(useScansStore.getState().selectedScans).toEqual([scan1]);
    });
  });

  describe("updateScanMetadata", () => {
    it("should update metadata for a specific scan", () => {
      const scan = createTestScan("1", {metadata: {key1: "value1"}});

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().updateScanMetadata("1", {key2: "value2"});
      });

      const updatedScan = useScansStore.getState().scans[0];
      expect(updatedScan?.metadata).toEqual({key1: "value1", key2: "value2"});
    });

    it("should merge with existing metadata", () => {
      const scan = createTestScan("1", {metadata: {existing: "data"}});

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().updateScanMetadata("1", {new: "value"});
      });

      const updatedScan = useScansStore.getState().scans[0];
      expect(updatedScan?.metadata).toEqual({existing: "data", new: "value"});
    });

    it("should also update metadata in selectedScans", () => {
      const scan = createTestScan("1", {metadata: {}});

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().toggleScanSelection(scan);
        useScansStore.getState().updateScanMetadata("1", {updated: "true"});
      });

      const selectedScan = useScansStore.getState().selectedScans[0];
      expect(selectedScan?.metadata).toEqual({updated: "true"});
    });

    it("should not affect other scans", () => {
      const scan1 = createTestScan("1", {metadata: {original: "1"}});
      const scan2 = createTestScan("2", {metadata: {original: "2"}});

      act(() => {
        useScansStore.getState().setScans([scan1, scan2]);
        useScansStore.getState().updateScanMetadata("1", {changed: "true"});
      });

      const unchanged = useScansStore.getState().scans.find((s) => s.id === "2");
      expect(unchanged?.metadata).toEqual({original: "2"});
    });
  });

  describe("markScansAsUsedByInvoice", () => {
    it("should mark a scan as used by an invoice", () => {
      const scan = createTestScan("1");

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().markScansAsUsedByInvoice(["1"], "invoice-123");
      });

      const markedScan = useScansStore.getState().scans[0];
      expect(markedScan?.metadata.usedByInvoice).toBe("true");
      expect(markedScan?.metadata.invoiceId).toBe("invoice-123");
      expect(markedScan?.metadata.invoiceCreatedAt).toBeDefined();
    });

    it("should mark multiple scans as used by the same invoice", () => {
      const scan1 = createTestScan("1");
      const scan2 = createTestScan("2");
      const scan3 = createTestScan("3");

      act(() => {
        useScansStore.getState().setScans([scan1, scan2, scan3]);
        useScansStore.getState().markScansAsUsedByInvoice(["1", "2"], "invoice-456");
      });

      const scans = useScansStore.getState().scans;
      expect(scans.find((s) => s.id === "1")?.metadata.usedByInvoice).toBe("true");
      expect(scans.find((s) => s.id === "2")?.metadata.usedByInvoice).toBe("true");
      expect(scans.find((s) => s.id === "3")?.metadata.usedByInvoice).toBeUndefined();
    });

    it("should preserve existing metadata when marking", () => {
      const scan = createTestScan("1", {metadata: {existingKey: "existingValue"}});

      act(() => {
        useScansStore.getState().setScans([scan]);
        useScansStore.getState().markScansAsUsedByInvoice(["1"], "invoice-789");
      });

      const markedScan = useScansStore.getState().scans[0];
      expect(markedScan?.metadata.existingKey).toBe("existingValue");
      expect(markedScan?.metadata.usedByInvoice).toBe("true");
    });

    it("should not affect scans not in the scanIds list", () => {
      const scan1 = createTestScan("1");
      const scan2 = createTestScan("2");

      act(() => {
        useScansStore.getState().setScans([scan1, scan2]);
        useScansStore.getState().markScansAsUsedByInvoice(["1"], "invoice-abc");
      });

      const unmarkedScan = useScansStore.getState().scans.find((s) => s.id === "2");
      expect(unmarkedScan?.metadata.usedByInvoice).toBeUndefined();
    });
  });
});
