import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import type {Invoice, Merchant} from "@/types/invoices";
import {useZustandStore} from "./stateStore";

describe("useZustandStore", () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    // Clear the store before each test
    const {getState, setState} = useZustandStore;
    setState({
      invoices: [],
      selectedInvoices: [],
      merchants: [],
    });
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  describe("initial state", () => {
    it("should have empty invoices array by default", () => {
      const {result} = renderHook(() => useZustandStore());

      expect(result.current.invoices).toEqual([]);
    });

    it("should have empty selectedInvoices array by default", () => {
      const {result} = renderHook(() => useZustandStore());

      expect(result.current.selectedInvoices).toEqual([]);
    });

    it("should have empty merchants array by default", () => {
      const {result} = renderHook(() => useZustandStore());

      expect(result.current.merchants).toEqual([]);
    });
  });

  describe("setInvoices", () => {
    it("should set invoices in the store", () => {
      const {result} = renderHook(() => useZustandStore());

      const mockInvoices: Partial<Invoice>[] = [
        {id: "inv-1", name: "Invoice 1", totalAmount: 100},
        {id: "inv-2", name: "Invoice 2", totalAmount: 200},
      ];

      act(() => {
        result.current.setInvoices(mockInvoices as Invoice[]);
      });

      expect(result.current.invoices).toEqual(mockInvoices);
    });

    it("should replace existing invoices", () => {
      const {result} = renderHook(() => useZustandStore());

      const initialInvoices: Partial<Invoice>[] = [{id: "inv-1", name: "Invoice 1"}];
      const newInvoices: Partial<Invoice>[] = [{id: "inv-2", name: "Invoice 2"}];

      act(() => {
        result.current.setInvoices(initialInvoices as Invoice[]);
      });

      expect(result.current.invoices).toEqual(initialInvoices);

      act(() => {
        result.current.setInvoices(newInvoices as Invoice[]);
      });

      expect(result.current.invoices).toEqual(newInvoices);
    });

    it("should handle empty invoice array", () => {
      const {result} = renderHook(() => useZustandStore());

      const invoices: Partial<Invoice>[] = [{id: "inv-1", name: "Invoice 1"}];

      act(() => {
        result.current.setInvoices(invoices as Invoice[]);
      });

      act(() => {
        result.current.setInvoices([]);
      });

      expect(result.current.invoices).toEqual([]);
    });
  });

  describe("setSelectedInvoices", () => {
    it("should set selected invoices in the store", () => {
      const {result} = renderHook(() => useZustandStore());

      const mockSelectedInvoices: Partial<Invoice>[] = [{id: "inv-1", name: "Selected Invoice"}];

      act(() => {
        result.current.setSelectedInvoices(mockSelectedInvoices as Invoice[]);
      });

      expect(result.current.selectedInvoices).toEqual(mockSelectedInvoices);
    });

    it("should update selection independently of invoices array", () => {
      const {result} = renderHook(() => useZustandStore());

      const allInvoices: Partial<Invoice>[] = [
        {id: "inv-1", name: "Invoice 1"},
        {id: "inv-2", name: "Invoice 2"},
        {id: "inv-3", name: "Invoice 3"},
      ];

      const selectedInvoices: Partial<Invoice>[] = [
        {id: "inv-1", name: "Invoice 1"},
        {id: "inv-3", name: "Invoice 3"},
      ];

      act(() => {
        result.current.setInvoices(allInvoices as Invoice[]);
        result.current.setSelectedInvoices(selectedInvoices as Invoice[]);
      });

      expect(result.current.invoices).toHaveLength(3);
      expect(result.current.selectedInvoices).toHaveLength(2);
    });

    it("should clear selected invoices when set to empty array", () => {
      const {result} = renderHook(() => useZustandStore());

      const selected: Partial<Invoice>[] = [{id: "inv-1", name: "Invoice 1"}];

      act(() => {
        result.current.setSelectedInvoices(selected as Invoice[]);
      });

      expect(result.current.selectedInvoices).toEqual(selected);

      act(() => {
        result.current.setSelectedInvoices([]);
      });

      expect(result.current.selectedInvoices).toEqual([]);
    });
  });

  describe("setMerchants", () => {
    it("should set merchants in the store", () => {
      const {result} = renderHook(() => useZustandStore());

      const mockMerchants: Partial<Merchant>[] = [
        {id: "merchant-1", name: "Merchant 1"},
        {id: "merchant-2", name: "Merchant 2"},
      ];

      act(() => {
        result.current.setMerchants(mockMerchants as Merchant[]);
      });

      expect(result.current.merchants).toEqual(mockMerchants);
    });

    it("should replace existing merchants", () => {
      const {result} = renderHook(() => useZustandStore());

      const initialMerchants: Partial<Merchant>[] = [{id: "merchant-1", name: "Merchant 1"}];
      const newMerchants: Partial<Merchant>[] = [{id: "merchant-2", name: "Merchant 2"}];

      act(() => {
        result.current.setMerchants(initialMerchants as Merchant[]);
      });

      act(() => {
        result.current.setMerchants(newMerchants as Merchant[]);
      });

      expect(result.current.merchants).toEqual(newMerchants);
    });

    it("should handle empty merchant array", () => {
      const {result} = renderHook(() => useZustandStore());

      const merchants: Partial<Merchant>[] = [{id: "merchant-1", name: "Merchant 1"}];

      act(() => {
        result.current.setMerchants(merchants as Merchant[]);
      });

      act(() => {
        result.current.setMerchants([]);
      });

      expect(result.current.merchants).toEqual([]);
    });
  });

  describe("state independence", () => {
    it("should maintain state independence between different store slices", () => {
      const {result} = renderHook(() => useZustandStore());

      const invoices: Partial<Invoice>[] = [{id: "inv-1", name: "Invoice 1"}];
      const selectedInvoices: Partial<Invoice>[] = [{id: "inv-1", name: "Invoice 1"}];
      const merchants: Partial<Merchant>[] = [{id: "merchant-1", name: "Merchant 1"}];

      act(() => {
        result.current.setInvoices(invoices as Invoice[]);
        result.current.setSelectedInvoices(selectedInvoices as Invoice[]);
        result.current.setMerchants(merchants as Merchant[]);
      });

      expect(result.current.invoices).toEqual(invoices);
      expect(result.current.selectedInvoices).toEqual(selectedInvoices);
      expect(result.current.merchants).toEqual(merchants);

      // Update one slice
      act(() => {
        result.current.setInvoices([]);
      });

      // Other slices should remain unchanged
      expect(result.current.invoices).toEqual([]);
      expect(result.current.selectedInvoices).toEqual(selectedInvoices);
      expect(result.current.merchants).toEqual(merchants);
    });
  });

  describe("environment-specific store selection", () => {
    it("should use devStore in test environment", () => {
      // In test environment, NODE_ENV is "test"
      expect(process.env.NODE_ENV).not.toBe("production");
      
      const {result} = renderHook(() => useZustandStore());
      
      // The store should work properly in test mode
      expect(result.current.invoices).toEqual([]);
      expect(typeof result.current.setInvoices).toBe("function");
    });
  });
});
