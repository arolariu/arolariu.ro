/**
 * @fileoverview Generic Zustand store factory for entity management with IndexedDB persistence.
 * Eliminates code duplication across invoices, merchants, and scans stores.
 * @module stores/createEntityStore
 */

import {create, type StateCreator} from "zustand";
import {devtools, persist, type PersistOptions} from "zustand/middleware";
import {createIndexedDBStorage, type ZustandTableName} from "./storage/indexedDBStorage";

/**
 * Base entity interface requiring an id field for entity-level storage.
 */
export interface BaseEntity {
  /** Unique identifier for the entity */
  readonly id: string;
}

/**
 * Generic persisted state interface for entity stores.
 * @template E - Entity type extending BaseEntity
 */
export interface EntityPersistedState<E extends BaseEntity> {
  /** All entities in the store */
  readonly entities: ReadonlyArray<E>;
}

/**
 * Generic in-memory state interface for entity stores.
 * @template E - Entity type extending BaseEntity
 */
export interface EntityState<E extends BaseEntity> extends EntityPersistedState<E> {
  /** Currently selected entities (in-memory only, not persisted) */
  selectedEntities: E[];
  /** Indicates whether the store has been hydrated from IndexedDB */
  hasHydrated: boolean;
}

/**
 * Generic actions interface for entity stores.
 * @template E - Entity type extending BaseEntity
 */
export interface EntityActions<E extends BaseEntity> {
  /**
   * Sets the complete list of entities
   * @param entities - The new entities array
   */
  setEntities: (entities: ReadonlyArray<E>) => void;

  /**
   * Sets the selected entities
   * @param selectedEntities - The new selected entities array
   */
  setSelectedEntities: (selectedEntities: E[]) => void;

  /**
   * Upserts a single entity to the store (updates if exists, adds if not).
   * This is the preferred method for adding/updating entities to avoid duplicates.
   * @param entity - The entity to upsert
   */
  upsertEntity: (entity: E) => void;

  /**
   * Removes an entity by ID
   * @param entityId - The ID of the entity to remove
   */
  removeEntity: (entityId: string) => void;

  /**
   * Updates an existing entity
   * @param entityId - The ID of the entity to update
   * @param updates - Partial entity data to update
   */
  updateEntity: (entityId: string, updates: Partial<E>) => void;

  /**
   * Toggles an entity's selection status
   * @param entity - The entity to toggle
   */
  toggleEntitySelection: (entity: E) => void;

  /**
   * Clears all selected entities
   */
  clearSelectedEntities: () => void;

  /**
   * Clears all entities from the store
   */
  clearEntities: () => void;

  /**
   * Gets an entity by ID
   * @param entityId - The ID of the entity to find
   * @returns The entity if found, undefined otherwise
   */
  getEntityById: (entityId: string) => E | undefined;

  /**
   * Sets the hydration status
   * @param hasHydrated - Whether the store has been hydrated
   */
  setHasHydrated: (hasHydrated: boolean) => void;
}

/**
 * Combined store type for entity stores.
 * @template E - Entity type extending BaseEntity
 */
export type EntityStore<E extends BaseEntity> = EntityState<E> & EntityActions<E>;

/**
 * Configuration options for creating an entity store.
 */
export interface CreateEntityStoreOptions {
  /** The IndexedDB table name to use for persistence */
  tableName: Exclude<ZustandTableName, "shared">;
  /** Human-readable store name for DevTools */
  storeName: string;
  /** Key used for persist middleware name */
  persistName: string;
}

/**
 * Creates the entity slice with state and actions.
 * @template E - Entity type extending BaseEntity
 */
