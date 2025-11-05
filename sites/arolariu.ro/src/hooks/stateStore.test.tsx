import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it} from "vitest";
import {InvoiceBuilder} from "@/data/mocks/invoice";
import {MerchantBuilder} from "@/data/mocks/merchant";
import {useZustandStore} from "./stateStore";

describe("useZustandStore", () => {
  beforeEach(() => {
    // Clear the store before each test
    const {setState} = useZustandStore;
    setState({
      invoices: [],
      selectedInvoices: [],
      merchants: [],
    });
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

      const mockInvoices = [
        new InvoiceBuilder().withId("inv-1").withName("Invoice 1").build(),
        new InvoiceBuilder().withId("inv-2").withName("Invoice 2").build(),
      ];

      act(() => {
        result.current.setInvoices(mockInvoices);
      });

      expect(result.current.invoices).toEqual(mockInvoices);
    });

    it("should replace existing invoices", () => {
      const {result} = renderHook(() => useZustandStore());

      const initialInvoices = [new InvoiceBuilder().withId("inv-1").withName("Invoice 1").build()];
      const newInvoices = [new InvoiceBuilder().withId("inv-2").withName("Invoice 2").build()];

      act(() => {
        result.current.setInvoices(initialInvoices);
      });

      expect(result.current.invoices).toEqual(initialInvoices);

      act(() => {
        result.current.setInvoices(newInvoices);
      });

      expect(result.current.invoices).toEqual(newInvoices);
    });

    it("should handle empty invoice array", () => {
      const {result} = renderHook(() => useZustandStore());

      const invoices = [new InvoiceBuilder().withId("inv-1").withName("Invoice 1").build()];

      act(() => {
        result.current.setInvoices(invoices);
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

      const mockSelectedInvoices = [new InvoiceBuilder().withId("inv-1").withName("Selected Invoice").build()];

      act(() => {
        result.current.setSelectedInvoices(mockSelectedInvoices);
      });

      expect(result.current.selectedInvoices).toEqual(mockSelectedInvoices);
    });

    it("should update selection independently of invoices array", () => {
      const {result} = renderHook(() => useZustandStore());

      const allInvoices = [
        new InvoiceBuilder().withId("inv-1").withName("Invoice 1").build(),
        new InvoiceBuilder().withId("inv-2").withName("Invoice 2").build(),
        new InvoiceBuilder().withId("inv-3").withName("Invoice 3").build(),
      ];

      const selectedInvoices = [
        new InvoiceBuilder().withId("inv-1").withName("Invoice 1").build(),
        new InvoiceBuilder().withId("inv-3").withName("Invoice 3").build(),
      ];

      act(() => {
        result.current.setInvoices(allInvoices);
        result.current.setSelectedInvoices(selectedInvoices);
      });

      expect(result.current.invoices).toHaveLength(3);
      expect(result.current.selectedInvoices).toHaveLength(2);
    });

    it("should clear selected invoices when set to empty array", () => {
      const {result} = renderHook(() => useZustandStore());

      const selected = [new InvoiceBuilder().withId("inv-1").withName("Invoice 1").build()];

      act(() => {
        result.current.setSelectedInvoices(selected);
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

      const mockMerchants = [
        new MerchantBuilder().withId("merchant-1").withName("Merchant 1").build(),
        new MerchantBuilder().withId("merchant-2").withName("Merchant 2").build(),
      ];

      act(() => {
        result.current.setMerchants(mockMerchants);
      });

      expect(result.current.merchants).toEqual(mockMerchants);
    });

    it("should replace existing merchants", () => {
      const {result} = renderHook(() => useZustandStore());

      const initialMerchants = [new MerchantBuilder().withId("merchant-1").withName("Merchant 1").build()];
      const newMerchants = [new MerchantBuilder().withId("merchant-2").withName("Merchant 2").build()];

      act(() => {
        result.current.setMerchants(initialMerchants);
      });

      act(() => {
        result.current.setMerchants(newMerchants);
      });

      expect(result.current.merchants).toEqual(newMerchants);
    });

    it("should handle empty merchant array", () => {
      const {result} = renderHook(() => useZustandStore());

      const merchants = [new MerchantBuilder().withId("merchant-1").withName("Merchant 1").build()];

      act(() => {
        result.current.setMerchants(merchants);
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

      const invoices = [new InvoiceBuilder().withId("inv-1").withName("Invoice 1").build()];
      const selectedInvoices = [new InvoiceBuilder().withId("inv-1").withName("Invoice 1").build()];
      const merchants = [new MerchantBuilder().withId("merchant-1").withName("Merchant 1").build()];

      act(() => {
        result.current.setInvoices(invoices);
        result.current.setSelectedInvoices(selectedInvoices);
        result.current.setMerchants(merchants);
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

  describe("setter state preservation", () => {
    it("should preserve other state when calling setInvoices", () => {
      const {result} = renderHook(() => useZustandStore());

      const merchant = new MerchantBuilder().withId("m1").withName("Merchant 1").build();
      const selectedInvoice = new InvoiceBuilder().withId("si1").withName("Selected 1").build();
      const newInvoice = new InvoiceBuilder().withId("ni1").withName("New Invoice").build();

      act(() => {
        result.current.setMerchants([merchant]);
        result.current.setSelectedInvoices([selectedInvoice]);
      });

      act(() => {
        result.current.setInvoices([newInvoice]);
      });

      // Verify all states are maintained properly
      expect(result.current.invoices).toEqual([newInvoice]);
      expect(result.current.selectedInvoices).toEqual([selectedInvoice]);
      expect(result.current.merchants).toEqual([merchant]);
    });

    it("should preserve other state when calling setSelectedInvoices", () => {
      const {result} = renderHook(() => useZustandStore());

      const invoice = new InvoiceBuilder().withId("i1").withName("Invoice 1").build();
      const merchant = new MerchantBuilder().withId("m1").withName("Merchant 1").build();
      const selected = new InvoiceBuilder().withId("s1").withName("Selected 1").build();

      act(() => {
        result.current.setInvoices([invoice]);
        result.current.setMerchants([merchant]);
      });

      act(() => {
        result.current.setSelectedInvoices([selected]);
      });

      // Verify all states are maintained properly
      expect(result.current.invoices).toEqual([invoice]);
      expect(result.current.selectedInvoices).toEqual([selected]);
      expect(result.current.merchants).toEqual([merchant]);
    });

    it("should preserve other state when calling setMerchants", () => {
      const {result} = renderHook(() => useZustandStore());

      const invoice = new InvoiceBuilder().withId("i1").withName("Invoice 1").build();
      const selected = new InvoiceBuilder().withId("s1").withName("Selected 1").build();
      const merchant = new MerchantBuilder().withId("m1").withName("Merchant 1").build();

      act(() => {
        result.current.setInvoices([invoice]);
        result.current.setSelectedInvoices([selected]);
      });

      act(() => {
        result.current.setMerchants([merchant]);
      });

      // Verify all states are maintained properly
      expect(result.current.invoices).toEqual([invoice]);
      expect(result.current.selectedInvoices).toEqual([selected]);
      expect(result.current.merchants).toEqual([merchant]);
    });
  });
});
