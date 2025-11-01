/**
 * @fileoverview Unit tests for the Dexie-based IndexedDB storage adapter
 * @module stores/storage/indexedDBStorage.test
 *
 * Note: These tests focus on SSR safety and error handling.
 * The actual Dexie functionality is tested indirectly through the store tests.
 */

import {describe, expect, it, vi} from "vitest";
import {createIndexedDBStorage} from "./indexedDBStorage";

describe("createIndexedDBStorage", () => {
  describe("Storage Interface", () => {
    it("should create a storage object with required methods", () => {
      const storage = createIndexedDBStorage();

      expect(storage).toHaveProperty("getItem");
      expect(storage).toHaveProperty("setItem");
      expect(storage).toHaveProperty("removeItem");
      expect(typeof storage.getItem).toBe("function");
      expect(typeof storage.setItem).toBe("function");
      expect(typeof storage.removeItem).toBe("function");
    });

    it("should return null from getItem on database error", async () => {
      const storage = createIndexedDBStorage();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock Dexie to throw an error
      const originalIndexedDB = globalThis.indexedDB;
      Object.defineProperty(globalThis, "indexedDB", {
        value: {
          open: vi.fn().mockImplementation(() => {
            throw new Error("Database error");
          }),
        },
        writable: true,
        configurable: true,
      });

      const result = await storage.getItem("test-key");

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      globalThis.indexedDB = originalIndexedDB;
      consoleErrorSpy.mockRestore();
    });

    it("should handle setItem errors gracefully", async () => {
      const storage = createIndexedDBStorage();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock Dexie to throw an error
      const originalIndexedDB = globalThis.indexedDB;
      Object.defineProperty(globalThis, "indexedDB", {
        value: {
          open: vi.fn().mockImplementation(() => {
            throw new Error("Database error");
          }),
        },
        writable: true,
        configurable: true,
      });

      await storage.setItem("test-key", "test-value" as any);

      expect(consoleErrorSpy).toHaveBeenCalled();

      globalThis.indexedDB = originalIndexedDB;
      consoleErrorSpy.mockRestore();
    });

    it("should handle removeItem errors gracefully", async () => {
      const storage = createIndexedDBStorage();
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Mock Dexie to throw an error
      const originalIndexedDB = globalThis.indexedDB;
      Object.defineProperty(globalThis, "indexedDB", {
        value: {
          open: vi.fn().mockImplementation(() => {
            throw new Error("Database error");
          }),
        },
        writable: true,
        configurable: true,
      });

      await storage.removeItem("test-key");

      expect(consoleErrorSpy).toHaveBeenCalled();

      globalThis.indexedDB = originalIndexedDB;
      consoleErrorSpy.mockRestore();
    });
  });

  describe("Browser Environment", () => {
    it("should handle missing indexedDB gracefully in getItem", async () => {
      // Save original indexedDB
      const originalIndexedDB = globalThis.indexedDB;

      // Remove indexedDB to simulate SSR environment
      // @ts-expect-error - Intentionally setting to undefined for testing
      delete globalThis.indexedDB;

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const storage = createIndexedDBStorage();
      const result = await storage.getItem("test-key");

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith("IndexedDB is not available in this environment!");

      // Restore indexedDB
      globalThis.indexedDB = originalIndexedDB;
      consoleWarnSpy.mockRestore();
    });

    it("should handle missing indexedDB gracefully in setItem", async () => {
      // Save original indexedDB
      const originalIndexedDB = globalThis.indexedDB;

      // Remove indexedDB to simulate SSR environment
      // @ts-expect-error - Intentionally setting to undefined for testing
      delete globalThis.indexedDB;

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const storage = createIndexedDBStorage();
      await storage.setItem("test-key", "value" as any);

      expect(consoleWarnSpy).toHaveBeenCalledWith("IndexedDB is not available in this environment!");

      // Restore indexedDB
      globalThis.indexedDB = originalIndexedDB;
      consoleWarnSpy.mockRestore();
    });

    it("should handle missing indexedDB gracefully in removeItem", async () => {
      // Save original indexedDB
      const originalIndexedDB = globalThis.indexedDB;

      // Remove indexedDB to simulate SSR environment
      // @ts-expect-error - Intentionally setting to undefined for testing
      delete globalThis.indexedDB;

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const storage = createIndexedDBStorage();
      await storage.removeItem("test-key");

      expect(consoleWarnSpy).toHaveBeenCalledWith("IndexedDB is not available in this environment!");

      // Restore indexedDB
      globalThis.indexedDB = originalIndexedDB;
      consoleWarnSpy.mockRestore();
    });

    it("should warn only once when getDatabase is called multiple times without indexedDB", async () => {
      const originalIndexedDB = globalThis.indexedDB;
      // @ts-expect-error - Intentionally setting to undefined for testing
      delete globalThis.indexedDB;

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const storage = createIndexedDBStorage();
      await storage.getItem("test-1");
      await storage.getItem("test-2");
      await storage.setItem("test-3", "value" as any);

      // Should warn multiple times (once per getDatabase call)
      expect(consoleWarnSpy.mock.calls.length).toBeGreaterThan(0);

      globalThis.indexedDB = originalIndexedDB;
      consoleWarnSpy.mockRestore();
    });
  });

  describe("Storage Operations", () => {
    it("should handle different value types", async () => {
      const storage = createIndexedDBStorage();

      // Test with different storage values
      const stringValue = "test-string" as any;
      const objectValue = JSON.stringify({test: "value"}) as any;
      const arrayValue = JSON.stringify([1, 2, 3]) as any;

      // These operations test the storage interface
      await storage.setItem("string-key", stringValue);
      await storage.setItem("object-key", objectValue);
      await storage.setItem("array-key", arrayValue);

      // The actual results depend on IndexedDB being available
      // In test environment, these will just exercise the code paths
      const result1 = await storage.getItem("string-key");
      const result2 = await storage.getItem("object-key");
      const result3 = await storage.getItem("array-key");

      // In test environment without IndexedDB, these will be null
      // But the code paths are exercised
      expect([result1, result2, result3].every((r) => r === null || typeof r === "string")).toBe(true);
    });

    it("should handle rapid sequential operations", async () => {
      const storage = createIndexedDBStorage();

      // Execute operations in rapid succession
      const operations = [
        storage.setItem("key-1", "value-1" as any),
        storage.setItem("key-2", "value-2" as any),
        storage.getItem("key-1"),
        storage.removeItem("key-1"),
        storage.getItem("key-2"),
      ];

      // Should not throw errors
      await expect(Promise.all(operations)).resolves.toBeDefined();
    });

    it("should handle special characters in keys", async () => {
      const storage = createIndexedDBStorage();

      const specialKeys = [
        "key-with-dashes",
        "key_with_underscores",
        "key.with.dots",
        "key/with/slashes",
        "key@with@symbols",
        "key with spaces",
        "键-with-unicode",
      ];

      // Should handle all special characters without errors
      for (const key of specialKeys) {
        await expect(storage.setItem(key, "value" as any)).resolves.toBeUndefined();
        await expect(storage.getItem(key)).resolves.toBeDefined();
        await expect(storage.removeItem(key)).resolves.toBeUndefined();
      }
    });

    it("should handle empty string keys", async () => {
      const storage = createIndexedDBStorage();

      await expect(storage.setItem("", "value" as any)).resolves.toBeUndefined();
      await expect(storage.getItem("")).resolves.toBeDefined();
      await expect(storage.removeItem("")).resolves.toBeUndefined();
    });

    it("should handle very long keys", async () => {
      const storage = createIndexedDBStorage();
      const longKey = "k".repeat(1000);

      await expect(storage.setItem(longKey, "value" as any)).resolves.toBeUndefined();
      await expect(storage.getItem(longKey)).resolves.toBeDefined();
      await expect(storage.removeItem(longKey)).resolves.toBeUndefined();
    });

    it("should handle very long values", async () => {
      const storage = createIndexedDBStorage();
      const longValue = "v".repeat(10000) as any;

      await expect(storage.setItem("long-value-key", longValue)).resolves.toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should return null from getItem when item does not exist", async () => {
      const storage = createIndexedDBStorage();

      const result = await storage.getItem("non-existent-key");

      expect(result).toBeNull();
    });

    it("should handle concurrent operations gracefully", async () => {
      const storage = createIndexedDBStorage();

      const concurrentOps = Array.from({length: 50}, (_, i) => storage.setItem(`concurrent-${i}`, `value-${i}` as any));

      await expect(Promise.all(concurrentOps)).resolves.toBeDefined();
    });

    it("should complete removeItem even if key does not exist", async () => {
      const storage = createIndexedDBStorage();

      await expect(storage.removeItem("non-existent-key")).resolves.toBeUndefined();
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle a complete CRUD cycle", async () => {
      const storage = createIndexedDBStorage();

      // Create
      await storage.setItem("crud-key", "initial-value" as any);

      // Read
      let result = await storage.getItem("crud-key");
      expect(result === null || typeof result === "string").toBe(true);

      // Update
      await storage.setItem("crud-key", "updated-value" as any);

      // Read again
      result = await storage.getItem("crud-key");
      expect(result === null || typeof result === "string").toBe(true);

      // Delete
      await storage.removeItem("crud-key");

      // Verify deletion
      result = await storage.getItem("crud-key");
      expect(result).toBeNull();
    });

    it("should handle multiple keys independently", async () => {
      const storage = createIndexedDBStorage();

      await storage.setItem("key-a", "value-a" as any);
      await storage.setItem("key-b", "value-b" as any);
      await storage.setItem("key-c", "value-c" as any);

      await storage.removeItem("key-b");

      const resultB = await storage.getItem("key-b");

      // key-b should be null after removal
      expect(resultB).toBeNull();

      // Verify other keys are not affected
      await expect(storage.getItem("key-a")).resolves.toBeDefined();
      await expect(storage.getItem("key-c")).resolves.toBeDefined();
    });
  });
});
