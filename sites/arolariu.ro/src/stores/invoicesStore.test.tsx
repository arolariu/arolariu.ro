/**
 * @fileoverview Unit tests for the invoices Zustand store
 * @module stores/invoicesStore.test
 */

import {InvoiceBuilder} from "@/data/mocks";
import {InvoiceCategory, InvoiceScanType} from "@/types/invoices";
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
    .withPaymentInformation(null)
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
    .withPaymentInformation(null)
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
    .withPaymentInformation(null)
    .build();

  beforeEach(() => {
    // Reset the store before each test
    const {result} = renderHook(() => useInvoicesStore);
    act(() => {
      result.current.getState().clearInvoices();
    });
  });

  describe("Initial State", () => {
    it("should initialize with empty invoices and selectedInvoices", () => {
      const {result} = renderHook(() => useInvoicesStore);

      expect(result.current.getState().invoices).toEqual([]);
      expect(result.current.getState().selectedInvoices).toEqual([]);
    });
  });

  describe("setInvoices", () => {
    it("should set all invoices", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
      });

      expect(result.current.getState().invoices).toHaveLength(2);
      expect(result.current.getState().invoices[0]).toEqual(mockInvoice1);
      expect(result.current.getState().invoices[1]).toEqual(mockInvoice2);
    });

    it("should replace existing invoices when set", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1]);
      });

      expect(result.current.getState().invoices).toHaveLength(1);

      act(() => {
        result.current.getState().setInvoices([mockInvoice2, mockInvoice3]);
      });

      expect(result.current.getState().invoices).toHaveLength(2);
      expect(result.current.getState().invoices[0]).toEqual(mockInvoice2);
      expect(result.current.getState().invoices[1]).toEqual(mockInvoice3);
    });
  });

  describe("setSelectedInvoices", () => {
    it("should set selected invoices", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setSelectedInvoices([mockInvoice1]);
      });

      expect(result.current.getState().selectedInvoices).toHaveLength(1);
      expect(result.current.getState().selectedInvoices[0]).toEqual(mockInvoice1);
    });

    it("should replace existing selected invoices when set", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setSelectedInvoices([mockInvoice1, mockInvoice2]);
      });

      expect(result.current.getState().selectedInvoices).toHaveLength(2);

      act(() => {
        result.current.getState().setSelectedInvoices([mockInvoice3]);
      });

      expect(result.current.getState().selectedInvoices).toHaveLength(1);
      expect(result.current.getState().selectedInvoices[0]).toEqual(mockInvoice3);
    });
  });

  describe("upsertInvoice", () => {
    it("should add a new invoice to the store", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().upsertInvoice(mockInvoice1);
      });

      expect(result.current.getState().invoices).toHaveLength(1);
      expect(result.current.getState().invoices[0]).toEqual(mockInvoice1);
    });

    it("should append invoice to existing invoices", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1]);
        result.current.getState().upsertInvoice(mockInvoice2);
      });

      expect(result.current.getState().invoices).toHaveLength(2);
      expect(result.current.getState().invoices[0]).toEqual(mockInvoice1);
      expect(result.current.getState().invoices[1]).toEqual(mockInvoice2);
    });

    it("should allow adding multiple invoices sequentially", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().upsertInvoice(mockInvoice1);
        result.current.getState().upsertInvoice(mockInvoice2);
        result.current.getState().upsertInvoice(mockInvoice3);
      });

      expect(result.current.getState().invoices).toHaveLength(3);
    });

    it("should update existing invoice when upserting with same ID", () => {
      const {result} = renderHook(() => useInvoicesStore);

      // Add initial invoice
      act(() => {
        result.current.getState().upsertInvoice(mockInvoice1);
      });

      expect(result.current.getState().invoices).toHaveLength(1);
      expect(result.current.getState().invoices[0]?.name).toBe("Test Invoice 1");

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
        .withPaymentInformation(null)
        .build();

      // Upsert should update, not duplicate
      act(() => {
        result.current.getState().upsertInvoice(updatedInvoice);
      });

      expect(result.current.getState().invoices).toHaveLength(1);
      expect(result.current.getState().invoices[0]?.name).toBe("Updated Invoice Name");
      expect(result.current.getState().invoices[0]?.description).toBe("Updated description");
      expect(result.current.getState().invoices[0]?.category).toBe(InvoiceCategory.CAR_AUTO);
    });

    it("should not create duplicates when upserting same invoice twice", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().upsertInvoice(mockInvoice1);
        result.current.getState().upsertInvoice(mockInvoice1);
        result.current.getState().upsertInvoice(mockInvoice1);
      });

      expect(result.current.getState().invoices).toHaveLength(1);
    });
  });

  describe("removeInvoice", () => {
    it("should remove an invoice by ID", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2, mockInvoice3]);
        result.current.getState().removeInvoice(mockInvoice2.id);
      });

      expect(result.current.getState().invoices).toHaveLength(2);
      expect(result.current.getState().invoices.find((inv) => inv.id === mockInvoice2.id)).toBeUndefined();
      expect(result.current.getState().invoices[0]).toEqual(mockInvoice1);
      expect(result.current.getState().invoices[1]).toEqual(mockInvoice3);
    });

    it("should remove invoice from selectedInvoices when removed from invoices", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedInvoices([mockInvoice1, mockInvoice2]);
        result.current.getState().removeInvoice(mockInvoice1.id);
      });

      expect(result.current.getState().invoices).toHaveLength(1);
      expect(result.current.getState().selectedInvoices).toHaveLength(1);
      expect(result.current.getState().selectedInvoices[0]).toEqual(mockInvoice2);
    });

    it("should handle removing non-existent invoice gracefully", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1]);
        result.current.getState().removeInvoice("non-existent-id");
      });

      expect(result.current.getState().invoices).toHaveLength(1);
      expect(result.current.getState().invoices[0]).toEqual(mockInvoice1);
    });
  });

  describe("updateInvoice", () => {
    it("should update an invoice with partial data", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
        result.current.getState().updateInvoice(mockInvoice1.id, {
          name: "Updated Invoice Name",
          category: InvoiceCategory.CAR_AUTO,
        });
      });

      const updatedInvoice = result.current.getState().invoices.find((inv) => inv.id === mockInvoice1.id);
      expect(updatedInvoice?.name).toBe("Updated Invoice Name");
      expect(updatedInvoice?.category).toBe(InvoiceCategory.CAR_AUTO);
      expect(updatedInvoice?.description).toBe(mockInvoice1.description); // Should remain unchanged
    });

    it("should update invoice in selectedInvoices when updated in invoices", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedInvoices([mockInvoice1]);
        result.current.getState().updateInvoice(mockInvoice1.id, {
          name: "Updated Name",
        });
      });

      const selectedInvoice = result.current.getState().selectedInvoices[0];
      expect(selectedInvoice?.name).toBe("Updated Name");
    });

    it("should handle updating non-existent invoice gracefully", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1]);
        result.current.getState().updateInvoice("non-existent-id", {name: "Should Not Update"});
      });

      expect(result.current.getState().invoices).toHaveLength(1);
      expect(result.current.getState().invoices[0]).toEqual(mockInvoice1);
    });
  });

  describe("toggleInvoiceSelection", () => {
    it("should select an unselected invoice", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
        result.current.getState().toggleInvoiceSelection(mockInvoice1);
      });

      expect(result.current.getState().selectedInvoices).toHaveLength(1);
      expect(result.current.getState().selectedInvoices[0]).toEqual(mockInvoice1);
    });

    it("should deselect a selected invoice", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedInvoices([mockInvoice1]);
        result.current.getState().toggleInvoiceSelection(mockInvoice1);
      });

      expect(result.current.getState().selectedInvoices).toHaveLength(0);
    });

    it("should handle multiple toggles correctly", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2, mockInvoice3]);
        result.current.getState().toggleInvoiceSelection(mockInvoice1);
        result.current.getState().toggleInvoiceSelection(mockInvoice2);
        result.current.getState().toggleInvoiceSelection(mockInvoice1);
        result.current.getState().toggleInvoiceSelection(mockInvoice3);
      });

      expect(result.current.getState().selectedInvoices).toHaveLength(2);
      expect(result.current.getState().selectedInvoices).toContainEqual(mockInvoice2);
      expect(result.current.getState().selectedInvoices).toContainEqual(mockInvoice3);
    });
  });

  describe("clearSelectedInvoices", () => {
    it("should clear all selected invoices", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setSelectedInvoices([mockInvoice1, mockInvoice2]);
        result.current.getState().clearSelectedInvoices();
      });

      expect(result.current.getState().selectedInvoices).toEqual([]);
    });

    it("should not affect the main invoices list", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedInvoices([mockInvoice1]);
        result.current.getState().clearSelectedInvoices();
      });

      expect(result.current.getState().invoices).toHaveLength(2);
      expect(result.current.getState().selectedInvoices).toEqual([]);
    });
  });

  describe("clearInvoices", () => {
    it("should clear all invoices and selected invoices", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedInvoices([mockInvoice1]);
        result.current.getState().clearInvoices();
      });

      expect(result.current.getState().invoices).toEqual([]);
      expect(result.current.getState().selectedInvoices).toEqual([]);
    });
  });

  describe("Complex Scenarios", () => {
    it("should handle a complete workflow: add, select, update, deselect, remove", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        // Add invoices
        result.current.getState().upsertInvoice(mockInvoice1);
        result.current.getState().upsertInvoice(mockInvoice2);
        result.current.getState().upsertInvoice(mockInvoice3);
      });

      expect(result.current.getState().invoices).toHaveLength(3);

      act(() => {
        // Select invoices
        result.current.getState().toggleInvoiceSelection(mockInvoice1);
        result.current.getState().toggleInvoiceSelection(mockInvoice2);
      });

      expect(result.current.getState().selectedInvoices).toHaveLength(2);

      act(() => {
        // Update an invoice
        result.current.getState().updateInvoice(mockInvoice1.id, {name: "Updated Invoice 1"});
      });

      const updatedInvoice = result.current.getState().invoices.find((inv) => inv.id === mockInvoice1.id);
      expect(updatedInvoice?.name).toBe("Updated Invoice 1");

      act(() => {
        // Deselect one invoice
        result.current.getState().toggleInvoiceSelection(mockInvoice2);
      });

      expect(result.current.getState().selectedInvoices).toHaveLength(1);

      act(() => {
        // Remove an invoice
        result.current.getState().removeInvoice(mockInvoice3.id);
      });

      expect(result.current.getState().invoices).toHaveLength(2);
    });

    it("should maintain data integrity across multiple operations", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2, mockInvoice3]);
        result.current.getState().setSelectedInvoices([mockInvoice1, mockInvoice2]);
        result.current.getState().removeInvoice(mockInvoice1.id);
        result.current.getState().updateInvoice(mockInvoice2.id, {name: "Modified Invoice 2"});
      });

      expect(result.current.getState().invoices).toHaveLength(2);
      expect(result.current.getState().selectedInvoices).toHaveLength(1);
      expect(result.current.getState().selectedInvoices[0]?.name).toBe("Modified Invoice 2");
      expect(result.current.getState().invoices.find((inv) => inv.id === mockInvoice1.id)).toBeUndefined();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty operations gracefully", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([]);
        result.current.getState().setSelectedInvoices([]);
        result.current.getState().clearInvoices();
        result.current.getState().clearSelectedInvoices();
      });

      expect(result.current.getState().invoices).toEqual([]);
      expect(result.current.getState().selectedInvoices).toEqual([]);
    });

    it("should handle selecting invoice not in the main list", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1]);
        result.current.getState().toggleInvoiceSelection(mockInvoice2);
      });

      expect(result.current.getState().selectedInvoices).toHaveLength(1);
      expect(result.current.getState().selectedInvoices[0]).toEqual(mockInvoice2);
    });
  });

  describe("State Immutability", () => {
    it("should not mutate the original invoices array when adding", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1]);
      });

      const originalInvoices = [...result.current.getState().invoices];

      act(() => {
        result.current.getState().upsertInvoice(mockInvoice2);
      });

      expect(originalInvoices).toEqual([mockInvoice1]);
      expect(result.current.getState().invoices).toHaveLength(2);
    });

    it("should not mutate the original selectedInvoices array when toggling", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setSelectedInvoices([mockInvoice1]);
      });

      const originalSelected = [...result.current.getState().selectedInvoices];

      act(() => {
        result.current.getState().toggleInvoiceSelection(mockInvoice2);
      });

      expect(originalSelected).toEqual([mockInvoice1]);
      expect(result.current.getState().selectedInvoices).toHaveLength(2);
    });

    it("should create new arrays for each state update", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1]);
      });

      const firstInvoicesRef = result.current.getState().invoices;

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
      });

      const secondInvoicesRef = result.current.getState().invoices;

      expect(firstInvoicesRef).not.toBe(secondInvoicesRef);
    });
  });

  describe("Action Coverage", () => {
    it("should cover all action branches for removeInvoice", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2, mockInvoice3]);
        result.current.getState().setSelectedInvoices([mockInvoice1, mockInvoice2]);
      });

      act(() => {
        result.current.getState().removeInvoice(mockInvoice1.id);
      });

      expect(result.current.getState().invoices).toHaveLength(2);
      expect(result.current.getState().selectedInvoices).toHaveLength(1);
      expect(result.current.getState().selectedInvoices[0]?.id).toBe(mockInvoice2.id);
    });

    it("should cover all action branches for updateInvoice", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
        result.current.getState().setSelectedInvoices([mockInvoice2]);
      });

      act(() => {
        result.current.getState().updateInvoice(mockInvoice2.id, {
          name: "Updated Invoice",
          category: InvoiceCategory.FAST_FOOD,
        });
      });

      expect(result.current.getState().invoices[1]?.name).toBe("Updated Invoice");
      expect(result.current.getState().selectedInvoices[0]?.name).toBe("Updated Invoice");
      expect(result.current.getState().selectedInvoices[0]?.category).toBe(InvoiceCategory.FAST_FOOD);
    });

    it("should cover all action branches for toggleInvoiceSelection", () => {
      const {result} = renderHook(() => useInvoicesStore);

      act(() => {
        result.current.getState().setInvoices([mockInvoice1, mockInvoice2]);
      });

      // Select invoice
      act(() => {
        result.current.getState().toggleInvoiceSelection(mockInvoice1);
      });

      expect(result.current.getState().selectedInvoices).toHaveLength(1);

      // Deselect invoice
      act(() => {
        result.current.getState().toggleInvoiceSelection(mockInvoice1);
      });

      expect(result.current.getState().selectedInvoices).toHaveLength(0);
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

      // Test setInvoices
      act(() => {
        result.current.setInvoices([mockInvoice1, mockInvoice2]);
      });

      expect(result.current.invoices).toHaveLength(2);

      // Test setSelectedInvoices
      act(() => {
        result.current.setSelectedInvoices([mockInvoice1]);
      });

      expect(result.current.selectedInvoices).toHaveLength(1);

      // Test upsertInvoice
      act(() => {
        result.current.upsertInvoice(mockInvoice3);
      });

      expect(result.current.invoices).toHaveLength(3);

      // Test removeInvoice
      act(() => {
        result.current.removeInvoice(mockInvoice2.id);
      });

      expect(result.current.invoices).toHaveLength(2);

      // Test updateInvoice
      act(() => {
        result.current.updateInvoice(mockInvoice1.id, {name: "Updated in Prod"});
      });

      expect(result.current.invoices[0]?.name).toBe("Updated in Prod");

      // Test toggleInvoiceSelection
      act(() => {
        result.current.toggleInvoiceSelection(mockInvoice3);
      });

      expect(result.current.selectedInvoices).toHaveLength(2);

      // Test clearSelectedInvoices
      act(() => {
        result.current.clearSelectedInvoices();
      });

      expect(result.current.selectedInvoices).toHaveLength(0);

      // Test clearInvoices
      act(() => {
        result.current.clearInvoices();
      });

      expect(result.current.invoices).toHaveLength(0);

      // Restore environment
      vi.unstubAllEnvs();
    });
  });
});
