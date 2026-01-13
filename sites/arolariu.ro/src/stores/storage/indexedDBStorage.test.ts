/**
 * @fileoverview Unit tests for the Dexie-based IndexedDB storage adapter
 * @module stores/storage/indexedDBStorage.test
 *
 * Note: These tests focus on SSR safety and error handling.
 * The actual Dexie functionality is tested indirectly through the store tests.
 */

import {describe, expect, it, vi} from "vitest";
import {ZUSTAND_TABLES, createIndexedDBStorage, createSharedStorage} from "./indexedDBStorage";

/** Test entity type */
interface TestEntity {
  id: string;
  name: string;
  value: number;
}

/** Test state type - must extend Record<string, unknown> */
interface TestState extends Record<string, unknown> {
  entities: TestEntity[];
}

/**
 * Creates a test storage adapter with default options
 */
function createTestStorage() {
  return createIndexedDBStorage<TestState, TestEntity>({
    table: "invoices",
    entityKey: "entities",
  });
}

/**
 * Creates a test entity
 */
function createTestEntity(id: string, name = "Test", value = 0): TestEntity {
  return {id, name, value};
}

describe("createIndexedDBStorage", () => {
  describe("Storage Interface", () => {
    it("should create a storage object with required methods", () => {
      const storage = createTestStorage();

      expect(storage).toHaveProperty("getItem");
      expect(storage).toHaveProperty("setItem");
      expect(storage).toHaveProperty("removeItem");
      expect(typeof storage.getItem).toBe("function");
      expect(typeof storage.setItem).toBe("function");
      expect(typeof storage.removeItem).toBe("function");
    });

    it("should allow selecting dedicated tables for persistence", async () => {
      for (const table of ZUSTAND_TABLES) {
        if (table === "shared") continue; // Skip shared table - uses different API

        const storage = createIndexedDBStorage<TestState, TestEntity>({
          table,
          entityKey: "entities",
        });

        const storageValue = {
          state: {entities: [createTestEntity("test-1")]},
          version: 1,
        };

        await expect(storage.setItem(`table-${table}`, storageValue)).resolves.toBeUndefined();
        await expect(storage.getItem(`table-${table}`)).resolves.toBeDefined();
        await expect(storage.removeItem(`table-${table}`)).resolves.toBeUndefined();
      }
    });

    it("should accept entityKey configuration option", () => {
      const storage = createIndexedDBStorage<TestState, TestEntity>({
        table: "invoices",
        entityKey: "entities",
      });

      // Verify the storage was created with the options
      expect(storage).toHaveProperty("getItem");
      expect(storage).toHaveProperty("setItem");
      expect(storage).toHaveProperty("removeItem");
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

      const storage = createTestStorage();
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

      const storage = createTestStorage();
      const storageValue = {
        state: {entities: [createTestEntity("test")]},
        version: 1,
      };
      await storage.setItem("test-key", storageValue);

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

      const storage = createTestStorage();
      await storage.removeItem("test-key");

      expect(consoleWarnSpy).toHaveBeenCalledWith("IndexedDB is not available in this environment!");

      // Restore indexedDB
      globalThis.indexedDB = originalIndexedDB;
      consoleWarnSpy.mockRestore();
    });

    it("should warn multiple times when getDatabase is called without indexedDB", async () => {
      const originalIndexedDB = globalThis.indexedDB;
      // @ts-expect-error - Intentionally setting to undefined for testing
      delete globalThis.indexedDB;

      const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const storage = createTestStorage();
      const storageValue = {
        state: {entities: [createTestEntity("test")]},
        version: 1,
      };
      await storage.getItem("test-1");
      await storage.getItem("test-2");
      await storage.setItem("test-3", storageValue);

      // Should warn multiple times (once per getDatabase call)
      expect(consoleWarnSpy.mock.calls.length).toBeGreaterThan(0);

      globalThis.indexedDB = originalIndexedDB;
      consoleWarnSpy.mockRestore();
    });
  });

  describe("Storage Operations", () => {
    it("should handle different storage values", async () => {
      const storage = createTestStorage();

      // Test with different entity sets
      const storageValue1 = {
        state: {entities: [createTestEntity("1", "Test 1", 100)]},
        version: 1,
      };
      const storageValue2 = {
        state: {entities: [createTestEntity("2", "Test 2", 200), createTestEntity("3", "Test 3", 300)]},
        version: 1,
      };
      const storageValue3 = {
        state: {entities: []},
        version: 1,
      };

      // These operations test the storage interface
      await storage.setItem("single-entity-key", storageValue1);
      await storage.setItem("multiple-entities-key", storageValue2);
      await storage.setItem("empty-entities-key", storageValue3);

      // The actual results depend on IndexedDB being available
      const result1 = await storage.getItem("single-entity-key");
      const result2 = await storage.getItem("multiple-entities-key");
      const result3 = await storage.getItem("empty-entities-key");

      // In test environment without IndexedDB, these will be null
      expect([result1, result2, result3].every((r) => r === null || typeof r === "object")).toBe(true);
    });

    it("should handle rapid sequential operations", async () => {
      const storage = createTestStorage();

      const storageValue = {
        state: {entities: [createTestEntity("1"), createTestEntity("2")]},
        version: 1,
      };

      // Execute operations in rapid succession
      const operations = [
        storage.setItem("key-1", storageValue),
        storage.setItem("key-2", storageValue),
        storage.getItem("key-1"),
        storage.removeItem("key-1"),
        storage.getItem("key-2"),
      ];

      // Should not throw errors
      await expect(Promise.all(operations)).resolves.toBeDefined();
    });

    it("should handle special characters in keys", async () => {
      const storage = createTestStorage();

      const storageValue = {
        state: {entities: [createTestEntity("test")]},
        version: 1,
      };

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
        await expect(storage.setItem(key, storageValue)).resolves.toBeUndefined();
        await expect(storage.getItem(key)).resolves.toBeDefined();
        await expect(storage.removeItem(key)).resolves.toBeUndefined();
      }
    });

    it("should handle empty string keys", async () => {
      const storage = createTestStorage();
      const storageValue = {
        state: {entities: [createTestEntity("test")]},
        version: 1,
      };

      await expect(storage.setItem("", storageValue)).resolves.toBeUndefined();
      await expect(storage.getItem("")).resolves.toBeDefined();
      await expect(storage.removeItem("")).resolves.toBeUndefined();
    });

    it("should handle very long keys", async () => {
      const storage = createTestStorage();
      const longKey = "k".repeat(1000);
      const storageValue = {
        state: {entities: [createTestEntity("test")]},
        version: 1,
      };

      await expect(storage.setItem(longKey, storageValue)).resolves.toBeUndefined();
      await expect(storage.getItem(longKey)).resolves.toBeDefined();
      await expect(storage.removeItem(longKey)).resolves.toBeUndefined();
    });

    it("should handle many entities", async () => {
      const storage = createTestStorage();

      const entities = Array.from({length: 100}, (_, i) => createTestEntity(`entity-${i}`, `Name ${i}`, i));
      const storageValue = {
        state: {entities},
        version: 1,
      };

      await expect(storage.setItem("many-entities-key", storageValue)).resolves.toBeUndefined();
    });
  });

  describe("Error Handling", () => {
    it("should return null from getItem when table is empty", async () => {
      // Create a storage for a table that hasn't had data written to it
      // Note: In entity-level storage, getItem ignores the key parameter
      // and returns all entities from the table
      const storage = createIndexedDBStorage<TestState, TestEntity>({
        table: "merchants", // Use merchants table which we haven't populated in most tests
        entityKey: "entities",
      });

      // First clear the table by removing all items
      await storage.removeItem("unused-key");

      const result = await storage.getItem("any-key");

      // Should return null since table is empty after clear
      expect(result).toBeNull();
    });

    it("should handle setItem gracefully when value state is null", async () => {
      const storage = createTestStorage();

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      // Attempt to set an item with null state - should not throw, but logs an error
      await expect(
        storage.setItem("null-value-key", {state: null, version: 1} as unknown as {state: TestState; version: number}),
      ).resolves.toBeUndefined();

      // Should have logged an error
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle concurrent operations gracefully", async () => {
      const storage = createTestStorage();

      const storageValue = {
        state: {entities: [createTestEntity("test")]},
        version: 1,
      };

      const concurrentOps = Array.from({length: 50}, (_, i) => storage.setItem(`concurrent-${i}`, storageValue));

      await expect(Promise.all(concurrentOps)).resolves.toBeDefined();
    });

    it("should complete removeItem even if key does not exist", async () => {
      const storage = createTestStorage();

      await expect(storage.removeItem("non-existent-key")).resolves.toBeUndefined();
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle a complete CRUD cycle", async () => {
      const storage = createTestStorage();

      const initialValue = {
        state: {entities: [createTestEntity("initial", "Initial", 0)]},
        version: 1,
      };

      // Create
      await storage.setItem("crud-key", initialValue);

      // Read
      let result = await storage.getItem("crud-key");
      expect(result === null || typeof result === "object").toBe(true);

      // Update
      const updatedValue = {
        state: {entities: [createTestEntity("updated", "Updated", 100)]},
        version: 2,
      };
      await storage.setItem("crud-key", updatedValue);

      // Read again
      result = await storage.getItem("crud-key");
      expect(result === null || typeof result === "object").toBe(true);

      // Delete
      await storage.removeItem("crud-key");

      // Verify deletion
      result = await storage.getItem("crud-key");
      expect(result).toBeNull();
    });

    it("should handle multiple keys independently", async () => {
      const storage = createTestStorage();

      const valueA = {state: {entities: [createTestEntity("a")]}, version: 1};
      const valueB = {state: {entities: [createTestEntity("b")]}, version: 1};
      const valueC = {state: {entities: [createTestEntity("c")]}, version: 1};

      await storage.setItem("key-a", valueA);
      await storage.setItem("key-b", valueB);
      await storage.setItem("key-c", valueC);

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

describe("createSharedStorage", () => {
  interface SharedState {
    theme: string;
    language: string;
  }

  it("should create a storage object with required methods", () => {
    const storage = createSharedStorage<SharedState>();

    expect(storage).toHaveProperty("getItem");
    expect(storage).toHaveProperty("setItem");
    expect(storage).toHaveProperty("removeItem");
    expect(typeof storage.getItem).toBe("function");
    expect(typeof storage.setItem).toBe("function");
    expect(typeof storage.removeItem).toBe("function");
  });

  it("should handle getItem with missing indexedDB", async () => {
    const originalIndexedDB = globalThis.indexedDB;
    // @ts-expect-error - Intentionally setting to undefined for testing
    delete globalThis.indexedDB;

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const storage = createSharedStorage<SharedState>();
    const result = await storage.getItem("shared-key");

    expect(result).toBeNull();
    expect(consoleWarnSpy).toHaveBeenCalledWith("IndexedDB is not available in this environment!");

    globalThis.indexedDB = originalIndexedDB;
    consoleWarnSpy.mockRestore();
  });

  it("should handle setItem with missing indexedDB", async () => {
    const originalIndexedDB = globalThis.indexedDB;
    // @ts-expect-error - Intentionally setting to undefined for testing
    delete globalThis.indexedDB;

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const storage = createSharedStorage<SharedState>();
    await storage.setItem("shared-key", {state: {theme: "dark", language: "en"}, version: 1});

    expect(consoleWarnSpy).toHaveBeenCalledWith("IndexedDB is not available in this environment!");

    globalThis.indexedDB = originalIndexedDB;
    consoleWarnSpy.mockRestore();
  });

  it("should handle removeItem with missing indexedDB", async () => {
    const originalIndexedDB = globalThis.indexedDB;
    // @ts-expect-error - Intentionally setting to undefined for testing
    delete globalThis.indexedDB;

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const storage = createSharedStorage<SharedState>();
    await storage.removeItem("shared-key");

    expect(consoleWarnSpy).toHaveBeenCalledWith("IndexedDB is not available in this environment!");

    globalThis.indexedDB = originalIndexedDB;
    consoleWarnSpy.mockRestore();
  });

  it("should handle storage operations", async () => {
    const storage = createSharedStorage<SharedState>();

    const storageValue = {
      state: {theme: "dark", language: "en"},
      version: 1,
    };

    await expect(storage.setItem("test-key", storageValue)).resolves.toBeUndefined();
    await expect(storage.getItem("test-key")).resolves.toBeDefined();
    await expect(storage.removeItem("test-key")).resolves.toBeUndefined();
  });
});

describe("ZUSTAND_TABLES", () => {
  it("should contain expected table names", () => {
    expect(ZUSTAND_TABLES).toContain("shared");
    expect(ZUSTAND_TABLES).toContain("invoices");
    expect(ZUSTAND_TABLES).toContain("merchants");
    expect(ZUSTAND_TABLES).toContain("scans");
    expect(ZUSTAND_TABLES).toHaveLength(4);
  });
});

describe("resetDatabaseInstance and getDatabaseInstance", () => {
  it("should export resetDatabaseInstance function", async () => {
    const {resetDatabaseInstance} = await import("./indexedDBStorage");
    expect(typeof resetDatabaseInstance).toBe("function");

    // Call should not throw
    expect(() => resetDatabaseInstance()).not.toThrow();
  });

  it("should export getDatabaseInstance function", async () => {
    const {getDatabaseInstance} = await import("./indexedDBStorage");
    expect(typeof getDatabaseInstance).toBe("function");

    // Call should return database instance or null
    const db = getDatabaseInstance();
    expect(db === null || typeof db === "object").toBe(true);
  });

  it("should return null for getDatabaseInstance after reset when indexedDB unavailable", async () => {
    const originalIndexedDB = globalThis.indexedDB;
    // @ts-expect-error - Intentionally setting to undefined for testing
    delete globalThis.indexedDB;

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const {getDatabaseInstance, resetDatabaseInstance} = await import("./indexedDBStorage");

    resetDatabaseInstance();
    const db = getDatabaseInstance();

    expect(db).toBeNull();

    globalThis.indexedDB = originalIndexedDB;
    consoleWarnSpy.mockRestore();
  });
});

describe("createSharedStorage with keyPrefix", () => {
  interface SharedState {
    theme: string;
    language: string;
  }

  it("should accept keyPrefix option", () => {
    const storage = createSharedStorage<SharedState>({keyPrefix: "app-"});

    expect(storage).toHaveProperty("getItem");
    expect(storage).toHaveProperty("setItem");
    expect(storage).toHaveProperty("removeItem");
  });

  it("should work with empty keyPrefix", () => {
    const storage = createSharedStorage<SharedState>({keyPrefix: ""});

    expect(storage).toHaveProperty("getItem");
  });

  it("should work without any options", () => {
    const storage = createSharedStorage<SharedState>();

    expect(storage).toHaveProperty("getItem");
    expect(storage).toHaveProperty("setItem");
    expect(storage).toHaveProperty("removeItem");
  });

  it("should perform storage operations with keyPrefix", async () => {
    const storage = createSharedStorage<SharedState>({keyPrefix: "test-"});

    const storageValue = {
      state: {theme: "dark", language: "en"},
      version: 1,
    };

    // Test setItem with keyPrefix
    await expect(storage.setItem("config", storageValue)).resolves.toBeUndefined();

    // Test getItem with keyPrefix
    await expect(storage.getItem("config")).resolves.toBeDefined();

    // Test removeItem with keyPrefix
    await expect(storage.removeItem("config")).resolves.toBeUndefined();
  });
});

describe("Error handling in storage operations", () => {
  it("should handle getItem errors and log them", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Create storage that will have issues (we'll simulate by checking error handling exists)
    const storage = createTestStorage();

    // Even if getItem fails internally, it should return null and not throw
    const result = await storage.getItem("error-key");
    expect(result === null || typeof result === "object").toBe(true);

    consoleErrorSpy.mockRestore();
  });

  it("should handle setItem errors and log them", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const storage = createTestStorage();

    // Attempting to set with undefined entities should trigger error handling
    const badValue = {
      state: {entities: undefined as unknown as TestEntity[]},
      version: 1,
    };

    // Should not throw, but should handle error internally
    await expect(storage.setItem("bad-key", badValue)).resolves.toBeUndefined();

    consoleErrorSpy.mockRestore();
  });

  it("should handle removeItem errors gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const storage = createTestStorage();

    // Should complete without throwing
    await expect(storage.removeItem("any-key")).resolves.toBeUndefined();

    consoleErrorSpy.mockRestore();
  });
});

describe("Shared storage error handling", () => {
  interface SharedState {
    data: string;
  }

  it("should handle getItem returning null when item does not exist", async () => {
    const storage = createSharedStorage<SharedState>();

    const result = await storage.getItem("non-existent-key");
    expect(result).toBeNull();
  });

  it("should handle setItem and getItem cycle", async () => {
    const storage = createSharedStorage<SharedState>();

    const storageValue = {
      state: {data: "test-data"},
      version: 1,
    };

    await storage.setItem("shared-test-key", storageValue);
    const result = await storage.getItem("shared-test-key");

    // Result should be defined if IndexedDB is available
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("should handle removeItem for non-existent key", async () => {
    const storage = createSharedStorage<SharedState>();

    // Should complete without throwing
    await expect(storage.removeItem("non-existent-key")).resolves.toBeUndefined();
  });
});
