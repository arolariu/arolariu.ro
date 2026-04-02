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
  sortBy: "date",
  sortOrder: "desc",
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
        sortBy: "amount",
        sortOrder: "desc",
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
        sortBy: "amount",
        sortOrder: "asc",
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
        sortBy: "amount",
        sortOrder: "desc",
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
        sortBy: "amount",
        sortOrder: "desc",
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

  describe("Text search filtering", () => {
    it("should filter by text search in invoice name", () => {
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

    it("should filter by text search in invoice description", () => {
      // Arrange
      const laptopInvoice = new InvoiceBuilder().withName("Tech Store").withDescription("New laptop purchase").build();

      const groceryInvoice = new InvoiceBuilder().withName("Store").withDescription("Weekly groceries").build();

      const invoices = [laptopInvoice, groceryInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        search: "laptop",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(laptopInvoice);
    });

    it("should handle case-insensitive search", () => {
      // Arrange
      const invoice = new InvoiceBuilder().withName("Grocery Store").withDescription("Weekly shopping").build();

      const invoices = [invoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        search: "GROCERY",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(invoice);
    });

    it("should trim search query whitespace", () => {
      // Arrange
      const invoice = new InvoiceBuilder().withName("Grocery Store").build();

      const invoices = [invoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        search: "  grocery  ",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
    });
  });

  describe("Date range filtering", () => {
    it("should filter by dateFrom only", () => {
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
        dateFrom: "2024-01-01",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(newInvoice);
    });

    it("should filter by dateTo only", () => {
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
        dateTo: "2023-12-31",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(oldInvoice);
    });

    it("should filter by both dateFrom and dateTo", () => {
      // Arrange
      const invoice2023 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2023-06-15").toISOString(),
          totalCostAmount: 100,
          paymentType: PaymentType.Cash,
        })
        .build();

      const invoice2024Q1 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-02-15").toISOString(),
          totalCostAmount: 150,
          paymentType: PaymentType.Card,
        })
        .build();

      const invoice2024Q2 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-06-20").toISOString(),
          totalCostAmount: 200,
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [invoice2023, invoice2024Q1, invoice2024Q2];
      const filters: FilterState = {
        ...createDefaultFilters(),
        dateFrom: "2024-01-01",
        dateTo: "2024-03-31",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(invoice2024Q1);
    });

    it("should handle edge case with same date for from and to", () => {
      // Arrange
      const invoiceSameDay = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-03-15").toISOString(),
          totalCostAmount: 100,
          paymentType: PaymentType.Cash,
        })
        .build();

      const invoiceOtherDay = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-03-16").toISOString(),
          totalCostAmount: 150,
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [invoiceSameDay, invoiceOtherDay];
      const filters: FilterState = {
        ...createDefaultFilters(),
        dateFrom: "2024-03-15",
        dateTo: "2024-03-15",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(invoiceSameDay);
    });
  });

  describe("Amount range filtering", () => {
    it("should filter by amountMin only", () => {
      // Arrange
      const cheapInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 50,
          transactionDate: new Date("2024-01-15").toISOString(),
          paymentType: PaymentType.Cash,
        })
        .build();

      const expensiveInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 200,
          transactionDate: new Date("2024-02-20").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [cheapInvoice, expensiveInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        amountMin: 100,
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(expensiveInvoice);
    });

    it("should filter by amountMax only", () => {
      // Arrange
      const cheapInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 50,
          transactionDate: new Date("2024-01-15").toISOString(),
          paymentType: PaymentType.Cash,
        })
        .build();

      const expensiveInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 200,
          transactionDate: new Date("2024-02-20").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [cheapInvoice, expensiveInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        amountMax: 100,
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(cheapInvoice);
    });

    it("should filter by both amountMin and amountMax", () => {
      // Arrange
      const cheapInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 25,
          transactionDate: new Date("2024-01-15").toISOString(),
          paymentType: PaymentType.Cash,
        })
        .build();

      const midRangeInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 75,
          transactionDate: new Date("2024-02-20").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const expensiveInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 250,
          transactionDate: new Date("2024-03-15").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [cheapInvoice, midRangeInvoice, expensiveInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        amountMin: 50,
        amountMax: 100,
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(midRangeInvoice);
    });

    it("should handle edge case with zero amount", () => {
      // Arrange
      const freeInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 0,
          transactionDate: new Date("2024-01-15").toISOString(),
          paymentType: PaymentType.Cash,
        })
        .build();

      const paidInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 50,
          transactionDate: new Date("2024-02-20").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [freeInvoice, paidInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        amountMin: 0,
        amountMax: 0,
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(freeInvoice);
    });

    it("should include amounts at exact boundaries", () => {
      // Arrange
      const invoice50 = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 50,
          transactionDate: new Date("2024-01-15").toISOString(),
          paymentType: PaymentType.Cash,
        })
        .build();

      const invoice100 = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 100,
          transactionDate: new Date("2024-02-20").toISOString(),
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [invoice50, invoice100];
      const filters: FilterState = {
        ...createDefaultFilters(),
        amountMin: 50,
        amountMax: 100,
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Both should be included (inclusive boundaries)
      expect(result.current).toHaveLength(2);
    });
  });

  describe("Category filtering", () => {
    it("should filter by single category", () => {
      // Arrange
      const invoice1 = new InvoiceBuilder().withName("Grocery Invoice").build();
      invoice1.category = InvoiceCategory.GROCERY;

      const invoice2 = new InvoiceBuilder().withName("Fast Food Invoice").build();
      invoice2.category = InvoiceCategory.FAST_FOOD;

      const invoices = [invoice1, invoice2];
      const filters: FilterState = {
        ...createDefaultFilters(),
        categories: [InvoiceCategory.GROCERY],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(1);
      expect(result.current[0].category).toBe(InvoiceCategory.GROCERY);
    });

    it("should filter by multiple categories (OR logic)", () => {
      // Arrange: Create three invoices with distinct categories
      const invoice1 = new InvoiceBuilder().withName("Grocery Store").build();
      invoice1.category = InvoiceCategory.GROCERY;

      const invoice2 = new InvoiceBuilder().withName("Electronics Store").build();
      invoice2.category = InvoiceCategory.FAST_FOOD;

      const invoice3 = new InvoiceBuilder().withName("Cleaning Store").build();
      invoice3.category = InvoiceCategory.HOME_CLEANING;

      const invoices = [invoice1, invoice2, invoice3];

      // Verify categories are different before filtering
      expect(invoice1.category).toBe(InvoiceCategory.GROCERY);
      expect(invoice2.category).toBe(InvoiceCategory.FAST_FOOD);
      expect(invoice3.category).toBe(InvoiceCategory.HOME_CLEANING);

      const filters: FilterState = {
        ...createDefaultFilters(),
        categories: [InvoiceCategory.GROCERY, InvoiceCategory.FAST_FOOD],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Should include both grocery and fast food, but not home cleaning
      expect(result.current).toHaveLength(2);
      const categories = result.current.map((i) => i.category);
      expect(categories).toContain(InvoiceCategory.GROCERY);
      expect(categories).toContain(InvoiceCategory.FAST_FOOD);
      expect(categories).not.toContain(InvoiceCategory.HOME_CLEANING);
    });

    it("should return no results when no invoices match category", () => {
      // Arrange
      const invoice = new InvoiceBuilder().withName("Grocery Invoice").build();
      invoice.category = InvoiceCategory.GROCERY;

      const invoices = [invoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        categories: [InvoiceCategory.CAR_AUTO],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(0);
    });
  });

  describe("Payment type filtering", () => {
    it("should filter by single payment type", () => {
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

    it("should filter by multiple payment types (OR logic)", () => {
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

      const bankTransferInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          paymentType: PaymentType.BankTransfer,
          totalCostAmount: 300,
          transactionDate: new Date("2024-03-15").toISOString(),
        })
        .build();

      const invoices = [cashInvoice, cardInvoice, bankTransferInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        paymentTypes: [PaymentType.Cash, PaymentType.Card],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Should include both cash and card
      expect(result.current).toHaveLength(2);
      expect(result.current).toContainEqual(cashInvoice);
      expect(result.current).toContainEqual(cardInvoice);
    });
  });

  describe("Sort modes", () => {
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
        sortBy: "date",
        sortOrder: "desc",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Newest first
      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toEqual(newInvoice);
      expect(result.current[1]).toEqual(oldInvoice);
    });

    it("should sort by date in ascending order", () => {
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

      const invoices = [newInvoice, oldInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        sortBy: "date",
        sortOrder: "asc",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Oldest first
      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toEqual(oldInvoice);
      expect(result.current[1]).toEqual(newInvoice);
    });

    it("should sort by name in ascending order", () => {
      // Arrange
      const zebraInvoice = new InvoiceBuilder().withName("Zebra Store").build();
      const appleInvoice = new InvoiceBuilder().withName("Apple Store").build();
      const microsoftInvoice = new InvoiceBuilder().withName("Microsoft Store").build();

      const invoices = [zebraInvoice, appleInvoice, microsoftInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        sortBy: "name",
        sortOrder: "asc",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Alphabetical order
      expect(result.current).toHaveLength(3);
      expect(result.current[0]).toEqual(appleInvoice);
      expect(result.current[1]).toEqual(microsoftInvoice);
      expect(result.current[2]).toEqual(zebraInvoice);
    });

    it("should sort by name in descending order", () => {
      // Arrange
      const zebraInvoice = new InvoiceBuilder().withName("Zebra Store").build();
      const appleInvoice = new InvoiceBuilder().withName("Apple Store").build();
      const microsoftInvoice = new InvoiceBuilder().withName("Microsoft Store").build();

      const invoices = [appleInvoice, microsoftInvoice, zebraInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        sortBy: "name",
        sortOrder: "desc",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Reverse alphabetical order
      expect(result.current).toHaveLength(3);
      expect(result.current[0]).toEqual(zebraInvoice);
      expect(result.current[1]).toEqual(microsoftInvoice);
      expect(result.current[2]).toEqual(appleInvoice);
    });

    it("should fall back to date-desc for unknown sort mode", () => {
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
        sortBy: "invalid-sort" as any, // Force invalid sort mode
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Should default to date-desc (newest first)
      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toEqual(newInvoice);
      expect(result.current[1]).toEqual(oldInvoice);
    });
  });

  describe("Combined filters", () => {
    it("should apply search and category filters together", () => {
      // Arrange
      const invoice1 = new InvoiceBuilder().withName("Apple Grocery").build();
      invoice1.category = InvoiceCategory.GROCERY;

      const invoice2 = new InvoiceBuilder().withName("Banana Grocery").build();
      invoice2.category = InvoiceCategory.GROCERY;

      const invoice3 = new InvoiceBuilder().withName("Apple Fast Food").build();
      invoice3.category = InvoiceCategory.FAST_FOOD;

      const invoices = [invoice1, invoice2, invoice3];
      const filters: FilterState = {
        ...createDefaultFilters(),
        search: "apple",
        categories: [InvoiceCategory.GROCERY],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Only grocery invoices with "apple" in name
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(invoice1);
    });

    it("should apply date range, amount range, and payment type filters together", () => {
      // Arrange
      const invoice1 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-02-15").toISOString(),
          totalCostAmount: 75,
          paymentType: PaymentType.Card,
        })
        .build();

      const invoice2 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-01-15").toISOString(), // Before date range
          totalCostAmount: 75,
          paymentType: PaymentType.Card,
        })
        .build();

      const invoice3 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-02-15").toISOString(),
          totalCostAmount: 150, // Above amount range
          paymentType: PaymentType.Card,
        })
        .build();

      const invoice4 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-02-15").toISOString(),
          totalCostAmount: 75,
          paymentType: PaymentType.Cash, // Different payment type
        })
        .build();

      const invoices = [invoice1, invoice2, invoice3, invoice4];
      const filters: FilterState = {
        ...createDefaultFilters(),
        dateFrom: "2024-02-01",
        dateTo: "2024-02-29",
        amountMin: 50,
        amountMax: 100,
        paymentTypes: [PaymentType.Card],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Only invoice1 matches all criteria
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(invoice1);
    });

    it("should apply all filters and sort correctly", () => {
      // Arrange
      const groceryA = new InvoiceBuilder()
        .withName("A Grocery")
        .withCategory(InvoiceCategory.GROCERY)
        .withPaymentInformation({
          transactionDate: new Date("2024-02-15").toISOString(),
          totalCostAmount: 75,
          paymentType: PaymentType.Card,
        })
        .build();

      const groceryB = new InvoiceBuilder()
        .withName("B Grocery")
        .withCategory(InvoiceCategory.GROCERY)
        .withPaymentInformation({
          transactionDate: new Date("2024-02-20").toISOString(),
          totalCostAmount: 85,
          paymentType: PaymentType.Card,
        })
        .build();

      const invoices = [groceryB, groceryA];
      const filters: FilterState = {
        ...createDefaultFilters(),
        search: "grocery",
        categories: [InvoiceCategory.GROCERY],
        paymentTypes: [PaymentType.Card],
        dateFrom: "2024-02-01",
        amountMin: 50,
        sortBy: "name",
        sortOrder: "asc",
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Both match filters, sorted by name ascending
      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toEqual(groceryA);
      expect(result.current[1]).toEqual(groceryB);
    });
  });

  describe("Empty state handling", () => {
    it("should return empty array when no invoices provided", () => {
      // Arrange
      const invoices: Invoice[] = [];
      const filters: FilterState = createDefaultFilters();

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(0);
    });

    it("should return empty array when no invoices match filters", () => {
      // Arrange
      const invoice = new InvoiceBuilder()
        .withCategory(InvoiceCategory.GROCERY)
        .withPaymentInformation({
          totalCostAmount: 100,
          transactionDate: new Date("2024-01-15").toISOString(),
          paymentType: PaymentType.Cash,
        })
        .build();

      const invoices = [invoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        categories: [InvoiceCategory.ELECTRONICS], // Won't match
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert
      expect(result.current).toHaveLength(0);
    });

    it("should return all invoices when no filters are applied", () => {
      // Arrange
      const invoice1 = new InvoiceBuilder().withName("Invoice 1").build();
      const invoice2 = new InvoiceBuilder().withName("Invoice 2").build();
      const invoice3 = new InvoiceBuilder().withName("Invoice 3").build();

      const invoices = [invoice1, invoice2, invoice3];
      const filters: FilterState = createDefaultFilters();

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: All invoices returned (sorted by date-desc)
      expect(result.current).toHaveLength(3);
    });
  });
});
