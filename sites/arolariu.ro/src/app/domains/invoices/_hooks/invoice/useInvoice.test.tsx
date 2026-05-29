/**
 * @fileoverview Unit tests for useInvoice client hook.
 * @module app/domains/invoices/_hooks/invoice/useInvoice.test
 */

import type {Invoice} from "@/types/invoices";
import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {actionFailure, buildInvoice} from "../../../../../../tests/helpers";
import {useInvoice} from "./useInvoice";

// Mock the Zustand store
vi.mock("@/stores", () => ({
  useInvoicesStore: vi.fn(),
}));

// Mock the server action
vi.mock("../../_actions/invoices", () => ({
  fetchInvoice: vi.fn(),
}));

// Import mocked modules
const {useInvoicesStore} = await import("@/stores");
const {fetchInvoice} = await import("../../_actions/invoices");
const mockUseInvoicesStore = vi.mocked(useInvoicesStore);
const mockFetchInvoice = vi.mocked(fetchInvoice);

describe("useInvoice", () => {
  const testInvoiceId = "11111111-1111-4111-8111-111111111111";
  const testInvoice = buildInvoice({id: testInvoiceId, name: "Test Invoice"});

  // Default mock store state
  const createMockStoreState = (overrides?: {cachedInvoice?: Invoice | null; hasHydrated?: boolean}) => {
    const upsertEntity = vi.fn();
    const state = {
      cachedInvoice: overrides?.cachedInvoice ?? null,
      upsertEntity,
      hasHydrated: overrides?.hasHydrated ?? false,
    };

    // Mock useShallow to return the state selector result directly
    mockUseInvoicesStore.mockImplementation(
      (selector: (state: {entities: Invoice[]; upsertEntity: (entity: Invoice) => void; hasHydrated: boolean}) => typeof state) => {
        return selector({
          entities: state.cachedInvoice ? [state.cachedInvoice] : [],
          upsertEntity,
          hasHydrated: state.hasHydrated,
        });
      },
    );

    return {upsertEntity};
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: store not hydrated, no cached data
    createMockStoreState({cachedInvoice: null, hasHydrated: false});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loading state", () => {
    it("returns isLoading true when store has not hydrated", () => {
      createMockStoreState({hasHydrated: false});
      mockFetchInvoice.mockResolvedValue({success: true, data: testInvoice});

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      expect(result.current.isLoading).toBe(true);
      expect(result.current.invoice).toBeNull();
      expect(result.current.isError).toBe(false);
    });

    it("returns isLoading false when store has hydrated", async () => {
      createMockStoreState({hasHydrated: true, cachedInvoice: testInvoice});
      mockFetchInvoice.mockResolvedValue({success: true, data: testInvoice});

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      expect(result.current.isLoading).toBe(false);
      expect(result.current.invoice).toEqual(testInvoice);
    });
  });

  describe("success flow", () => {
    it("fetches invoice and calls upsertEntity on success", async () => {
      const {upsertEntity} = createMockStoreState({hasHydrated: true});
      mockFetchInvoice.mockResolvedValue({success: true, data: testInvoice});

      renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      await waitFor(() => {
        expect(mockFetchInvoice).toHaveBeenCalledWith({invoiceId: testInvoiceId});
      });

      await waitFor(() => {
        expect(upsertEntity).toHaveBeenCalledWith(testInvoice);
      });
    });

    it("returns cached invoice from store immediately after hydration", () => {
      createMockStoreState({hasHydrated: true, cachedInvoice: testInvoice});
      mockFetchInvoice.mockResolvedValue({success: true, data: testInvoice});

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      // Should return cached data immediately (stale-while-revalidate)
      expect(result.current.invoice).toEqual(testInvoice);
      expect(result.current.isLoading).toBe(false);
    });

    it("shows stale data while fetching fresh data in background", async () => {
      const staleInvoice = buildInvoice({id: testInvoiceId, name: "Stale Invoice"});
      const freshInvoice = buildInvoice({id: testInvoiceId, name: "Fresh Invoice"});

      createMockStoreState({hasHydrated: true, cachedInvoice: staleInvoice});
      mockFetchInvoice.mockResolvedValue({success: true, data: freshInvoice});

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      // Initially shows stale data
      expect(result.current.invoice).toEqual(staleInvoice);
      expect(result.current.isLoading).toBe(false);

      // Fetch happens in background
      await waitFor(() => {
        expect(mockFetchInvoice).toHaveBeenCalled();
      });
    });
  });

  describe("error handling", () => {
    it("sets isError true when server action returns failure", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      createMockStoreState({hasHydrated: true});

      const errorResult = actionFailure({code: "NOT_FOUND", message: "Invoice not found"});
      mockFetchInvoice.mockResolvedValue(errorResult);

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.invoice).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error fetching invoice:", "NOT_FOUND", "Invoice not found");

      consoleErrorSpy.mockRestore();
    });

    it("sets isError true when server action throws exception", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      createMockStoreState({hasHydrated: true});

      const testError = new Error("Network failure");
      mockFetchInvoice.mockRejectedValue(testError);

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      await waitFor(() => {
        expect(result.current.isError).toBe(true);
      });

      expect(result.current.invoice).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(">>> Error fetching invoice in useInvoice hook:", testError);

      consoleErrorSpy.mockRestore();
    });

    it("does not call upsertEntity when fetch fails", async () => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const {upsertEntity} = createMockStoreState({hasHydrated: true});

      mockFetchInvoice.mockResolvedValue({
        success: false,
        error: {code: "SERVER_ERROR", message: "Internal server error"},
      });

      renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      await waitFor(() => {
        expect(mockFetchInvoice).toHaveBeenCalled();
      });

      expect(upsertEntity).not.toHaveBeenCalled();
      vi.restoreAllMocks();
    });
  });

  describe("refetch behavior", () => {
    it("refetches when invoiceIdentifier changes", async () => {
      const {upsertEntity} = createMockStoreState({hasHydrated: true});
      const invoice1 = buildInvoice({id: "11111111-1111-4111-8111-111111111111", name: "Invoice 1"});
      const invoice2 = buildInvoice({id: "22222222-2222-4222-8222-222222222222", name: "Invoice 2"});

      mockFetchInvoice.mockResolvedValueOnce({success: true, data: invoice1}).mockResolvedValueOnce({success: true, data: invoice2});

      const {rerender} = renderHook(({invoiceIdentifier}) => useInvoice({invoiceIdentifier}), {
        initialProps: {invoiceIdentifier: invoice1.id},
      });

      await waitFor(() => {
        expect(mockFetchInvoice).toHaveBeenCalledWith({invoiceId: invoice1.id});
      });

      // Change identifier
      rerender({invoiceIdentifier: invoice2.id});

      await waitFor(() => {
        expect(mockFetchInvoice).toHaveBeenCalledWith({invoiceId: invoice2.id});
      });

      expect(mockFetchInvoice).toHaveBeenCalledTimes(2);
      expect(upsertEntity).toHaveBeenCalledTimes(2);
      expect(upsertEntity).toHaveBeenNthCalledWith(1, invoice1);
      expect(upsertEntity).toHaveBeenNthCalledWith(2, invoice2);
    });

    it("fetches invoice on initial mount", async () => {
      createMockStoreState({hasHydrated: true});
      mockFetchInvoice.mockResolvedValue({success: true, data: testInvoice});

      renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      await waitFor(() => {
        expect(mockFetchInvoice).toHaveBeenCalledOnce();
      });

      expect(mockFetchInvoice).toHaveBeenCalledWith({invoiceId: testInvoiceId});
    });
  });

  describe("store integration", () => {
    it("finds cached invoice from store entities by id", () => {
      const cachedInvoice = buildInvoice({id: testInvoiceId, name: "Cached Invoice"});
      createMockStoreState({hasHydrated: true, cachedInvoice});
      mockFetchInvoice.mockResolvedValue({success: true, data: cachedInvoice});

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      expect(result.current.invoice).toEqual(cachedInvoice);
    });

    it("returns null invoice when not found in store", () => {
      createMockStoreState({hasHydrated: true, cachedInvoice: null});
      mockFetchInvoice.mockResolvedValue({success: true, data: testInvoice});

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      // Before fetch completes
      expect(result.current.invoice).toBeNull();
    });

    it("uses useShallow for optimized store subscription", () => {
      createMockStoreState({hasHydrated: true});
      mockFetchInvoice.mockResolvedValue({success: true, data: testInvoice});

      renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      expect(mockUseInvoicesStore).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe("edge cases", () => {
    it("handles empty string invoiceIdentifier gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      createMockStoreState({hasHydrated: true});

      mockFetchInvoice.mockResolvedValue({
        success: false,
        error: {code: "VALIDATION_ERROR", message: "Invalid invoice ID"},
      });

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: ""}));

      await waitFor(() => {
        expect(mockFetchInvoice).toHaveBeenCalledWith({invoiceId: ""});
      });

      expect(result.current.invoice).toBeNull();
      consoleErrorSpy.mockRestore();
    });

    it("handles invoice with missing required fields", async () => {
      createMockStoreState({hasHydrated: true});
      const partialInvoice = {id: testInvoiceId} as Invoice;

      mockFetchInvoice.mockResolvedValue({success: true, data: partialInvoice});

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      await waitFor(() => {
        expect(mockFetchInvoice).toHaveBeenCalled();
      });

      // Hook should not crash, should pass data through
      expect(result.current.isError).toBe(false);
    });
  });

  describe("return type contract", () => {
    it("returns readonly output object with correct structure", () => {
      createMockStoreState({hasHydrated: true, cachedInvoice: testInvoice});
      mockFetchInvoice.mockResolvedValue({success: true, data: testInvoice});

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      expect(result.current).toHaveProperty("invoice");
      expect(result.current).toHaveProperty("isLoading");
      expect(result.current).toHaveProperty("isError");
      expect(typeof result.current.isLoading).toBe("boolean");
      expect(typeof result.current.isError).toBe("boolean");
    });

    it("returns invoice as Invoice | null", () => {
      createMockStoreState({hasHydrated: true, cachedInvoice: testInvoice});
      mockFetchInvoice.mockResolvedValue({success: true, data: testInvoice});

      const {result} = renderHook(() => useInvoice({invoiceIdentifier: testInvoiceId}));

      // TypeScript should allow this
      const invoice: Invoice | null = result.current.invoice;
      expect(invoice).toEqual(testInvoice);
    });
  });
});
