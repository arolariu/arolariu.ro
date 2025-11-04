/**
 * @fileoverview Dexie-based IndexedDB storage adapter for Zustand v5 persistence middleware
 * @module stores/storage/indexedDBStorage
 */

import Dexie, {type Table} from "dexie";
import type {PersistStorage, StorageValue} from "zustand/middleware";

/**
 * Store item structure in IndexedDB
 */
interface StoreItem {
  /** Unique key for the store item */
  key: string;
  /** Serialized state value */
  value: string;
}

/**
 * Dexie database class for Zustand state persistence
 */
class ZustandDB extends Dexie {
  /** Table for storing Zustand state */
  stores!: Table<StoreItem, string>;

  /**
   * Creates a new ZustandDB instance and configures the schema.
   */
  constructor() {
    super("arolariu-zustand-store");

    this.version(1).stores({
      stores: "key", // Primary key is 'key'
    });
  }
}

// Singleton instance of the database
let dbInstance: ZustandDB | null = null;

/**
 * Gets or creates the singleton database instance.
 * @returns The database instance or null if not in browser environment
 */
function getDatabase(): ZustandDB | null {
  if (typeof indexedDB === "undefined") {
    console.warn("IndexedDB is not available in this environment!");
    return null;
  }

  dbInstance ??= new ZustandDB();
  return dbInstance;
}

/**
 * Creates a Dexie-based IndexedDB storage adapter for Zustand persist middleware.
 * Uses Dexie for robust, type-safe IndexedDB operations with automatic error handling.
 * @returns PersistStorage interface implementation for IndexedDB using Dexie
 * @example
 * ```typescript
 * const storage = createIndexedDBStorage();
 * const useStore = create(
 *   persist(
 *     (set) => ({ ... }),
 *     { name: "user-storage", storage }
 *   )
 * );
 * ```
 */
export function createIndexedDBStorage<S>(): PersistStorage<S> {
  return {
    /**
     * Retrieves an item from IndexedDB using Dexie.
     * @param name The key to retrieve
     * @returns Promise resolving to the stored value or null if not found
     */
    getItem: async (name: string): Promise<StorageValue<S> | null> => {
      try {
        const db = getDatabase();
        if (!db) {
          return null;
        }

        const item = await db.stores.get(name);
        return (item?.value as unknown as StorageValue<S>) ?? null;
      } catch (error) {
        console.error("Error retrieving from IndexedDB via Dexie:", error);
        return null;
      }
    },

    /**
     * Stores an item in IndexedDB using Dexie.
     * @param name The key to store the value under
     * @param value The value to store (serialized state)
     */
    setItem: async (name: string, value: StorageValue<S>): Promise<void> => {
      try {
        const db = getDatabase();
        if (!db) {
          return;
        }

        await db.stores.put({
          key: name,
          value: value as unknown as string,
        });
      } catch (error) {
        console.error("Error storing to IndexedDB via Dexie:", error);
      }
    },

    /**
     * Removes an item from IndexedDB using Dexie.
     * @param name The key to remove
     */
    removeItem: async (name: string): Promise<void> => {
      try {
        const db = getDatabase();
        if (!db) {
          return;
        }

        await db.stores.delete(name);
      } catch (error) {
        console.error("Error removing from IndexedDB via Dexie:", error);
      }
    },
  };
}
