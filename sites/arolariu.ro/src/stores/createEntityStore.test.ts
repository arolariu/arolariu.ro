/**
 * @fileoverview Tests for createEntityStore factory exports and types.
 * @module stores/createEntityStore.test
 */

import {describe, expect, it} from "vitest";
import {createEntityStore, type BaseEntity, type CreateEntityStoreOptions, type EntityActions, type EntityFromStore, type EntityPersistedState, type EntityState, type EntityStore} from "./createEntityStore";

// Test entity type
interface TestEntity extends BaseEntity {
  readonly name: string;
  readonly value: number;
}

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
