/**
 * @fileoverview Dexie-based IndexedDB storage adapter for Zustand v5 persistence middleware.
 * Implements entity-level persistence where each domain object is stored as an individual row.
 * @module stores/storage/indexedDBStorage
 */

import Dexie, {type Table} from "dexie";
import type {PersistStorage, StorageValue} from "zustand/middleware";

/**
 * Available tables for segregating persisted data by domain
 */
export const ZUSTAND_TABLES = ["shared", "invoices", "merchants"] as const;

/**
 * Table name type derived from ZUSTAND_TABLES
 */
export type ZustandTableName = (typeof ZUSTAND_TABLES)[number];

/**
 * Base entity interface requiring an id field for entity-level storage
 */
interface BaseEntity {
  /** Unique identifier for the entity */
  id: string;
}

/**
 * Shared table item structure for key-value storage
 */
interface SharedItem {
  /** Unique key for the shared item */
  key: string;
  /** Serialized value */
  value: string;
}

/**
 * Invoice entity structure in IndexedDB
 */
interface InvoiceItem extends BaseEntity {
  /** Reference to the merchant that issued the invoice */
  merchantReference: string;
  /** Full serialized invoice data */
  [key: string]: unknown;
}

/**
 * Merchant entity structure in IndexedDB
 */
interface MerchantItem extends BaseEntity {
  /** Reference to the parent company */
  parentCompanyId: string;
  /** Full serialized merchant data */
  [key: string]: unknown;
}

/**
 * Dexie database class for Zustand state persistence.
 * Stores each entity as an individual row for efficient querying and updates.
 */
class ZustandDB extends Dexie {
  /** Shared key-value table for general storage */
  shared!: Table<SharedItem, string>;
  /** Invoices table with entity-level storage */
  invoices!: Table<InvoiceItem, string>;
  /** Merchants table with entity-level storage */
  merchants!: Table<MerchantItem, string>;

