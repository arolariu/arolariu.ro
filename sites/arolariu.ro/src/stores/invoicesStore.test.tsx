/**
 * @fileoverview Unit tests for the invoices Zustand store
 * @module stores/invoicesStore.test
 */

import {InvoiceBuilder} from "@/data/mocks";
import {InvoiceCategory, InvoiceScanType, PaymentType} from "@/types/invoices";
import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useInvoicesStore} from "./invoicesStore";

// Mock the IndexedDB storage
vi.mock("./storage/indexedDBStorage", () => ({
  createIndexedDBStorage: () => ({
    getItem: vi.fn().mockResolvedValue(null),
    setItem: vi.fn().mockResolvedValue(undefined),
    removeItem: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe("useInvoicesStore", () => {
  const paymentInformationFixture = {
    transactionDate: new Date("2025-01-01T00:00:00.000Z"),
    paymentType: PaymentType.Cash,
    currency: {code: "USD", name: "US Dollar", symbol: "$"},
    totalCostAmount: 42,
    totalTaxAmount: 4.2,
    subtotalAmount: 0,
    tipAmount: 0,
  };

  // Mock invoice data using builders
  const mockInvoice1 = new InvoiceBuilder()
    .withId("invoice-1")
    .withName("Test Invoice 1")
    .withDescription("Test invoice description 1")
    .withCreatedAt(new Date("2025-01-01"))
    .withLastUpdatedAt(new Date("2025-01-01"))
    .withUserIdentifier("user-123")
    .withCategory(InvoiceCategory.GROCERY)
    .withScans([{scanType: InvoiceScanType.JPEG, location: "https://example.com/invoice1.jpg", metadata: {}}])
    .withMerchantReference("merchant-1")
    .withPaymentInformation(paymentInformationFixture)
    .build();

  const mockInvoice2 = new InvoiceBuilder()
    .withId("invoice-2")
    .withName("Test Invoice 2")
    .withDescription("Test invoice description 2")
    .withCreatedAt(new Date("2025-01-02"))
    .withLastUpdatedAt(new Date("2025-01-02"))
    .withUserIdentifier("user-123")
    .withCategory(InvoiceCategory.FAST_FOOD)
    .withScans([{scanType: InvoiceScanType.JPEG, location: "https://example.com/invoice2.jpg", metadata: {}}])
    .withMerchantReference("merchant-2")
    .withPaymentInformation(paymentInformationFixture)
    .build();

  const mockInvoice3 = new InvoiceBuilder()
    .withId("invoice-3")
    .withName("Test Invoice 3")
    .withDescription("Test invoice description 3")
    .withCreatedAt(new Date("2025-01-03"))
    .withLastUpdatedAt(new Date("2025-01-03"))
    .withUserIdentifier("user-456")
    .withCategory(InvoiceCategory.HOME_CLEANING)
    .withScans([{scanType: InvoiceScanType.JPEG, location: "https://example.com/invoice3.jpg", metadata: {}}])
    .withMerchantReference("merchant-1")
    .withPaymentInformation(paymentInformationFixture)
    .build();

  beforeEach(() => {
    // Reset the store before each test
    const {result} = renderHook(() => useInvoicesStore);
    act(() => {
      result.current.getState().clearEntities();
    });
  });

  describe("Initial State", () => {
    it("should initialize with empty entities and selectedEntities", () => {
      const {result} = renderHook(() => useInvoicesStore);

      expect(result.current.getState().entities).toEqual([]);
      expect(result.current.getState().selectedEntities).toEqual([]);
    });
  });

  describe("setEntities", () => {
    it("should set all entities", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2]);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().entities[0]).toEqual(mockInvoice1);
      expect(result.current.getState().entities[1]).toEqual(mockInvoice2);
    });

    it("should replace existing entities when set", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1]);
      });

      expect(result.current.getState().entities).toHaveLength(1);

      act(() => {
        result.current.getState().setEntities([mockInvoice2, mockInvoice3]);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().entities[0]).toEqual(mockInvoice2);
      expect(result.current.getState().entities[1]).toEqual(mockInvoice3);
    });
  });

  describe("setSelectedEntities", () => {
    it("should set selected entities", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setSelectedEntities([mockInvoice1]);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(1);
      expect(result.current.getState().selectedEntities[0]).toEqual(mockInvoice1);
    });

    it("should replace existing selected entities when set", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setSelectedEntities([mockInvoice1, mockInvoice2]);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(2);

      act(() => {
        result.current.getState().setSelectedEntities([mockInvoice3]);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(1);
      expect(result.current.getState().selectedEntities[0]).toEqual(mockInvoice3);
    });
  });

  describe("upsertEntity", () => {
    it("should add a new entity to the store", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().upsertEntity(mockInvoice1);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]).toEqual(mockInvoice1);
    });

    it("should append entity to existing entities", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1]);
        result.current.getState().upsertEntity(mockInvoice2);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().entities[0]).toEqual(mockInvoice1);
      expect(result.current.getState().entities[1]).toEqual(mockInvoice2);
    });

    it("should allow adding multiple entities sequentially", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().upsertEntity(mockInvoice1);
        result.current.getState().upsertEntity(mockInvoice2);
        result.current.getState().upsertEntity(mockInvoice3);
      });

      expect(result.current.getState().entities).toHaveLength(3);
    });

    it("should update existing entity when upserting with same ID", () => {
      const {result} = renderHook(() => useInvoicesStore);

      // Add initial entity
      act(() => {
        result.current.getState().upsertEntity(mockInvoice1);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]?.name).toBe("Test Invoice 1");

      // Create updated version with same ID but different data
      const updatedInvoice = new InvoiceBuilder()
        .withId(mockInvoice1.id)
        .withName("Updated Invoice Name")
        .withDescription("Updated description")
        .withCreatedAt(new Date("2025-01-01"))
        .withLastUpdatedAt(new Date("2025-06-01"))
        .withUserIdentifier("user-123")
        .withCategory(InvoiceCategory.CAR_AUTO)
        .withScans([{scanType: InvoiceScanType.JPEG, location: "https://example.com/updated.jpg", metadata: {}}])
        .withMerchantReference("merchant-updated")
        .withPaymentInformation(paymentInformationFixture)
        .build();

      // Upsert should update, not duplicate
      act(() => {
        result.current.getState().upsertEntity(updatedInvoice);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]?.name).toBe("Updated Invoice Name");
      expect(result.current.getState().entities[0]?.description).toBe("Updated description");
      expect(result.current.getState().entities[0]?.category).toBe(InvoiceCategory.CAR_AUTO);
    });

    it("should not create duplicates when upserting same entity twice", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().upsertEntity(mockInvoice1);
        result.current.getState().upsertEntity(mockInvoice1);
        result.current.getState().upsertEntity(mockInvoice1);
      });

      expect(result.current.getState().entities).toHaveLength(1);
    });
  });

  describe("removeEntity", () => {
    it("should remove an entity by ID", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2, mockInvoice3]);
        result.current.getState().removeEntity(mockInvoice2.id);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().entities.find((inv) => inv.id === mockInvoice2.id)).toBeUndefined();
      expect(result.current.getState().entities[0]).toEqual(mockInvoice1);
      expect(result.current.getState().entities[1]).toEqual(mockInvoice3);
    });

    it("should remove entity from selectedEntities when removed from entities", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedEntities([mockInvoice1, mockInvoice2]);
        result.current.getState().removeEntity(mockInvoice1.id);
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().selectedEntities).toHaveLength(1);
      expect(result.current.getState().selectedEntities[0]).toEqual(mockInvoice2);
    });

    it("should handle removing non-existent entity gracefully", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1]);
        result.current.getState().removeEntity("non-existent-id");
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]).toEqual(mockInvoice1);
    });
  });

  describe("updateEntity", () => {
    it("should update an entity with partial data", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2]);
        result.current.getState().updateEntity(mockInvoice1.id, {
          name: "Updated Invoice Name",
          category: InvoiceCategory.CAR_AUTO,
        });
      });

      const updatedInvoice = result.current.getState().entities.find((inv) => inv.id === mockInvoice1.id);
      expect(updatedInvoice?.name).toBe("Updated Invoice Name");
      expect(updatedInvoice?.category).toBe(InvoiceCategory.CAR_AUTO);
      expect(updatedInvoice?.description).toBe(mockInvoice1.description); // Should remain unchanged
    });

    it("should update entity in selectedEntities when updated in entities", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedEntities([mockInvoice1]);
        result.current.getState().updateEntity(mockInvoice1.id, {
          name: "Updated Name",
        });
      });

      const selectedInvoice = result.current.getState().selectedEntities[0];
      expect(selectedInvoice?.name).toBe("Updated Name");
    });

    it("should handle updating non-existent entity gracefully", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1]);
        result.current.getState().updateEntity("non-existent-id", {name: "Should Not Update"});
      });

      expect(result.current.getState().entities).toHaveLength(1);
      expect(result.current.getState().entities[0]).toEqual(mockInvoice1);
    });
  });

  describe("toggleEntitySelection", () => {
    it("should select an unselected entity", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2]);
        result.current.getState().toggleEntitySelection(mockInvoice1);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(1);
      expect(result.current.getState().selectedEntities[0]).toEqual(mockInvoice1);
    });

    it("should deselect a selected entity", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedEntities([mockInvoice1]);
        result.current.getState().toggleEntitySelection(mockInvoice1);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(0);
    });

    it("should handle multiple toggles correctly", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2, mockInvoice3]);
        result.current.getState().toggleEntitySelection(mockInvoice1);
        result.current.getState().toggleEntitySelection(mockInvoice2);
        result.current.getState().toggleEntitySelection(mockInvoice1);
        result.current.getState().toggleEntitySelection(mockInvoice3);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(2);
      expect(result.current.getState().selectedEntities).toContainEqual(mockInvoice2);
      expect(result.current.getState().selectedEntities).toContainEqual(mockInvoice3);
    });
  });

  describe("clearSelectedEntities", () => {
    it("should clear all selected entities", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setSelectedEntities([mockInvoice1, mockInvoice2]);
        result.current.getState().clearSelectedEntities();
      });

      expect(result.current.getState().selectedEntities).toEqual([]);
    });

    it("should not affect the main entities list", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedEntities([mockInvoice1]);
        result.current.getState().clearSelectedEntities();
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().selectedEntities).toEqual([]);
    });
  });

  describe("clearEntities", () => {
    it("should clear all entities and selected entities", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedEntities([mockInvoice1]);
        result.current.getState().clearEntities();
      });

      expect(result.current.getState().entities).toEqual([]);
      expect(result.current.getState().selectedEntities).toEqual([]);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle a complete workflow: add, select, update, deselect, remove", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        // Add entities
        result.current.getState().upsertEntity(mockInvoice1);
        result.current.getState().upsertEntity(mockInvoice2);
        result.current.getState().upsertEntity(mockInvoice3);
      });

      expect(result.current.getState().entities).toHaveLength(3);

      act(() => {
        // Select entities
        result.current.getState().toggleEntitySelection(mockInvoice1);
        result.current.getState().toggleEntitySelection(mockInvoice2);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(2);

      act(() => {
        // Update an entity
        result.current.getState().updateEntity(mockInvoice1.id, {name: "Updated Invoice 1"});
      });

      const updatedInvoice = result.current.getState().entities.find((inv) => inv.id === mockInvoice1.id);
      expect(updatedInvoice?.name).toBe("Updated Invoice 1");

      act(() => {
        // Deselect one entity
        result.current.getState().toggleEntitySelection(mockInvoice2);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(1);

      act(() => {
        // Remove an entity
        result.current.getState().removeEntity(mockInvoice3.id);
      });

      expect(result.current.getState().entities).toHaveLength(2);
    });

    it("should maintain data integrity across multiple operations", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2, mockInvoice3]);
        result.current.getState().setSelectedEntities([mockInvoice1, mockInvoice2]);
        result.current.getState().removeEntity(mockInvoice1.id);
        result.current.getState().updateEntity(mockInvoice2.id, {name: "Modified Invoice 2"});
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().selectedEntities).toHaveLength(1);
      expect(result.current.getState().selectedEntities[0]?.name).toBe("Modified Invoice 2");
      expect(result.current.getState().entities.find((inv) => inv.id === mockInvoice1.id)).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty operations gracefully", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([]);
        result.current.getState().setSelectedEntities([]);
        result.current.getState().clearEntities();
        result.current.getState().clearSelectedEntities();
      });

      expect(result.current.getState().entities).toEqual([]);
      expect(result.current.getState().selectedEntities).toEqual([]);
    });

    it("should handle selecting entity not in the main list", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1]);
        result.current.getState().toggleEntitySelection(mockInvoice2);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(1);
      expect(result.current.getState().selectedEntities[0]).toEqual(mockInvoice2);
    });
  });

  describe("State Immutability", () => {
    it("should not mutate the original entities array when adding", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1]);
      });

      const originalEntities = [...result.current.getState().entities];

      act(() => {
        result.current.getState().upsertEntity(mockInvoice2);
      });

      expect(originalEntities).toEqual([mockInvoice1]);
      expect(result.current.getState().entities).toHaveLength(2);
    });

    it("should not mutate the original selectedEntities array when toggling", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setSelectedEntities([mockInvoice1]);
      });

      const originalSelected = [...result.current.getState().selectedEntities];

      act(() => {
        result.current.getState().toggleEntitySelection(mockInvoice2);
      });

      expect(originalSelected).toEqual([mockInvoice1]);
      expect(result.current.getState().selectedEntities).toHaveLength(2);
    });

    it("should create new arrays for each state update", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1]);
      });

      const firstEntitiesRef = result.current.getState().entities;

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2]);
      });

      const secondEntitiesRef = result.current.getState().entities;

      expect(firstEntitiesRef).not.toBe(secondEntitiesRef);
    });
  });

  describe("Action Coverage", () => {
    it("should cover all action branches for removeEntity", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2, mockInvoice3]);
        result.current.getState().setSelectedEntities([mockInvoice1, mockInvoice2]);
      });

      act(() => {
        result.current.getState().removeEntity(mockInvoice1.id);
      });

      expect(result.current.getState().entities).toHaveLength(2);
      expect(result.current.getState().selectedEntities).toHaveLength(1);
      expect(result.current.getState().selectedEntities[0]?.id).toBe(mockInvoice2.id);
    });

    it("should cover all action branches for updateEntity", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedEntities([mockInvoice2]);
      });

      act(() => {
        result.current.getState().updateEntity(mockInvoice2.id, {
          name: "Updated Invoice",
          category: InvoiceCategory.FAST_FOOD,
        });
      });

      expect(result.current.getState().entities[1]?.name).toBe("Updated Invoice");
      expect(result.current.getState().selectedEntities[0]?.name).toBe("Updated Invoice");
      expect(result.current.getState().selectedEntities[0]?.category).toBe(InvoiceCategory.FAST_FOOD);
    });

    it("should cover all action branches for toggleEntitySelection", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setEntities([mockInvoice1, mockInvoice2]);
      });

      // Select entity
      act(() => {
        result.current.getState().toggleEntitySelection(mockInvoice1);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(1);

      // Deselect entity
      act(() => {
        result.current.getState().toggleEntitySelection(mockInvoice1);
      });

      expect(result.current.getState().selectedEntities).toHaveLength(0);
    });
  });

  describe("Production Store", () => {
    it("should use production store when NODE_ENV is production", async () => {
      // Mock NODE_ENV as production before importing
      vi.stubEnv("NODE_ENV", "production");

      // Clear the module cache to force re-evaluation
      vi.resetModules();

      // Dynamically import the store to get the production version
      const {useInvoicesStore: prodStore} = await import("./invoicesStore");

      const {result} = renderHook(() => prodStore());

      // Test setEntities
      act(() => {
        result.current.setEntities([mockInvoice1, mockInvoice2]);
      });

      expect(result.current.entities).toHaveLength(2);

      // Test setSelectedEntities
      act(() => {
        result.current.setSelectedEntities([mockInvoice1]);
      });

      expect(result.current.selectedEntities).toHaveLength(1);

      // Test upsertEntity
      act(() => {
        result.current.upsertEntity(mockInvoice3);
      });

      expect(result.current.entities).toHaveLength(3);

      // Test removeEntity
      act(() => {
        result.current.removeEntity(mockInvoice2.id);
      });

      expect(result.current.entities).toHaveLength(2);

      // Test updateEntity
      act(() => {
        result.current.updateEntity(mockInvoice1.id, {name: "Updated in Prod"});
      });

      expect(result.current.entities[0]?.name).toBe("Updated in Prod");

      // Test toggleEntitySelection
      act(() => {
        result.current.toggleEntitySelection(mockInvoice3);
      });

      expect(result.current.selectedEntities).toHaveLength(2);

      // Test clearSelectedEntities
      act(() => {
        result.current.clearSelectedEntities();
      });

      expect(result.current.selectedEntities).toHaveLength(0);

      // Test clearEntities
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
      const {useInvoicesStore: devStore} = await import("./invoicesStore");

      const {result} = renderHook(() => devStore());

      // Test setEntities
      act(() => {
        result.current.setEntities([mockInvoice1, mockInvoice2]);
      });

      expect(result.current.entities).toHaveLength(2);

      // Test setSelectedEntities
      act(() => {
        result.current.setSelectedEntities([mockInvoice1]);
      });

      expect(result.current.selectedEntities).toHaveLength(1);

      // Test upsertEntity
      act(() => {
        result.current.upsertEntity(mockInvoice3);
      });

      expect(result.current.entities).toHaveLength(3);

      // Test removeEntity
      act(() => {
        result.current.removeEntity(mockInvoice2.id);
      });

      expect(result.current.entities).toHaveLength(2);

      // Test updateEntity
      act(() => {
        result.current.updateEntity(mockInvoice1.id, {name: "Updated in Dev"});
      });

      expect(result.current.entities[0]?.name).toBe("Updated in Dev");

      // Test toggleEntitySelection
      act(() => {
        result.current.toggleEntitySelection(mockInvoice3);
      });

      expect(result.current.selectedEntities).toHaveLength(2);

      // Test clearSelectedEntities
      act(() => {
        result.current.clearSelectedEntities();
      });

      expect(result.current.selectedEntities).toHaveLength(0);

      // Test clearEntities
      act(() => {
        result.current.clearEntities();
      });

      expect(result.current.entities).toHaveLength(0);

      // Restore environment
      vi.unstubAllEnvs();
    });
  });
});
