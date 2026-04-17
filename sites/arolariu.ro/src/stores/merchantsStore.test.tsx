/**
 * @fileoverview Unit tests for the merchants Zustand store
 * @module stores/merchantsStore.test
 */

import {MerchantBuilder} from "@/data/mocks";
import {MerchantCategory, type Merchant} from "@/types/invoices";
import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useMerchantsStore} from "./merchantsStore";

// Mock the IndexedDB storage
vi.mock("./storage/indexedDBStorage", () => ({
  createIndexedDBStorage: () => ({
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("useMerchantsStore", () => {
  // Mock merchant data using builders
  const mockMerchant1 = new MerchantBuilder()
    .withId("merchant-1")
    .withName("Test Merchant 1")
    .withDescription("A local grocery store")
    .withCreatedAt(new Date("2025-01-01"))
    .withLastUpdatedAt(new Date("2025-01-01"))
    .withCategory(MerchantCategory.LOCAL_SHOP)
    .withAddress("123 Main St, City, State 12345")
    .withPhoneNumber("+1-555-0100")
    .withParentCompanyId("company-1")
    .build();

  const mockMerchant2 = new MerchantBuilder()
    .withId("merchant-2")
    .withName("Test Merchant 2")
    .withDescription("A large supermarket chain")
    .withCreatedAt(new Date("2025-01-02"))
    .withLastUpdatedAt(new Date("2025-01-02"))
    .withCategory(MerchantCategory.SUPERMARKET)
    .withAddress("456 Market Ave, City, State 12345")
    .withPhoneNumber("+1-555-0200")
    .withParentCompanyId("company-2")
    .build();

  const mockMerchant3 = new MerchantBuilder()
    .withId("merchant-3")
    .withName("Test Merchant 3")
    .withDescription("An online shopping platform")
    .withCreatedAt(new Date("2025-01-03"))
    .withLastUpdatedAt(new Date("2025-01-03"))
    .withCategory(MerchantCategory.ONLINE_SHOP)
    .withAddress("789 Digital Blvd, City, State 12345")
    .withPhoneNumber("+1-555-0300")
    .withParentCompanyId("company-3")
    .build();

  beforeEach(() => {
    // Reset the store before each test
    const {result} = renderHook(() => useMerchantsStore);
    act(() => {
      result.current.getState().clearEntities();
    });
  });

  describe("Initial State", () => {
    it("should initialize with empty entities array", () => {
      const {result} = renderHook(() => useMerchantsStore);

      expect(result.current.getState().entities).toEqual([]);
    });

    it("should initialize with empty selectedEntities array", () => {
      const {result} = renderHook(() => useMerchantsStore);

      expect(result.current.getState().selectedEntities).toEqual([]);
    });
  });

  describe("setEntities", () => {
    it("should set all merchants", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2]);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().entities[0]).toEqual(mockMerchant1);
      expect(result.current.getState().entities[1]).toEqual(mockMerchant2);
    });

    it("should replace existing merchants when set", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1]);
      });

      expect(result.current.getState().entities).toHaveLength(1);

      act(() => {
        result.current.getState().setEntities([mockMerchant2, mockMerchant3]);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().entities[0]).toEqual(mockMerchant2);
      expect(result.current.getState().entities[1]).toEqual(mockMerchant3);
    });

    it("should handle setting empty array", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2]);
        result.current.getState().setEntities([]);
      });

      expect(result.current.getState().entities).toEqual([]);
    });
  });

  describe("upsertEntity", () => {
    it("should add a new merchant to the store", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().upsertEntity(mockMerchant1);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]).toEqual(mockMerchant1);
    });

    it("should append merchant to existing merchants", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1]);
        result.current.getState().upsertEntity(mockMerchant2);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().entities[0]).toEqual(mockMerchant1);
      expect(result.current.getState().entities[1]).toEqual(mockMerchant2);
    });

    it("should allow adding multiple merchants sequentially", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().upsertEntity(mockMerchant1);
        result.current.getState().upsertEntity(mockMerchant2);
        result.current.getState().upsertEntity(mockMerchant3);
      });

      expect(result.current.getState().entities).toHaveLength(3);
      expect(result.current.getState().entities).toContainEqual(mockMerchant1);
      expect(result.current.getState().entities).toContainEqual(mockMerchant2);
      expect(result.current.getState().entities).toContainEqual(mockMerchant3);
    });

    it("should update existing merchant when upserting with same ID", () => {
      const {result} = renderHook(() => useMerchantsStore);

      // Add initial merchant
      act(() => {
        result.current.getState().upsertEntity(mockMerchant1);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]?.name).toBe("Test Merchant 1");

      // Create updated version with same ID but different data
      const updatedMerchant = new MerchantBuilder()
        .withId(mockMerchant1.id)
        .withName("Updated Merchant Name")
        .withDescription("Updated description")
        .withCreatedAt(new Date("2025-01-01"))
        .withLastUpdatedAt(new Date("2025-06-01"))
        .withCategory(MerchantCategory.HYPERMARKET)
        .withAddress("999 New Address")
        .withPhoneNumber("+1-555-9999")
        .withParentCompanyId("company-updated")
        .build();

      // Upsert should update, not duplicate
      act(() => {
        result.current.getState().upsertEntity(updatedMerchant);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]?.name).toBe("Updated Merchant Name");
      expect(result.current.getState().entities[0]?.description).toBe("Updated description");
      expect(result.current.getState().entities[0]?.category).toBe(MerchantCategory.HYPERMARKET);
    });

    it("should not create duplicates when upserting same merchant twice", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().upsertEntity(mockMerchant1);
        result.current.getState().upsertEntity(mockMerchant1);
        result.current.getState().upsertEntity(mockMerchant1);
      });

      expect(result.current.getState().entities).toHaveLength(1);
    });
  });

  describe("removeEntity", () => {
    it("should remove a merchant by ID", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2, mockMerchant3]);
        result.current.getState().removeEntity(mockMerchant2.id);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().entities.find((m) => m.id === mockMerchant2.id)).toBeUndefined();
      expect(result.current.getState().entities[0]).toEqual(mockMerchant1);
      expect(result.current.getState().entities[1]).toEqual(mockMerchant3);
    });

    it("should handle removing non-existent merchant gracefully", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1]);
        result.current.getState().removeEntity("non-existent-id");
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]).toEqual(mockMerchant1);
    });

    it("should handle removing from empty array", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().removeEntity("any-id");
      });

      expect(result.current.getState().entities).toEqual([]);
    });
  });

  describe("updateEntity", () => {
    it("should update a merchant with partial data", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2]);
        result.current.getState().updateEntity(mockMerchant1.id, {
          name: "Updated Merchant Name",
          category: MerchantCategory.HYPERMARKET,
        });
      });

      const updatedMerchant = result.current.getState().entities.find((m) => m.id === mockMerchant1.id);
      expect(updatedMerchant?.name).toBe("Updated Merchant Name");
      expect(updatedMerchant?.category).toBe(MerchantCategory.HYPERMARKET);
      expect(updatedMerchant?.description).toBe(mockMerchant1.description); // Should remain unchanged
      expect(updatedMerchant?.address).toBe(mockMerchant1.address); // Should remain unchanged
    });

    it("should update multiple fields at once", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1]);
        result.current.getState().updateEntity(mockMerchant1.id, {
          name: "New Name",
          address: {
            ...mockMerchant1.address,
            address: "New Address",
            phoneNumber: "+1-555-9999",
          },
        });
      });

      const updatedMerchant = result.current.getState().entities[0];
      expect(updatedMerchant?.name).toBe("New Name");
      expect(updatedMerchant?.address.address).toBe("New Address");
      expect(updatedMerchant?.address.phoneNumber).toBe("+1-555-9999");
      expect(updatedMerchant?.category).toBe(mockMerchant1.category); // Should remain unchanged
    });

    it("should handle updating non-existent merchant gracefully", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1]);
        result.current.getState().updateEntity("non-existent-id", {name: "Should Not Update"});
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]).toEqual(mockMerchant1);
    });

    it("should handle empty partial updates", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1]);
        result.current.getState().updateEntity(mockMerchant1.id, {});
      });

      expect(result.current.getState().entities[0]).toEqual(mockMerchant1);
    });
  });

  describe("getEntityById", () => {
    it("should retrieve a merchant by ID", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2, mockMerchant3]);
      });

      const merchant = result.current.getState().getEntityById(mockMerchant2.id);

      expect(merchant).toEqual(mockMerchant2);
    });

    it("should return undefined for non-existent ID", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1]);
      });

      const merchant = result.current.getState().getEntityById("non-existent-id");

      expect(merchant).toBeUndefined();
    });

    it("should return undefined when entities array is empty", () => {
      const {result} = renderHook(() => useMerchantsStore);

      const merchant = result.current.getState().getEntityById(mockMerchant1.id);

      expect(merchant).toBeUndefined();
    });

    it("should always return the latest version after updates", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1]);
        result.current.getState().updateEntity(mockMerchant1.id, {name: "Updated Name"});
      });

      const merchant = result.current.getState().getEntityById(mockMerchant1.id);

      expect(merchant?.name).toBe("Updated Name");
    });
  });

  describe("clearEntities", () => {
    it("should clear all merchants", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2, mockMerchant3]);
        result.current.getState().clearEntities();
      });

      expect(result.current.getState().entities).toEqual([]);
    });

    it("should handle clearing empty entities array", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().clearEntities();
      });

      expect(result.current.getState().entities).toEqual([]);
    });

    it("should also clear selectedEntities", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2]);
        result.current.getState().toggleEntitySelection(mockMerchant1);
        result.current.getState().clearEntities();
      });

      expect(result.current.getState().entities).toEqual([]);
      expect(result.current.getState().selectedEntities).toEqual([]);
    });
  });

  describe("Selection API", () => {
    it("should toggle entity selection on", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2]);
        result.current.getState().toggleEntitySelection(mockMerchant1);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(1);
      expect(result.current.getState().selectedEntities[0]).toEqual(mockMerchant1);
    });

    it("should toggle entity selection off", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().toggleEntitySelection(mockMerchant1);
        result.current.getState().toggleEntitySelection(mockMerchant1);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(0);
    });

    it("should clear selected entities", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().toggleEntitySelection(mockMerchant1);
        result.current.getState().toggleEntitySelection(mockMerchant2);
        result.current.getState().clearSelectedEntities();
      });

      expect(result.current.getState().selectedEntities).toEqual([]);
    });

    it("should set selected entities directly", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setSelectedEntities([mockMerchant1, mockMerchant3]);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(2);
      expect(result.current.getState().selectedEntities).toContainEqual(mockMerchant1);
      expect(result.current.getState().selectedEntities).toContainEqual(mockMerchant3);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle a complete workflow: add, update, retrieve, remove", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        // Add merchants
        result.current.getState().upsertEntity(mockMerchant1);
        result.current.getState().upsertEntity(mockMerchant2);
        result.current.getState().upsertEntity(mockMerchant3);
      });

      expect(result.current.getState().entities).toHaveLength(3);

      act(() => {
        // Update a merchant
        result.current.getState().updateEntity(mockMerchant1.id, {
          name: "Updated Merchant 1",
          category: MerchantCategory.HYPERMARKET,
        });
      });

      // Retrieve the updated merchant
      const retrievedMerchant = result.current.getState().getEntityById(mockMerchant1.id);
      expect(retrievedMerchant?.name).toBe("Updated Merchant 1");
      expect(retrievedMerchant?.category).toBe(MerchantCategory.HYPERMARKET);

      act(() => {
        // Remove a merchant
        result.current.getState().removeEntity(mockMerchant2.id);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().getEntityById(mockMerchant2.id)).toBeUndefined();
    });

    it("should maintain data integrity across multiple operations", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2, mockMerchant3]);
        result.current.getState().updateEntity(mockMerchant1.id, {name: "Modified 1"});
        result.current.getState().updateEntity(mockMerchant2.id, {name: "Modified 2"});
        result.current.getState().removeEntity(mockMerchant3.id);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().getEntityById(mockMerchant1.id)?.name).toBe("Modified 1");
      expect(result.current.getState().getEntityById(mockMerchant2.id)?.name).toBe("Modified 2");
      expect(result.current.getState().getEntityById(mockMerchant3.id)).toBeUndefined();
    });

    it("should handle set, clear, and re-add operations", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2]);
        result.current.getState().clearEntities();
        result.current.getState().upsertEntity(mockMerchant3);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]).toEqual(mockMerchant3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle operations on empty store gracefully", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().removeEntity("any-id");
        result.current.getState().updateEntity("any-id", {name: "New Name"});
        result.current.getState().clearEntities();
      });

      expect(result.current.getState().entities).toEqual([]);
      expect(result.current.getState().getEntityById("any-id")).toBeUndefined();
    });

    it("should handle duplicate merchant IDs (upsert updates existing)", () => {
      const {result} = renderHook(() => useMerchantsStore);

      const duplicateMerchant: Merchant = {
        ...mockMerchant1,
        name: "Updated Merchant Name",
      };

      act(() => {
        result.current.getState().upsertEntity(mockMerchant1);
        result.current.getState().upsertEntity(duplicateMerchant);
      });

      // Upsert prevents duplicates - should update existing entry
      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]?.name).toBe("Updated Merchant Name");
    });

    it("should handle category changes correctly", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1]);
      });

      Object.values(MerchantCategory).forEach((category) => {
        if (typeof category === "number") {
          act(() => {
            result.current.getState().updateEntity(mockMerchant1.id, {category});
          });

          const merchant = result.current.getState().getEntityById(mockMerchant1.id);
          expect(merchant?.category).toBe(category);
        }
      });
    });
  });

  describe("Performance and Immutability", () => {
    it("should not mutate original merchant objects", () => {
      const {result} = renderHook(() => useMerchantsStore);
      const originalName = mockMerchant1.name;

      act(() => {
        result.current.getState().upsertEntity(mockMerchant1);
        result.current.getState().updateEntity(mockMerchant1.id, {name: "New Name"});
      });

      expect(mockMerchant1.name).toBe(originalName);
    });

    it("should handle large datasets efficiently", () => {
      const {result} = renderHook(() => useMerchantsStore);
      const largeMerchantList: Merchant[] = Array.from({length: 1000}, (_, i) => ({
        ...mockMerchant1,
        id: `merchant-${i}`,
        name: `Merchant ${i}`,
      }));

      act(() => {
        result.current.getState().setEntities(largeMerchantList);
      });

      expect(result.current.getState().entities).toHaveLength(1000);

      const targetId = "merchant-500";
      const merchant = result.current.getState().getEntityById(targetId);

      expect(merchant?.id).toBe(targetId);
    });

    it("should create new arrays for each state update", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1]);
      });

      const firstEntitiesRef = result.current.getState().entities;

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2]);
      });

      const secondEntitiesRef = result.current.getState().entities;

      expect(firstEntitiesRef).not.toBe(secondEntitiesRef);
    });
  });

  describe("Action Coverage", () => {
    it("should cover all action branches for removeEntity", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2, mockMerchant3]);
      });

      act(() => {
        result.current.getState().removeEntity(mockMerchant1.id);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().getEntityById(mockMerchant1.id)).toBeUndefined();
    });

    it("should cover all action branches for updateEntity", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2]);
      });

      act(() => {
        result.current.getState().updateEntity(mockMerchant2.id, {
          name: "Updated Merchant",
          category: MerchantCategory.ONLINE_SHOP,
        });
      });

      const updatedMerchant = result.current.getState().getEntityById(mockMerchant2.id);
      expect(updatedMerchant?.name).toBe("Updated Merchant");
      expect(updatedMerchant?.category).toBe(MerchantCategory.ONLINE_SHOP);
    });

    it("should cover upsertEntity with existing merchants", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1]);
      });

      act(() => {
        result.current.getState().upsertEntity(mockMerchant2);
        result.current.getState().upsertEntity(mockMerchant3);
      });

      expect(result.current.getState().entities).toHaveLength(3);
    });

    it("should cover setEntities replacing existing data", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().setEntities([mockMerchant1, mockMerchant2]);
      });

      expect(result.current.getState().entities).toHaveLength(2);

      act(() => {
        result.current.getState().setEntities([mockMerchant3]);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]?.id).toBe(mockMerchant3.id);
    });
  });

  describe("Store State Management", () => {
    it("should maintain consistent state after multiple operations", () => {
      const {result} = renderHook(() => useMerchantsStore);

      act(() => {
        result.current.getState().upsertEntity(mockMerchant1);
        result.current.getState().upsertEntity(mockMerchant2);
        result.current.getState().upsertEntity(mockMerchant3);
      });

      expect(result.current.getState().entities).toHaveLength(3);

      act(() => {
        result.current.getState().removeEntity(mockMerchant2.id);
      });

      expect(result.current.getState().entities).toHaveLength(2);

      act(() => {
        result.current.getState().updateEntity(mockMerchant1.id, {name: "Modified Merchant 1"});
      });

      const merchant = result.current.getState().getEntityById(mockMerchant1.id);
      expect(merchant?.name).toBe("Modified Merchant 1");

      act(() => {
        result.current.getState().clearEntities();
      });

      expect(result.current.getState().entities).toHaveLength(0);
    });
  });

  describe("Production Store", () => {
    it("should use production store when NODE_ENV is production", async () => {
      // Mock NODE_ENV as production before importing
      vi.stubEnv("NODE_ENV", "production");

      // Clear the module cache to force re-evaluation
      vi.resetModules();

      // Dynamically import the store to get the production version
      const {useMerchantsStore: prodStore} = await import("./merchantsStore");

      const {result} = renderHook(() => prodStore());

      // Test basic functionality
      act(() => {
        result.current.setEntities([mockMerchant1, mockMerchant2]);
      });

      expect(result.current.entities).toHaveLength(2);

      act(() => {
        result.current.upsertEntity(mockMerchant3);
      });

      expect(result.current.entities).toHaveLength(3);

      act(() => {
        result.current.removeEntity(mockMerchant2.id);
      });

      expect(result.current.entities).toHaveLength(2);

      act(() => {
        result.current.updateEntity(mockMerchant1.id, {name: "Updated in Prod"});
      });

      expect(result.current.entities[0]?.name).toBe("Updated in Prod");

      const merchant = result.current.getEntityById(mockMerchant1.id);
      expect(merchant?.name).toBe("Updated in Prod");

      act(() => {
        result.current.clearEntities();
      });

      expect(result.current.entities).toHaveLength(0);

      // Restore environment
      vi.unstubAllEnvs();
    });
  });

  describe("Development Store", () => {
    it("should use development store when NODE_ENV is development", async () => {
      // Mock NODE_ENV as development before importing
      vi.stubEnv("NODE_ENV", "development");

      // Clear the module cache to force re-evaluation
      vi.resetModules();

      // Dynamically import the store to get the development version
      const {useMerchantsStore: devStore} = await import("./merchantsStore");

      const {result} = renderHook(() => devStore());

      // Test basic functionality
      act(() => {
        result.current.setEntities([mockMerchant1, mockMerchant2]);
      });

      expect(result.current.entities).toHaveLength(2);

      act(() => {
        result.current.upsertEntity(mockMerchant3);
      });

      expect(result.current.entities).toHaveLength(3);

      act(() => {
        result.current.removeEntity(mockMerchant2.id);
      });

      expect(result.current.entities).toHaveLength(2);

      act(() => {
        result.current.updateEntity(mockMerchant1.id, {name: "Updated in Dev"});
      });

      expect(result.current.entities[0]?.name).toBe("Updated in Dev");

      const merchant = result.current.getEntityById(mockMerchant1.id);
      expect(merchant?.name).toBe("Updated in Dev");

      act(() => {
        result.current.clearEntities();
      });

      expect(result.current.entities).toHaveLength(0);

      // Restore environment
      vi.unstubAllEnvs();
    });
  });
});