  /**
   * Creates a new ZustandDB instance and configures the schema.
   * Uses a single version with no backwards compatibility migrations.
   */
  constructor() {
    super("zustand-store");

    // Fresh schema: entity-level storage with proper indexes
    // - shared: key-value pairs for general storage
    // - invoices: PK on id, index on merchantReference
    // - merchants: PK on id, index on parentCompanyId
    this.version(1).stores({
      shared: "key",
      invoices: "id,merchantReference",
      merchants: "id,parentCompanyId",
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
 * Entity table names (excluding shared)
 */
type EntityTableName = Exclude<ZustandTableName, "shared">;

/**
 * Options for customizing the IndexedDB storage adapter
 */
interface CreateIndexedDBStorageOptions<S> {
  /** Specific Dexie table to target (invoices or merchants) */
  table: EntityTableName;
  /**
   * Key in the state object that holds the entity array.
   * Used to extract entities for persistence and reconstruct state on hydration.
   */
  entityKey: keyof S & string;
}

/**
 * Helper to get the correct table from the database
 */
function getTable<E extends BaseEntity>(db: ZustandDB, tableName: EntityTableName): Table<E, string> {
  switch (tableName) {
    case "invoices":
      return db.invoices as unknown as Table<E, string>;
    case "merchants":
      return db.merchants as unknown as Table<E, string>;
    default:
      throw new Error(`Unknown table name: ${tableName}`);
  }
}

/**
 * Creates a Dexie-based IndexedDB storage adapter for Zustand persist middleware.
 * Implements entity-level persistence where each domain object is stored as an individual row.
 * Uses transactions for all operations to ensure data consistency.
 *
 * Note: Clients always start fresh - the store initializes with empty arrays,
 * then hydrates from IndexedDB via getItem.
 *
 * @param options Configuration for entity-level storage
 * @returns PersistStorage interface implementation for IndexedDB using Dexie
 * @example
 * ```typescript
 * const storage = createIndexedDBStorage<InvoicesPersistedState, Invoice>({
 *   table: "invoices",
 *   entityKey: "invoices",
 * });
 * ```
 */
export function createIndexedDBStorage<S extends object, E extends BaseEntity>(
  options: CreateIndexedDBStorageOptions<S>,
): PersistStorage<S> {
  const {table: tableName, entityKey} = options;

  return {
    /**
     * Retrieves all entities from IndexedDB and reconstructs state.
     * Wrapped in a read transaction for consistency.
     * @param _name The storage name (unused for entity-level storage)
     * @returns Promise resolving to the reconstructed state or null if empty
     */
    getItem: async (_name: string): Promise<StorageValue<S> | null> => {
      try {
        const db = getDatabase();
        if (!db) return null;

        const table = getTable<E>(db, tableName);
        const entities = await db.transaction("r", table, async () => table.toArray());

        if (entities.length === 0) {
          return null;
        }

        // Reconstruct state with the entity array under the entityKey
        const state = {[entityKey]: entities} as S;
        return {state, version: 0};
      } catch (error) {
        console.error(`Error retrieving entities from IndexedDB table '${tableName}':`, error);
        return null;
      }
    },

    /**
     * Persists entities to IndexedDB using diff-based sync.
     * Compares incoming entities with stored entities to determine additions, updates, and deletions.
     * Wrapped in a read-write transaction for atomicity.
     * @param _name The storage name (unused for entity-level storage)
     * @param value The state to persist
     */
    setItem: async (_name: string, value: StorageValue<S>): Promise<void> => {
      try {
        const db = getDatabase();
        if (!db) return;

        const entities = (value.state[entityKey] as E[]) ?? [];
        const table = getTable<E>(db, tableName);

        await db.transaction("rw", table, async () => {
          // Get current stored IDs
          const storedIds = await table.toCollection().primaryKeys();
          const storedIdSet = new Set(storedIds);

          // Determine incoming IDs
          const incomingIds = new Set(entities.map((entity) => entity.id));

          // Find IDs to delete (in stored but not in incoming)
          const idsToDelete = [...storedIdSet].filter((id) => !incomingIds.has(id));

          // Delete removed entities
          if (idsToDelete.length > 0) {
            await table.bulkDelete(idsToDelete);
          }

          // Upsert all current entities
          if (entities.length > 0) {
            await table.bulkPut(entities);
          }
        });
      } catch (error) {
        console.error(`Error persisting entities to IndexedDB table '${tableName}':`, error);
      }
    },

    /**
     * Clears all entities from the table.
     * This is called by Zustand's persist.clearStorage() to reset the persisted state.
     * Wrapped in a read-write transaction for safety.
     * @param _name The storage name (unused for entity-level storage)
     */
    removeItem: async (_name: string): Promise<void> => {
      try {
        const db = getDatabase();
        if (!db) return;

        const table = getTable<E>(db, tableName);
        await db.transaction("rw", table, async () => {
          await table.clear();
        });
      } catch (error) {
        console.error(`Error clearing IndexedDB table '${tableName}':`, error);
      }
    },
  };
}

/**
 * Options for the shared key-value storage adapter
 */
interface CreateSharedStorageOptions {
  /** Optional storage key prefix */
  keyPrefix?: string;
}

/**
 * Creates a simple key-value storage adapter for the shared table.
 * Unlike entity storage, this stores serialized state snapshots.
 * @param options Optional configuration
 * @returns PersistStorage interface for key-value storage
 */
export function createSharedStorage<S>(options?: CreateSharedStorageOptions): PersistStorage<S> {
  const keyPrefix = options?.keyPrefix ?? "";

  return {
    getItem: async (name: string): Promise<StorageValue<S> | null> => {
      try {
        const db = getDatabase();
        /* v8 ignore next - Defensive guard for IndexedDB unavailability */
        if (!db) return null;

        const item = await db.transaction("r", db.shared, async () => db.shared.get(keyPrefix + name));

        if (!item) return null;
        return JSON.parse(item.value) as StorageValue<S>;
      } catch (error) {
        console.error("Error retrieving from shared storage:", error);
        return null;
      }
    },

    setItem: async (name: string, value: StorageValue<S>): Promise<void> => {
      try {
        const db = getDatabase();
        /* v8 ignore next - Defensive guard for IndexedDB unavailability */
        if (!db) return;

        await db.transaction("rw", db.shared, async () => {
          await db.shared.put({
            key: keyPrefix + name,
            value: JSON.stringify(value),
          });
        });
      } catch (error) {
        console.error("Error storing to shared storage:", error);
      }
    },

    removeItem: async (name: string): Promise<void> => {
      try {
        const db = getDatabase();
        /* v8 ignore next - Defensive guard for IndexedDB unavailability */
        if (!db) return;

        await db.transaction("rw", db.shared, async () => {
          await db.shared.delete(keyPrefix + name);
        });
      } catch (error) {
        console.error("Error removing from shared storage:", error);
      }
    },
  };
}

/**
 * Resets the database singleton instance.
 * Useful for testing or when needing to reinitialize the database.
 */
export function resetDatabaseInstance(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Gets direct access to the database instance for advanced operations.
 * Use with caution - prefer the storage adapters for standard operations.
 * @returns The database instance or null if not available
 */
export function getDatabaseInstance(): ZustandDB | null {
  return getDatabase();
}
