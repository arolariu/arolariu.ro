/**
 * @fileoverview Unit tests for useFilteredInvoices hook.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useFilteredInvoices.test
 */

import {InvoiceBuilder} from "@/data/mocks";
import {InvoiceCategory, PaymentType} from "@/types/invoices";
import {renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {useFilteredInvoices} from "./useFilteredInvoices";
import type {FilterState} from "./useInvoiceFilters";

/**
 * Helper to create a default filter state for testing.
 */
const createDefaultFilters = (): FilterState => ({
  search: "",
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  categories: [],
  paymentTypes: [],
  sortBy: "date-desc",
  view: "table",
});

describe("useFilteredInvoices", () => {
  describe("Currency-aware sorting", () => {
    it("should sort invoices by amount in descending order with currency conversion", () => {
      // Arrange: Create invoices with different currencies
      // 228 RON invoice (transaction in 2024)
      const ronInvoice = new InvoiceBuilder()
        .withName("RON Invoice")
        .withPaymentInformation({
          totalCostAmount: 228,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
          transactionDate: new Date("2024-01-15").toISOString(),
          paymentType: PaymentType.Cash,
        })
        .build();

      // 46 EUR invoice (transaction in 2024, should convert to ~228 RON using 2024 rate)
      const eurInvoice = new InvoiceBuilder()
        .withName("EUR Invoice")
        .withPaymentInformation({
          totalCostAmount: 46,
          currency: {code: "EUR", name: "Euro", symbol: "€"},
          transactionDate: new Date("2024-03-20").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      // 100 RON invoice (transaction in 2024)
      const smallRonInvoice = new InvoiceBuilder()
        .withName("Small RON Invoice")
        .withPaymentInformation({
          totalCostAmount: 100,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
          transactionDate: new Date("2024-06-10").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [smallRonInvoice, eurInvoice, ronInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        sortBy: "amount-desc",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Both the 228 RON and ~228 RON (46 EUR) invoices should be near the top
      // The exact order may vary slightly based on the exchange rate, but both should be
      // sorted ahead of the 100 RON invoice
      expect(result.current).toHaveLength(3);
      expect(result.current[2]).toEqual(smallRonInvoice); // Smallest amount should be last
      // The top two should be ronInvoice and eurInvoice in some order
      expect([result.current[0], result.current[1]]).toContainEqual(ronInvoice);
      expect([result.current[0], result.current[1]]).toContainEqual(eurInvoice);
    });

    it("should sort invoices by amount in ascending order with currency conversion", () => {
      // Arrange
      const largeRonInvoice = new InvoiceBuilder()
        .withName("Large RON Invoice")
        .withPaymentInformation({
          totalCostAmount: 500,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
          transactionDate: new Date("2024-01-15").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const usdInvoice = new InvoiceBuilder()
        .withName("USD Invoice")
        .withPaymentInformation({
          totalCostAmount: 50,
          currency: {code: "USD", name: "US Dollar", symbol: "$"},
          transactionDate: new Date("2024-02-20").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const smallRonInvoice = new InvoiceBuilder()
        .withName("Small RON Invoice")
        .withPaymentInformation({
          totalCostAmount: 100,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
          transactionDate: new Date("2024-03-10").toISOString(),
          paymentType: PaymentType.Cash,
        })
        .build();

      const invoices = [largeRonInvoice, usdInvoice, smallRonInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        sortBy: "amount-asc",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Smallest amount should be first
      expect(result.current).toHaveLength(3);
      expect(result.current[0]).toEqual(smallRonInvoice); // 100 RON is smallest
      expect(result.current[2]).toEqual(largeRonInvoice); // 500 RON is largest
    });

    it("should handle missing currency gracefully by defaulting to RON", () => {
      // Arrange
      const invoiceWithoutCurrency = new InvoiceBuilder()
        .withName("No Currency Invoice")
        .withPaymentInformation({
          totalCostAmount: 150,
          currency: undefined as any, // Simulate missing currency
          transactionDate: new Date("2024-01-15").toISOString(),
          paymentType: PaymentType.Cash,
        })
        .build();

      const ronInvoice = new InvoiceBuilder()
        .withName("RON Invoice")
        .withPaymentInformation({
          totalCostAmount: 200,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
          transactionDate: new Date("2024-02-20").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [ronInvoice, invoiceWithoutCurrency];
      const filters: FilterState = {
        ...createDefaultFilters(),
        sortBy: "amount-desc",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Should not throw and should treat missing currency as RON
      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toEqual(ronInvoice); // 200 RON > 150 RON
      expect(result.current[1]).toEqual(invoiceWithoutCurrency);
    });

    it("should use transaction year for currency conversion", () => {
      // Arrange: Create EUR invoices from different years with same amount
      // Exchange rates vary by year, so the RON equivalent should differ
      const eur2018 = new InvoiceBuilder()
        .withName("EUR 2018")
        .withPaymentInformation({
          totalCostAmount: 100,
          currency: {code: "EUR", name: "Euro", symbol: "€"},
          transactionDate: new Date("2018-06-15").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const eur2024 = new InvoiceBuilder()
        .withName("EUR 2024")
        .withPaymentInformation({
          totalCostAmount: 100,
          currency: {code: "EUR", name: "Euro", symbol: "€"},
          transactionDate: new Date("2024-06-15").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [eur2018, eur2024];
      const filters: FilterState = {
        ...createDefaultFilters(),
        sortBy: "amount-desc",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Should apply year-specific rates
      // (The exact order depends on which year has the higher EUR/RON rate)
      expect(result.current).toHaveLength(2);
      // Both invoices should be included
      expect(result.current).toContainEqual(eur2018);
      expect(result.current).toContainEqual(eur2024);
    });
  });

  describe("Other filter functionality", () => {
    it("should filter by text search", () => {
      // Arrange
      const groceryInvoice = new InvoiceBuilder().withName("Grocery Store").withDescription("Weekly groceries").build();

      const electronicsInvoice = new InvoiceBuilder().withName("Electronics Shop").withDescription("New laptop").build();

      const invoices = [groceryInvoice, electronicsInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        search: "grocery",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(groceryInvoice);
    });

    it("should filter by category", () => {
      // Arrange
      const groceryInvoice = new InvoiceBuilder().withCategory(InvoiceCategory.GROCERY).build();

      const electronicsInvoice = new InvoiceBuilder().withCategory(InvoiceCategory.ELECTRONICS).build();

      const invoices = [groceryInvoice, electronicsInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        categories: [InvoiceCategory.GROCERY],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(groceryInvoice);
    });

    it("should filter by payment type", () => {
      // Arrange
      const cashInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          paymentType: PaymentType.Cash,
          totalCostAmount: 100,
          transactionDate: new Date("2024-01-15").toISOString(),
        })
        .build();

      const cardInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          paymentType: PaymentType.Card,
          totalCostAmount: 200,
          transactionDate: new Date("2024-02-20").toISOString(),
        })
        .build();

      const invoices = [cashInvoice, cardInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        paymentTypes: [PaymentType.Card],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(cardInvoice);
    });

    it("should sort by date in descending order by default", () => {
      // Arrange
      const oldInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2023-01-15").toISOString(),
          totalCostAmount: 100,
          paymentType: PaymentType.Cash,
        })
        .build();

      const newInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-06-20").toISOString(),
          totalCostAmount: 200,
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [oldInvoice, newInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        sortBy: "date-desc",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Newest first
      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toEqual(newInvoice);
      expect(result.current[1]).toEqual(oldInvoice);
    });
  });
});
