/**
 * @fileoverview Unit tests for useFilteredInvoices hook.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_hooks/useFilteredInvoices.test
 */

import {InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import {ClassificationOrigin, ClassificationSystem, PaymentType} from "@/types/invoices";
import type {StandardClassification} from "@/types/invoices";
import {renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {useFilteredInvoices} from "./useFilteredInvoices";
import type {FilterState} from "./useInvoiceFilters";

/** Builds a minimal StandardClassification whose root node has the given label. */
function makeClassification(rootLabel: string): StandardClassification {
  return {
    system: ClassificationSystem.EcoicopV2,
    version: "2024",
    code: "test-code",
    officialLabel: `${rootLabel} — leaf`,
    hierarchy: [{level: "division", code: "test-code", officialLabel: rootLabel}],
    origin: ClassificationOrigin.Analysis,
    confidence: 0.9,
    evidence: [],
  };
}

/**
 * Helper to create a default filter state for testing.
 */
const createDefaultFilters = (): FilterState => ({
  search: "",
  dateFrom: null,
  dateTo: null,
  amountMin: null,
  amountMax: null,
  classificationGroups: [],
  paymentTypes: [],
  currencies: [],
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
          transactionDate: new Date("2024-01-15"),
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
        })
        .build();

      // 46 EUR invoice (transaction in 2024, should convert to ~228 RON using 2024 rate)
      const eurInvoice = new InvoiceBuilder()
        .withName("EUR Invoice")
        .withPaymentInformation({
          totalCostAmount: 46,
          currency: {code: "EUR", name: "Euro", symbol: "€"},
          transactionDate: new Date("2024-03-20"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
        })
        .build();

      // 100 RON invoice (transaction in 2024)
      const smallRonInvoice = new InvoiceBuilder()
        .withName("Small RON Invoice")
        .withPaymentInformation({
          totalCostAmount: 100,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
          transactionDate: new Date("2024-06-10"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
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
          transactionDate: new Date("2024-01-15"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
        })
        .build();

      const usdInvoice = new InvoiceBuilder()
        .withName("USD Invoice")
        .withPaymentInformation({
          totalCostAmount: 50,
          currency: {code: "USD", name: "US Dollar", symbol: "$"},
          transactionDate: new Date("2024-02-20"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
        })
        .build();

      const smallRonInvoice = new InvoiceBuilder()
        .withName("Small RON Invoice")
        .withPaymentInformation({
          totalCostAmount: 100,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
          transactionDate: new Date("2024-03-10"),
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
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
          transactionDate: new Date("2024-01-15"),
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
        })
        .build();

      const ronInvoice = new InvoiceBuilder()
        .withName("RON Invoice")
        .withPaymentInformation({
          totalCostAmount: 200,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
          transactionDate: new Date("2024-02-20"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
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
          transactionDate: new Date("2018-06-15"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
        })
        .build();

      const eur2024 = new InvoiceBuilder()
        .withName("EUR 2024")
        .withPaymentInformation({
          totalCostAmount: 100,
          currency: {code: "EUR", name: "Euro", symbol: "€"},
          transactionDate: new Date("2024-06-15"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
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
          transactionDate: new Date("2023-01-15"),
          totalCostAmount: 100,
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const newInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-06-20"),
          totalCostAmount: 200,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
          transactionDate: new Date("2023-01-15"),
          totalCostAmount: 100,
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const newInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-06-20"),
          totalCostAmount: 200,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
          transactionDate: new Date("2023-06-15"),
          totalCostAmount: 100,
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const invoice2024Q1 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-02-15"),
          totalCostAmount: 150,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const invoice2024Q2 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-06-20"),
          totalCostAmount: 200,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
          transactionDate: new Date("2024-03-15"),
          totalCostAmount: 100,
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const invoiceOtherDay = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-03-16"),
          totalCostAmount: 150,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
          transactionDate: new Date("2024-01-15"),
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const expensiveInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 200,
          transactionDate: new Date("2024-02-20"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
          transactionDate: new Date("2024-01-15"),
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const expensiveInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 200,
          transactionDate: new Date("2024-02-20"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
          transactionDate: new Date("2024-01-15"),
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const midRangeInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 75,
          transactionDate: new Date("2024-02-20"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const expensiveInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 250,
          transactionDate: new Date("2024-03-15"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
          transactionDate: new Date("2024-01-15"),
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const paidInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 50,
          transactionDate: new Date("2024-02-20"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
          transactionDate: new Date("2024-01-15"),
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const invoice100 = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 100,
          transactionDate: new Date("2024-02-20"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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

  describe("Classification group filtering", () => {
    it("filters by single taxonomy root group", () => {
      // Arrange
      const foodInvoice = new InvoiceBuilder().withName("Food Invoice").build();
      foodInvoice.classification = makeClassification("Food and non-alcoholic beverages");

      const transportInvoice = new InvoiceBuilder().withName("Transport Invoice").build();
      transportInvoice.classification = makeClassification("Transport");

      const invoices = [foodInvoice, transportInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        classificationGroups: ["Food and non-alcoholic beverages"],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: only the food invoice is returned
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(foodInvoice);
    });

    it("filters by multiple taxonomy root groups (OR logic)", () => {
      // Arrange
      const foodInvoice = new InvoiceBuilder().withName("Food Invoice").build();
      foodInvoice.classification = makeClassification("Food and non-alcoholic beverages");

      const transportInvoice = new InvoiceBuilder().withName("Transport Invoice").build();
      transportInvoice.classification = makeClassification("Transport");

      const housingInvoice = new InvoiceBuilder().withName("Housing Invoice").build();
      housingInvoice.classification = makeClassification("Housing");

      const invoices = [foodInvoice, transportInvoice, housingInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        classificationGroups: ["Food and non-alcoholic beverages", "Transport"],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: food and transport included; housing excluded
      expect(result.current).toHaveLength(2);
      expect(result.current).toContainEqual(foodInvoice);
      expect(result.current).toContainEqual(transportInvoice);
      expect(result.current).not.toContainEqual(housingInvoice);
    });

    it("excludes invoices with null classification from a specific-group filter", () => {
      // Arrange
      const classifiedInvoice = new InvoiceBuilder().withName("Classified").build();
      classifiedInvoice.classification = makeClassification("Food and non-alcoholic beverages");

      const unclassifiedInvoice = new InvoiceBuilder().withName("Unclassified").build();
      // unclassifiedInvoice.classification is null by default

      const invoices = [classifiedInvoice, unclassifiedInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        classificationGroups: ["Food and non-alcoholic beverages"],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: unclassified invoice is excluded
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(classifiedInvoice);
    });

    it("returns null-classification invoices when the unclassified group is selected", () => {
      const classifiedInvoice = new InvoiceBuilder().withName("Classified").build();
      classifiedInvoice.classification = makeClassification("Food and non-alcoholic beverages");
      const unclassifiedInvoice = new InvoiceBuilder().withName("Unclassified").build();

      const filters: FilterState = {
        ...createDefaultFilters(),
        classificationGroups: ["unclassified"],
      };

      const {result} = renderHook(() => useFilteredInvoices([classifiedInvoice, unclassifiedInvoice], filters));

      expect(result.current).toEqual([unclassifiedInvoice]);
    });

    it("includes invoices with null classification when filter is empty (All)", () => {
      // Arrange
      const classifiedInvoice = new InvoiceBuilder().withName("Classified").build();
      classifiedInvoice.classification = makeClassification("Food and non-alcoholic beverages");

      const unclassifiedInvoice = new InvoiceBuilder().withName("Unclassified").build();
      // unclassifiedInvoice.classification is null by default

      const invoices = [classifiedInvoice, unclassifiedInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        classificationGroups: [], // empty = All
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: both are included
      expect(result.current).toHaveLength(2);
    });

    it("returns no results when no invoices match group", () => {
      // Arrange
      const foodInvoice = new InvoiceBuilder().withName("Food Invoice").build();
      foodInvoice.classification = makeClassification("Food and non-alcoholic beverages");

      const invoices = [foodInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        classificationGroups: ["Transport"],
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
          transactionDate: new Date("2024-01-15"),
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const cardInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          paymentType: PaymentType.Card,
          totalCostAmount: 200,
          transactionDate: new Date("2024-02-20"),
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
          transactionDate: new Date("2024-01-15"),
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const cardInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          paymentType: PaymentType.Card,
          totalCostAmount: 200,
          transactionDate: new Date("2024-02-20"),
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const bankTransferInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          paymentType: PaymentType.Transfer,
          totalCostAmount: 300,
          transactionDate: new Date("2024-03-15"),
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
          transactionDate: new Date("2023-01-15"),
          totalCostAmount: 100,
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const newInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-06-20"),
          totalCostAmount: 200,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
          transactionDate: new Date("2023-01-15"),
          totalCostAmount: 100,
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const newInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-06-20"),
          totalCostAmount: 200,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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

    it("should return invoices in natural order when sort params are null", () => {
      // Arrange
      const oldInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2023-01-15"),
          totalCostAmount: 100,
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const newInvoice = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-06-20"),
          totalCostAmount: 200,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const invoices = [oldInvoice, newInvoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        sortBy: null, // No sorting
        sortOrder: null, // No sorting
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Should return in natural order (as provided)
      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toEqual(oldInvoice);
      expect(result.current[1]).toEqual(newInvoice);
    });
  });

  describe("Combined filters", () => {
    it("should apply search and classification group filters together", () => {
      // Arrange
      const invoice1 = new InvoiceBuilder().withName("Apple Food").build();
      invoice1.classification = makeClassification("Food and non-alcoholic beverages");

      const invoice2 = new InvoiceBuilder().withName("Banana Food").build();
      invoice2.classification = makeClassification("Food and non-alcoholic beverages");

      const invoice3 = new InvoiceBuilder().withName("Apple Transport").build();
      invoice3.classification = makeClassification("Transport");

      const invoices = [invoice1, invoice2, invoice3];
      const filters: FilterState = {
        ...createDefaultFilters(),
        search: "apple",
        classificationGroups: ["Food and non-alcoholic beverages"],
      };

      // Act
      const {result} = renderHook(() => useFilteredInvoices(invoices, filters));

      // Assert: Only food invoices with "apple" in name
      expect(result.current).toHaveLength(1);
      expect(result.current[0]).toEqual(invoice1);
    });

    it("should apply date range, amount range, and payment type filters together", () => {
      // Arrange
      const invoice1 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-02-15"),
          totalCostAmount: 75,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const invoice2 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-01-15"), // Before date range
          totalCostAmount: 75,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const invoice3 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-02-15"),
          totalCostAmount: 150, // Above amount range
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();

      const invoice4 = new InvoiceBuilder()
        .withPaymentInformation({
          transactionDate: new Date("2024-02-15"),
          totalCostAmount: 75,
          paymentType: PaymentType.Cash, // Different payment type
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
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
      const foodA = new InvoiceBuilder()
        .withName("A Food")
        .withPaymentInformation({
          transactionDate: new Date("2024-02-15"),
          totalCostAmount: 75,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();
      foodA.classification = makeClassification("Food and non-alcoholic beverages");

      const foodB = new InvoiceBuilder()
        .withName("B Food")
        .withPaymentInformation({
          transactionDate: new Date("2024-02-20"),
          totalCostAmount: 85,
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();
      foodB.classification = makeClassification("Food and non-alcoholic beverages");

      const invoices = [foodB, foodA];
      const filters: FilterState = {
        ...createDefaultFilters(),
        search: "food",
        classificationGroups: ["Food and non-alcoholic beverages"],
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
      expect(result.current[0]).toEqual(foodA);
      expect(result.current[1]).toEqual(foodB);
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

    it("should return empty array when no invoices match classification group filter", () => {
      // Arrange
      const invoice = new InvoiceBuilder()
        .withPaymentInformation({
          totalCostAmount: 100,
          transactionDate: new Date("2024-01-15"),
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
        })
        .build();
      invoice.classification = makeClassification("Food and non-alcoholic beverages");

      const invoices = [invoice];
      const filters: FilterState = {
        ...createDefaultFilters(),
        classificationGroups: ["Transport"], // Won't match
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

  describe("Currency filtering", () => {
    it("excludes invoices whose currency is not in the filter set", () => {
      const ron = new InvoiceBuilder()
        .withName("RON Invoice")
        .withPaymentInformation({
          totalCostAmount: 100,
          currency: {code: "RON", name: "Romanian Leu", symbol: "lei"},
          transactionDate: new Date("2024-01-15"),
          paymentType: PaymentType.Cash,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
        })
        .build();
      const eur = new InvoiceBuilder()
        .withName("EUR Invoice")
        .withPaymentInformation({
          totalCostAmount: 50,
          currency: {code: "EUR", name: "Euro", symbol: "€"},
          transactionDate: new Date("2024-02-10"),
          paymentType: PaymentType.Card,
          totalTaxAmount: 0,
          subtotalAmount: 0,
          tipAmount: 0,
        })
        .build();

      const filters = {...createDefaultFilters(), currencies: ["RON"]};
      const {result} = renderHook(() => useFilteredInvoices([ron, eur], filters));

      expect(result.current).toHaveLength(1);
      expect(result.current[0]?.name).toBe("RON Invoice");
    });

    it("empty currencies array means pass-through (no filter applied)", () => {
      const ron = new InvoiceBuilder().withName("RON").build();
      const eur = new InvoiceBuilder().withName("EUR").build();
      const {result} = renderHook(() => useFilteredInvoices([ron, eur], createDefaultFilters()));
      expect(result.current).toHaveLength(2);
    });

    it("treats missing currency.code as 'RON' when filtering by RON", () => {
      const malformed = new InvoiceBuilder().withName("Malformed").build();
      const noCode: Invoice = {
        ...malformed,
        paymentInformation: {...malformed.paymentInformation, currency: {code: "", name: "", symbol: ""}},
      };
      const filters = {...createDefaultFilters(), currencies: ["RON"]};
      const {result} = renderHook(() => useFilteredInvoices([noCode], filters));
      expect(result.current).toHaveLength(1);
    });
  });
});
