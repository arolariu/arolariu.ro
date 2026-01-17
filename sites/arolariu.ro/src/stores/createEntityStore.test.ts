/**
 * @fileoverview Tests for createEntityStore factory exports, types, and functionality.
 * @module stores/createEntityStore.test
 */

import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {
  createEntityStore,
  type BaseEntity,
  type CreateEntityStoreOptions,
  type EntityActions,
  type EntityFromStore,
  type EntityPersistedState,
  type EntityState,
  type EntityStore,
} from "./createEntityStore";

// Mock IndexedDB storage
vi.mock("./storage/indexedDBStorage", () => ({
  createIndexedDBStorage: vi.fn(() => ({
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  })),
}));

// Test entity type
interface TestEntity extends BaseEntity {
  readonly name: string;
  readonly value: number;
}

// Create a test store instance
const useTestStore = createEntityStore<TestEntity>({
  tableName: "invoices",
  storeName: "TestEntityStore",
  persistName: "test-entity-store",
});

describe("createEntityStore module exports", () => {
  it("should export createEntityStore function", () => {
    expect(createEntityStore).toBeDefined();
    expect(typeof createEntityStore).toBe("function");
  });

  describe("type exports", () => {
    it("should export BaseEntity interface", () => {
      // Type-level test - if this compiles, the export works
      const entity: BaseEntity = {id: "test-id"};
      expect(entity.id).toBe("test-id");
    });

    it("should export EntityPersistedState interface", () => {
      // Type-level test
      const state: EntityPersistedState<TestEntity> = {
        entities: [{id: "1", name: "Test", value: 100}],
      };
      expect(state.entities).toHaveLength(1);
    });

    it("should export EntityState interface", () => {
      // Type-level test
      const state: EntityState<TestEntity> = {
        entities: [],
        selectedEntities: [],
        hasHydrated: false,
      };
      expect(state.hasHydrated).toBe(false);
    });

    it("should export EntityActions interface", () => {
      // Type-level test - verify interface shape
      const actions: EntityActions<TestEntity> = {
        setEntities: (_entities) => {},
        setSelectedEntities: (_selectedEntities) => {},
        upsertEntity: (_entity) => {},
        removeEntity: (_entityId) => {},
        updateEntity: (_entityId, _updates) => {},
        toggleEntitySelection: (_entity) => {},
        clearSelectedEntities: () => {},
        clearEntities: () => {},
        getEntityById: (_entityId) => undefined,
        setHasHydrated: (_hasHydrated) => {},
      };
      expect(actions.setEntities).toBeDefined();
    });

    it("should export EntityStore type", () => {
      // Type-level test - EntityStore combines state and actions
      const store: Partial<EntityStore<TestEntity>> = {
        entities: [],
        selectedEntities: [],
        hasHydrated: false,
        setEntities: (_entities) => {},
      };
      expect(store.entities).toEqual([]);
    });

    it("should export CreateEntityStoreOptions interface", () => {
      // Type-level test
      const options: CreateEntityStoreOptions = {
        tableName: "invoices",
        storeName: "TestStore",
        persistName: "test-store",
      };
      expect(options.tableName).toBe("invoices");
    });

    it("should export EntityFromStore type helper", () => {
      // Type-level test - if this compiles, the type helper works
      type ExtractedEntity = EntityFromStore<EntityStore<TestEntity>>;
      const entity: ExtractedEntity = {id: "1", name: "Test", value: 100};
      expect(entity.id).toBe("1");
    });
  });

  describe("CreateEntityStoreOptions validation", () => {
    it("should accept invoices as tableName", () => {
      const options: CreateEntityStoreOptions = {
        tableName: "invoices",
        storeName: "InvoicesStore",
        persistName: "invoices-store",
      };
      expect(options.tableName).toBe("invoices");
    });

    it("should accept merchants as tableName", () => {
      const options: CreateEntityStoreOptions = {
        tableName: "merchants",
        storeName: "MerchantsStore",
        persistName: "merchants-store",
      };
      expect(options.tableName).toBe("merchants");
    });

    it("should accept scans as tableName", () => {
      const options: CreateEntityStoreOptions = {
        tableName: "scans",
        storeName: "ScansStore",
        persistName: "scans-store",
      };
      expect(options.tableName).toBe("scans");
    });
  });

  describe("BaseEntity requirements", () => {
    it("should require id field on entities", () => {
      const entity: BaseEntity = {id: "unique-id"};
      expect(typeof entity.id).toBe("string");
    });

    it("should allow additional fields on extended entities", () => {
      interface ExtendedEntity extends BaseEntity {
        extraField: string;
        numericField: number;
      }

      const entity: ExtendedEntity = {
        id: "1",
        extraField: "extra",
        numericField: 42,
      };

      expect(entity.id).toBe("1");
      expect(entity.extraField).toBe("extra");
      expect(entity.numericField).toBe(42);
    });
  });
});