function createEntitySlice<E extends BaseEntity>(
  set: (partial: Partial<EntityStore<E>> | ((state: EntityStore<E>) => Partial<EntityStore<E>>)) => void,
  get: () => EntityStore<E>,
): EntityStore<E> {
  return {
    // State
    entities: [],
    selectedEntities: [],
    hasHydrated: false,

    // Actions
    setEntities: (entities) => set({entities}),

    setSelectedEntities: (selectedEntities) => set({selectedEntities}),

    upsertEntity: (entity) =>
      set((state) => {
        const existingIndex = state.entities.findIndex((e) => e.id === entity.id);
        if (existingIndex !== -1) {
          // Update existing entity
          const updatedEntities = [...state.entities];
          updatedEntities[existingIndex] = entity;
          return {entities: updatedEntities};
        }
        // Add new entity
        return {entities: [...state.entities, entity]};
      }),

    removeEntity: (entityId) =>
      set((state) => ({
        entities: state.entities.filter((e) => e.id !== entityId),
        selectedEntities: state.selectedEntities.filter((e) => e.id !== entityId),
      })),

    updateEntity: (entityId, updates) =>
      set((state) => ({
        entities: state.entities.map((e) => (e.id === entityId ? {...e, ...updates} : e)),
        selectedEntities: state.selectedEntities.map((e) => (e.id === entityId ? {...e, ...updates} : e)),
      })),

    toggleEntitySelection: (entity) =>
      set((state) => {
        const isSelected = state.selectedEntities.some((e) => e.id === entity.id);
        return {
          selectedEntities: isSelected ? state.selectedEntities.filter((e) => e.id !== entity.id) : [...state.selectedEntities, entity],
        };
      }),

    clearSelectedEntities: () => set({selectedEntities: []}),

    clearEntities: () => set({entities: [], selectedEntities: []}),

    getEntityById: (entityId) => {
      const state = get();
      return state.entities.find((e) => e.id === entityId);
    },

    setHasHydrated: (hasHydrated) => set({hasHydrated}),
  };
}

/**
 * Creates a Zustand entity store with IndexedDB persistence and optional DevTools.
 *
 * @remarks
 * This factory function eliminates code duplication across entity stores (invoices, merchants, scans).
 * It provides:
 * - Generic CRUD operations (upsert, remove, update, clear)
 * - Selection management (toggle, clear, set)
 * - IndexedDB persistence via Dexie
 * - DevTools integration in development mode
 * - Hydration status tracking
 *
 * **Usage Pattern:**
 * 1. Define your entity type extending BaseEntity
 * 2. Call createEntityStore with configuration
 * 3. Export the returned hook
 *
 * @template E - Entity type extending BaseEntity
 * @param options - Configuration for the entity store
 * @returns A Zustand store hook with entity state and actions
 *
 * @example
 * ```typescript
 * // Define entity type
 * interface Product extends BaseEntity {
 *   name: string;
 *   price: number;
 * }
 *
 * // Create store
 * export const useProductsStore = createEntityStore<Product>({
 *   tableName: "products",
 *   storeName: "ProductsStore",
 *   persistName: "products-store",
 * });
 *
 * // Use in component
 * function ProductsList() {
 *   const { entities, upsertEntity } = useProductsStore();
 *   // ...
 * }
 * ```
 *
 * @see {@link EntityStore} for the full store interface
 * @see {@link createIndexedDBStorage} for persistence implementation
 */
export function createEntityStore<E extends BaseEntity>(options: CreateEntityStoreOptions) {
  const {tableName, storeName, persistName} = options;

  // Create IndexedDB storage adapter
  const indexedDBStorage = createIndexedDBStorage<EntityPersistedState<E>, E>({
    table: tableName,
    entityKey: "entities",
  });

  // Persist middleware configuration
  const persistConfig: PersistOptions<EntityStore<E>, EntityPersistedState<E>> = {
    name: persistName,
    storage: indexedDBStorage,
    partialize: (state): EntityPersistedState<E> => ({
      entities: [...state.entities],
    }),
    onRehydrateStorage: () => (state) => {
      state?.setHasHydrated(true);
    },
  };

  // Store creator with proper typing
  const storeCreator: StateCreator<EntityStore<E>, [], [["zustand/persist", EntityPersistedState<E>]]> = (set, get) =>
    createEntitySlice<E>(set, get);

  // Development store with DevTools
  const createDevStore = () =>
    create<EntityStore<E>>()(
      devtools(persist(storeCreator, persistConfig), {
        name: storeName,
        enabled: true,
      }),
    );

  // Production store without DevTools
  const createProdStore = () => create<EntityStore<E>>()(persist(storeCreator, persistConfig));

  // Return environment-appropriate store
  return process.env.NODE_ENV === "development" ? createDevStore() : createProdStore();
}

/**
 * Type helper for extracting entity type from a store.
 * @template Store - The entity store type
 */
export type EntityFromStore<Store extends EntityStore<BaseEntity>> = Store extends EntityStore<infer E> ? E : never;
