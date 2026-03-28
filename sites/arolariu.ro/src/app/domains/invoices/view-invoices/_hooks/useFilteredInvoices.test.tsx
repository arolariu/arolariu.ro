/**
 * @fileoverview Unit tests for useFilteredInvoices hook.
 * @module app/domains/invoices/view-invoices/_hooks/useFilteredInvoices.test
 */

import {InvoiceBuilder} from "@/data/mocks/invoice";
import {InvoiceCategory, PaymentType} from "@/types/invoices";
import {renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import type {FilterState} from "../_components/filters/FilterBar";
import {useFilteredInvoices} from "./useFilteredInvoices";

describe("useFilteredInvoices", () => {
  const mockInvoices = [
    new InvoiceBuilder()
      .withId("invoice-1")
      .withName("Grocery Shopping")
      .withDescription("Weekly groceries")
      .withCategory(InvoiceCategory.GROCERY)
      .withPaymentInformation({
        transactionDate: new Date("2024-01-15T10:00:00Z"),
        paymentType: PaymentType.Card,
        currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
        totalCostAmount: 150.0,
        totalTaxAmount: 20.0,
      })
      .build(),
    new InvoiceBuilder()
      .withId("invoice-2")
      .withName("Fast Food")
      .withDescription("Lunch at McDonald's")
      .withCategory(InvoiceCategory.FAST_FOOD)
      .withPaymentInformation({
        transactionDate: new Date("2024-02-10T14:30:00Z"),
        paymentType: PaymentType.Cash,
        currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
        totalCostAmount: 45.5,
        totalTaxAmount: 5.0,
      })
      .build(),
    new InvoiceBuilder()
      .withId("invoice-3")
      .withName("Car Wash")
      .withDescription("Monthly car maintenance")
      .withCategory(InvoiceCategory.CAR_AUTO)
      .withPaymentInformation({
        transactionDate: new Date("2024-03-05T16:00:00Z"),
        paymentType: PaymentType.Card,
        currency: {code: "RON", symbol: "lei", name: "Romanian Leu"},
        totalCostAmount: 80.0,
        totalTaxAmount: 10.0,
      })
      .build(),
  ];

  const defaultFilters: FilterState = {
    searchQuery: "",
    dateFrom: null,
    dateTo: null,
    amountMin: null,
    amountMax: null,
    categories: [],
    paymentTypes: [],
    sortBy: "date-desc",
  };

  describe("Text Search Filtering", () => {
    it("should filter invoices by name (case-insensitive)", () => {
      const filters: FilterState = {
        ...defaultFilters,
        searchQuery: "grocery",
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.name).toBe("Grocery Shopping");
    });

    it("should filter invoices by description", () => {
      const filters: FilterState = {
        ...defaultFilters,
        searchQuery: "lunch",
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.name).toBe("Fast Food");
    });

    it("should return all invoices when search query is empty", () => {
      const filters: FilterState = {
        ...defaultFilters,
        searchQuery: "",
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(3);
    });
  });

  describe("Date Range Filtering", () => {
    it("should filter invoices by date from", () => {
      const filters: FilterState = {
        ...defaultFilters,
        dateFrom: new Date("2024-02-01"),
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.map((i) => i.name)).toEqual(["Car Wash", "Fast Food"]);
    });

    it("should filter invoices by date to", () => {
      const filters: FilterState = {
        ...defaultFilters,
        dateTo: new Date("2024-02-15"),
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.map((i) => i.name)).toEqual(["Fast Food", "Grocery Shopping"]);
    });

    it("should filter invoices by date range", () => {
      const filters: FilterState = {
        ...defaultFilters,
        dateFrom: new Date("2024-02-01"),
        dateTo: new Date("2024-02-28"),
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.name).toBe("Fast Food");
    });
  });

  describe("Amount Range Filtering", () => {
    it("should filter invoices by minimum amount", () => {
      const filters: FilterState = {
        ...defaultFilters,
        amountMin: 80,
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.map((i) => i.name).sort()).toEqual(["Car Wash", "Grocery Shopping"]);
    });

    it("should filter invoices by maximum amount", () => {
      const filters: FilterState = {
        ...defaultFilters,
        amountMax: 50,
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.name).toBe("Fast Food");
    });

    it("should filter invoices by amount range", () => {
      const filters: FilterState = {
        ...defaultFilters,
        amountMin: 40,
        amountMax: 100,
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.map((i) => i.name).sort()).toEqual(["Car Wash", "Fast Food"]);
    });
  });

  describe("Category Filtering", () => {
    it("should filter invoices by single category", () => {
      const filters: FilterState = {
        ...defaultFilters,
        categories: [InvoiceCategory.GROCERY],
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.name).toBe("Grocery Shopping");
    });

    it("should filter invoices by multiple categories (OR logic)", () => {
      const filters: FilterState = {
        ...defaultFilters,
        categories: [InvoiceCategory.GROCERY, InvoiceCategory.FAST_FOOD],
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.map((i) => i.name).sort()).toEqual(["Fast Food", "Grocery Shopping"]);
    });

    it("should return all invoices when no categories selected", () => {
      const filters: FilterState = {
        ...defaultFilters,
        categories: [],
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(3);
    });
  });

  describe("Payment Type Filtering", () => {
    it("should filter invoices by single payment type", () => {
      const filters: FilterState = {
        ...defaultFilters,
        paymentTypes: [PaymentType.Cash],
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.name).toBe("Fast Food");
    });

    it("should filter invoices by multiple payment types (OR logic)", () => {
      const filters: FilterState = {
        ...defaultFilters,
        paymentTypes: [PaymentType.Card],
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(2);
      expect(result.current.map((i) => i.name).sort()).toEqual(["Car Wash", "Grocery Shopping"]);
    });
  });

  describe("Sorting", () => {
    it("should sort by date descending (newest first)", () => {
      const filters: FilterState = {
        ...defaultFilters,
        sortBy: "date-desc",
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current.map((i) => i.name)).toEqual(["Car Wash", "Fast Food", "Grocery Shopping"]);
    });

    it("should sort by date ascending (oldest first)", () => {
      const filters: FilterState = {
        ...defaultFilters,
        sortBy: "date-asc",
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current.map((i) => i.name)).toEqual(["Grocery Shopping", "Fast Food", "Car Wash"]);
    });

    it("should sort by amount descending (high to low)", () => {
      const filters: FilterState = {
        ...defaultFilters,
        sortBy: "amount-desc",
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current.map((i) => i.name)).toEqual(["Grocery Shopping", "Car Wash", "Fast Food"]);
    });

    it("should sort by amount ascending (low to high)", () => {
      const filters: FilterState = {
        ...defaultFilters,
        sortBy: "amount-asc",
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current.map((i) => i.name)).toEqual(["Fast Food", "Car Wash", "Grocery Shopping"]);
    });

    it("should sort by name ascending (A-Z)", () => {
      const filters: FilterState = {
        ...defaultFilters,
        sortBy: "name-asc",
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current.map((i) => i.name)).toEqual(["Car Wash", "Fast Food", "Grocery Shopping"]);
    });

    it("should sort by name descending (Z-A)", () => {
      const filters: FilterState = {
        ...defaultFilters,
        sortBy: "name-desc",
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current.map((i) => i.name)).toEqual(["Grocery Shopping", "Fast Food", "Car Wash"]);
    });
  });

  describe("Combined Filters", () => {
    it("should apply multiple filters simultaneously", () => {
      const filters: FilterState = {
        ...defaultFilters,
        searchQuery: "car",
        categories: [InvoiceCategory.CAR_AUTO],
        paymentTypes: [PaymentType.Card],
        amountMin: 50,
        amountMax: 100,
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.name).toBe("Car Wash");
    });

    it("should return empty array when no invoices match filters", () => {
      const filters: FilterState = {
        ...defaultFilters,
        searchQuery: "nonexistent",
      };

      const {result} = renderHook(() => useFilteredInvoices(mockInvoices, filters));

      expect(result.current).toHaveLength(0);
    });

    it("should handle empty invoice array", () => {
      const filters: FilterState = {
        ...defaultFilters,
      };

      const {result} = renderHook(() => useFilteredInvoices([], filters));

      expect(result.current).toHaveLength(0);
    });
  });
});