describe("createEntityStore functionality", () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const {result} = renderHook(() => useTestStore);
    act(() => {
      result.current.getState().clearEntities();
      result.current.getState().setHasHydrated(false);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have empty entities array initially", () => {
      const {result} = renderHook(() => useTestStore);
      expect(result.current.getState().entities).toEqual([]);
    });

    it("should have empty selectedEntities array initially", () => {
      const {result} = renderHook(() => useTestStore);
      expect(result.current.getState().selectedEntities).toEqual([]);
    });

    it("should have hasHydrated as false initially", () => {
      const {result} = renderHook(() => useTestStore);
      expect(result.current.getState().hasHydrated).toBe(false);
    });
  });

  describe("setEntities", () => {
    it("should set entities array", () => {
      const {result} = renderHook(() => useTestStore);
      const entities: TestEntity[] = [
        {id: "1", name: "Entity 1", value: 100},
        {id: "2", name: "Entity 2", value: 200},
      ];

      act(() => {
        result.current.getState().setEntities(entities);
      });

      expect(result.current.getState().entities).toEqual(entities);
    });

    it("should replace existing entities", () => {
      const {result} = renderHook(() => useTestStore);

      act(() => {
        result.current.getState().setEntities([{id: "1", name: "Old", value: 1}]);
      });

      act(() => {
        result.current.getState().setEntities([{id: "2", name: "New", value: 2}]);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]?.id).toBe("2");
    });
  });

  describe("setSelectedEntities", () => {
    it("should set selected entities array", () => {
      const {result} = renderHook(() => useTestStore);
      const selected: TestEntity[] = [{id: "1", name: "Selected", value: 100}];

      act(() => {
        result.current.getState().setSelectedEntities(selected);
      });

      expect(result.current.getState().selectedEntities).toEqual(selected);
    });
  });

  describe("upsertEntity", () => {
    it("should add new entity when not exists", () => {
      const {result} = renderHook(() => useTestStore);
      const entity: TestEntity = {id: "1", name: "New", value: 100};

      act(() => {
        result.current.getState().upsertEntity(entity);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]).toEqual(entity);
    });

    it("should update existing entity when id exists", () => {
      const {result} = renderHook(() => useTestStore);
      const entity: TestEntity = {id: "1", name: "Original", value: 100};
      const updated: TestEntity = {id: "1", name: "Updated", value: 200};

      act(() => {
        result.current.getState().upsertEntity(entity);
      });

      act(() => {
        result.current.getState().upsertEntity(updated);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]).toEqual(updated);
    });

    it("should handle multiple upserts correctly", () => {
      const {result} = renderHook(() => useTestStore);

      act(() => {
        result.current.getState().upsertEntity({id: "1", name: "First", value: 1});
        result.current.getState().upsertEntity({id: "2", name: "Second", value: 2});
        result.current.getState().upsertEntity({id: "1", name: "First Updated", value: 10});
      });

      const entities = result.current.getState().entities;
      expect(entities).toHaveLength(2);
      expect(entities.find((e) => e.id === "1")?.name).toBe("First Updated");
      expect(entities.find((e) => e.id === "2")?.name).toBe("Second");
    });
  });

  describe("removeEntity", () => {
    it("should remove entity by id", () => {
      const {result} = renderHook(() => useTestStore);

      act(() => {
        result.current.getState().setEntities([
          {id: "1", name: "First", value: 1},
          {id: "2", name: "Second", value: 2},
        ]);
      });

      act(() => {
        result.current.getState().removeEntity("1");
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]?.id).toBe("2");
    });

    it("should also remove from selectedEntities", () => {
      const {result} = renderHook(() => useTestStore);
      const entity: TestEntity = {id: "1", name: "Test", value: 1};

      act(() => {
        result.current.getState().setEntities([entity]);
        result.current.getState().setSelectedEntities([entity]);
      });

      act(() => {
        result.current.getState().removeEntity("1");
      });

      expect(result.current.getState().selectedEntities).toHaveLength(0);
    });

    it("should do nothing when entity not found", () => {
      const {result} = renderHook(() => useTestStore);

      act(() => {
        result.current.getState().setEntities([{id: "1", name: "Test", value: 1}]);
      });

      act(() => {
        result.current.getState().removeEntity("nonexistent");
      });

      expect(result.current.getState().entities).toHaveLength(1);
    });
  });

  describe("updateEntity", () => {
    it("should update entity with partial data", () => {
      const {result} = renderHook(() => useTestStore);

      act(() => {
        result.current.getState().setEntities([{id: "1", name: "Original", value: 100}]);
      });

      act(() => {
        result.current.getState().updateEntity("1", {name: "Updated"});
      });

      const entity = result.current.getState().entities[0];
      expect(entity?.name).toBe("Updated");
      expect(entity?.value).toBe(100); // Unchanged
    });

    it("should also update in selectedEntities", () => {
      const {result} = renderHook(() => useTestStore);
      const entity: TestEntity = {id: "1", name: "Test", value: 1};

      act(() => {
        result.current.getState().setEntities([entity]);
        result.current.getState().setSelectedEntities([entity]);
      });

      act(() => {
        result.current.getState().updateEntity("1", {name: "Updated"});
      });

      expect(result.current.getState().selectedEntities[0]?.name).toBe("Updated");
    });

    it("should do nothing when entity not found", () => {
      const {result} = renderHook(() => useTestStore);

      act(() => {
        result.current.getState().setEntities([{id: "1", name: "Test", value: 1}]);
      });

      act(() => {
        result.current.getState().updateEntity("nonexistent", {name: "Updated"});
      });

      expect(result.current.getState().entities[0]?.name).toBe("Test");
    });
  });

  describe("toggleEntitySelection", () => {
    it("should add entity to selection when not selected", () => {
      const {result} = renderHook(() => useTestStore);
      const entity: TestEntity = {id: "1", name: "Test", value: 1};

      act(() => {
        result.current.getState().toggleEntitySelection(entity);
      });

      expect(result.current.getState().selectedEntities).toContainEqual(entity);
    });

    it("should remove entity from selection when already selected", () => {
      const {result} = renderHook(() => useTestStore);
      const entity: TestEntity = {id: "1", name: "Test", value: 1};

      act(() => {
        result.current.getState().toggleEntitySelection(entity);
      });

      act(() => {
        result.current.getState().toggleEntitySelection(entity);
      });

      expect(result.current.getState().selectedEntities).not.toContainEqual(entity);
    });

    it("should handle multiple selections", () => {
      const {result} = renderHook(() => useTestStore);
      const entity1: TestEntity = {id: "1", name: "First", value: 1};
      const entity2: TestEntity = {id: "2", name: "Second", value: 2};

      act(() => {
        result.current.getState().toggleEntitySelection(entity1);
        result.current.getState().toggleEntitySelection(entity2);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(2);
    });
  });

  describe("clearSelectedEntities", () => {
    it("should clear all selected entities", () => {
      const {result} = renderHook(() => useTestStore);

      act(() => {
        result.current.getState().setSelectedEntities([
          {id: "1", name: "First", value: 1},
          {id: "2", name: "Second", value: 2},
        ]);
      });

      act(() => {
        result.current.getState().clearSelectedEntities();
      });

      expect(result.current.getState().selectedEntities).toHaveLength(0);
    });
  });

  describe("clearEntities", () => {
    it("should clear all entities and selected entities", () => {
      const {result} = renderHook(() => useTestStore);

      act(() => {
        result.current.getState().setEntities([
          {id: "1", name: "First", value: 1},
          {id: "2", name: "Second", value: 2},
        ]);
        result.current.getState().setSelectedEntities([{id: "1", name: "First", value: 1}]);
      });

      act(() => {
        result.current.getState().clearEntities();
      });

      expect(result.current.getState().entities).toHaveLength(0);
      expect(result.current.getState().selectedEntities).toHaveLength(0);
    });
  });

  describe("getEntityById", () => {
    it("should return entity when found", () => {
      const {result} = renderHook(() => useTestStore);
      const entity: TestEntity = {id: "1", name: "Test", value: 100};

      act(() => {
        result.current.getState().setEntities([entity]);
      });

      const found = result.current.getState().getEntityById("1");
      expect(found).toEqual(entity);
    });

    it("should return undefined when not found", () => {
      const {result} = renderHook(() => useTestStore);

      act(() => {
        result.current.getState().setEntities([{id: "1", name: "Test", value: 1}]);
      });

      const found = result.current.getState().getEntityById("nonexistent");
      expect(found).toBeUndefined();
    });
  });

  describe("setHasHydrated", () => {
    it("should set hydration status to true", () => {
      const {result} = renderHook(() => useTestStore);

      act(() => {
        result.current.getState().setHasHydrated(true);
      });

      expect(result.current.getState().hasHydrated).toBe(true);
    });

    it("should set hydration status to false", () => {
      const {result} = renderHook(() => useTestStore);

      act(() => {
        result.current.getState().setHasHydrated(true);
      });

      act(() => {
        result.current.getState().setHasHydrated(false);
      });

      expect(result.current.getState().hasHydrated).toBe(false);
    });
  });

  describe("store subscription", () => {
    it("should notify subscribers when state changes", () => {
      const {result} = renderHook(() => useTestStore);
      const callback = vi.fn();

      const unsubscribe = result.current.subscribe(callback);

      act(() => {
        result.current.getState().upsertEntity({id: "1", name: "Test", value: 1});
      });

      expect(callback).toHaveBeenCalled();
      unsubscribe();
    });
  });
});
