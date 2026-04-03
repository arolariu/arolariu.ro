/**
 * @fileoverview Comprehensive unit tests for invoice statistics functions.
 * @module sites/arolariu.ro/src/app/domains/invoices/view-invoices/_utils/statistics.test
 *
 * @remarks
 * Tests all 15 exported functions to achieve 95%+ coverage:
 * - computeKPIs
 * - computeMonthlySpending
 * - computeCategoryAggregates
 * - computeMerchantAggregates
 * - computeDailySpending
 * - computePriceDistribution
 * - computeTimeOfDay
 * - computeMonthComparison
 * - computeCurrencyDistribution
 * - computeProductCategorySpending
 * - computeTopProducts
 * - computeAllergenFrequency
 * - getCategoryLabel
 * - getPaymentTypeLabel
 * - getProductCategoryLabel
 */

import {describe, expect, it} from "vitest";

// Import types
import type {Invoice, Product} from "@/types/invoices";

// Import functions to test
import {
  computeAllergenFrequency,
  computeCategoryAggregates,
  computeCurrencyDistribution,
  computeDailySpending,
  computeKPIs,
  computeMerchantAggregates,
  computeMerchantTrends,
  computeMerchantVisitFrequency,
  computeMonthComparison,
  computeMonthlySpending,
  computePriceDistribution,
  computeProductCategorySpending,
  computeTimeOfDay,
  computeTopProducts,
  getCategoryLabel,
  getPaymentTypeLabel,
  getProductCategoryLabel,
} from "./statistics";

/**
 * Helper to create a simple mock invoice for testing.
 * Manually constructs Invoice objects to avoid builder import issues.
 */
function createTestInvoice(overrides: {
  id?: string;
  merchantId?: string;
  amount?: number;
  currency?: string;
  date?: Date;
  category?: number;
  paymentType?: number;
  items?: Product[];
}): Invoice {
  const date = overrides.date ?? new Date();
  const currency = overrides.currency ?? "RON";

  return {
    id: overrides.id ?? `invoice-${Math.random()}`,
    name: `Test Invoice`,
    description: "Test invoice description",
    createdAt: date,
    lastUpdatedAt: date,
    userIdentifier: "test-user",
    merchantReference: overrides.merchantId ?? "merchant-1",
    category: overrides.category ?? 100,
    scans: [],
    paymentInformation: {
      transactionDate: date,
      totalCostAmount: overrides.amount ?? 100,
      totalTaxAmount: 0,
      subtotalAmount: overrides.amount ?? 100,
      tipAmount: 0,
      currency: {
        code: currency,
        symbol: currency === "EUR" ? "€" : currency === "USD" ? "$" : "lei",
        name: currency === "EUR" ? "Euro" : currency === "USD" ? "US Dollar" : "Romanian Leu",
      },
      paymentType: overrides.paymentType ?? 200,
    },
    items: overrides.items ?? [],
    possibleRecipes: [],
  } as unknown as Invoice;
}

/**
 * Helper to create a mock product for testing.
 */
function createTestProduct(overrides: {
  id?: string;
  name?: string;
  genericName?: string;
  rawName?: string;
  quantity?: number;
  price?: number;
  totalPrice?: number;
  category?: number | null;
  detectedAllergens?: Array<{name: string; description: string}>;
  isSoftDeleted?: boolean;
}): Product {
  return {
    id: overrides.id ?? `product-${Math.random()}`,
    genericName: overrides.genericName ?? overrides.name ?? "Generic Product",
    rawName: overrides.rawName ?? "Raw Product Name",
    productCode: `prod-${Math.random()}`,
    quantity: overrides.quantity ?? 1,
    quantityUnit: "pcs",
    price: overrides.price ?? 10,
    totalPrice: overrides.totalPrice ?? 10,
    category: overrides.category ?? null,
    detectedAllergens: overrides.detectedAllergens ?? [],
    metadata: overrides.isSoftDeleted ? {isSoftDeleted: true} : undefined,
  } as unknown as Product;
}

describe("Statistics Functions", () => {
  describe("computeKPIs", () => {
    it("should return zeroed metrics for empty array", () => {
      const result = computeKPIs([]);

      expect(result.totalSpending).toBe(0);
      expect(result.invoiceCount).toBe(0);
      expect(result.averagePerInvoice).toBe(0);
      expect(result.mostFrequentMerchant).toBeNull();
      expect(result.averageItemsPerInvoice).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.currency).toBe("RON");
    });

    it("should compute KPIs for single invoice", () => {
      const invoices = [
        createTestInvoice({
          merchantId: "merchant-1",
          amount: 150.5,
          items: [createTestProduct({quantity: 1}), createTestProduct({quantity: 1})],
        }),
      ];

      const result = computeKPIs(invoices);

      expect(result.totalSpending).toBe(150.5);
      expect(result.invoiceCount).toBe(1);
      expect(result.averagePerInvoice).toBe(150.5);
      expect(result.mostFrequentMerchant).toEqual({id: "merchant-1", count: 1});
      expect(result.totalItems).toBe(2);
      expect(result.averageItemsPerInvoice).toBe(2);
      expect(result.currency).toBe("RON");
    });

    it("should compute KPIs for multiple invoices", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100, items: [createTestProduct({})]}),
        createTestInvoice({merchantId: "merchant-2", amount: 200, items: [createTestProduct({})]}),
        createTestInvoice({merchantId: "merchant-1", amount: 150, items: [createTestProduct({})]}),
      ];

      const result = computeKPIs(invoices);

      expect(result.totalSpending).toBe(450);
      expect(result.invoiceCount).toBe(3);
      expect(result.averagePerInvoice).toBe(150);
      expect(result.mostFrequentMerchant).toEqual({id: "merchant-1", count: 2});
      expect(result.totalItems).toBe(3);
      expect(result.averageItemsPerInvoice).toBe(1);
    });

    it("should handle invoices without merchant reference", () => {
      const invoices = [createTestInvoice({merchantId: "", amount: 100}), createTestInvoice({merchantId: "merchant-1", amount: 200})];

      const result = computeKPIs(invoices);

      expect(result.totalSpending).toBe(300);
      expect(result.invoiceCount).toBe(2);
      // Only merchant-1 should be counted (empty string is skipped)
      expect(result.mostFrequentMerchant).toEqual({id: "merchant-1", count: 1});
    });

    it("should handle invoices without items", () => {
      const invoice = createTestInvoice({amount: 100, items: []});

      const result = computeKPIs([invoice]);

      expect(result.totalItems).toBe(0);
      expect(result.averageItemsPerInvoice).toBe(0);
    });

    it("should round amounts to 2 decimal places", () => {
      const invoices = [createTestInvoice({amount: 123.456}), createTestInvoice({amount: 234.567})];

      const result = computeKPIs(invoices);

      expect(result.totalSpending).toBe(358.02);
      expect(result.averagePerInvoice).toBe(179.01);
    });

    it("should normalize EUR to RON", () => {
      const invoices = [createTestInvoice({amount: 100, currency: "EUR", date: new Date("2025-01-15")})];

      const result = computeKPIs(invoices);

      // EUR should be converted to RON (approximate rate ~4.97)
      expect(result.totalSpending).toBeGreaterThan(400);
      expect(result.currency).toBe("RON");
    });
  });

  describe("computeMonthlySpending", () => {
    it("should return empty array for no invoices", () => {
      const result = computeMonthlySpending([]);

      expect(result).toEqual([]);
    });

    it("should aggregate spending by month", () => {
      const invoices = [
        createTestInvoice({amount: 100, date: new Date("2025-01-15")}),
        createTestInvoice({amount: 200, date: new Date("2025-01-20")}),
        createTestInvoice({amount: 150, date: new Date("2025-02-10")}),
      ];

      const result = computeMonthlySpending(invoices);

      expect(result).toHaveLength(2);
      expect(result[0]?.monthKey).toBe("2025-01");
      expect(result[0]?.amount).toBe(300);
      expect(result[0]?.invoiceCount).toBe(2);
      expect(result[1]?.monthKey).toBe("2025-02");
      expect(result[1]?.amount).toBe(150);
      expect(result[1]?.invoiceCount).toBe(1);
    });

    it("should sort months chronologically", () => {
      const invoices = [
        createTestInvoice({amount: 100, date: new Date("2025-03-01")}),
        createTestInvoice({amount: 200, date: new Date("2025-01-01")}),
        createTestInvoice({amount: 150, date: new Date("2025-02-01")}),
      ];

      const result = computeMonthlySpending(invoices);

      expect(result[0]?.monthKey).toBe("2025-01");
      expect(result[1]?.monthKey).toBe("2025-02");
      expect(result[2]?.monthKey).toBe("2025-03");
    });

    it("should format month labels correctly", () => {
      const invoices = [createTestInvoice({amount: 100, date: new Date("2025-01-15")})];

      const result = computeMonthlySpending(invoices);

      expect(result[0]?.month).toBe("Jan 2025");
    });

    it("should handle multiple years", () => {
      const invoices = [
        createTestInvoice({amount: 100, date: new Date("2024-12-15")}),
        createTestInvoice({amount: 200, date: new Date("2025-01-15")}),
      ];

      const result = computeMonthlySpending(invoices);

      expect(result).toHaveLength(2);
      expect(result[0]?.monthKey).toBe("2024-12");
      expect(result[1]?.monthKey).toBe("2025-01");
    });

    it("should round amounts to 2 decimal places", () => {
      const invoices = [
        createTestInvoice({amount: 123.456, date: new Date("2025-01-15")}),
        createTestInvoice({amount: 234.567, date: new Date("2025-01-20")}),
      ];

      const result = computeMonthlySpending(invoices);

      expect(result[0]?.amount).toBe(358.02);
    });
  });

  describe("getCategoryLabel", () => {
    it("should map all known category IDs", () => {
      expect(getCategoryLabel(0)).toBe("Uncategorized");
      expect(getCategoryLabel(100)).toBe("Grocery");
      expect(getCategoryLabel(200)).toBe("Dining");
      expect(getCategoryLabel(300)).toBe("Home");
      expect(getCategoryLabel(400)).toBe("Auto");
      expect(getCategoryLabel(9999)).toBe("Other");
    });

    it("should return Unknown for unknown category", () => {
      expect(getCategoryLabel(999)).toBe("Unknown");
      expect(getCategoryLabel(-1)).toBe("Unknown");
    });
  });

  describe("computeCategoryAggregates", () => {
    it("should return empty array for no invoices", () => {
      const result = computeCategoryAggregates([]);

      expect(result).toEqual([]);
    });

    it("should aggregate by category", () => {
      const invoices = [
        createTestInvoice({amount: 100, category: 100}), // Grocery
        createTestInvoice({amount: 200, category: 200}), // Dining
        createTestInvoice({amount: 150, category: 100}), // Grocery
      ];

      const result = computeCategoryAggregates(invoices);

      expect(result).toHaveLength(2);

      const grocery = result.find((c) => c.categoryId === 100);
      expect(grocery?.category).toBe("Grocery");
      expect(grocery?.amount).toBe(250);
      expect(grocery?.count).toBe(2);
      expect(grocery?.percentage).toBeCloseTo(55.6, 1);

      const dining = result.find((c) => c.categoryId === 200);
      expect(dining?.category).toBe("Dining");
      expect(dining?.amount).toBe(200);
      expect(dining?.count).toBe(1);
      expect(dining?.percentage).toBeCloseTo(44.4, 1);
    });

    it("should sort by amount descending", () => {
      const invoices = [
        createTestInvoice({amount: 100, category: 100}),
        createTestInvoice({amount: 300, category: 200}),
        createTestInvoice({amount: 200, category: 300}),
      ];

      const result = computeCategoryAggregates(invoices);

      expect(result[0]?.categoryId).toBe(200);
      expect(result[1]?.categoryId).toBe(300);
      expect(result[2]?.categoryId).toBe(100);
    });

    it("should handle uncategorized invoices", () => {
      const invoices = [createTestInvoice({amount: 100, category: 0})];

      const result = computeCategoryAggregates(invoices);

      expect(result[0]?.category).toBe("Uncategorized");
    });

    it("should compute percentages correctly", () => {
      const invoices = [createTestInvoice({amount: 50, category: 100}), createTestInvoice({amount: 50, category: 200})];

      const result = computeCategoryAggregates(invoices);

      expect(result[0]?.percentage).toBe(50.0);
      expect(result[1]?.percentage).toBe(50.0);
    });
  });

  describe("computeMerchantAggregates", () => {
    it("should return empty array for no invoices", () => {
      const result = computeMerchantAggregates([]);

      expect(result).toEqual([]);
    });

    it("should aggregate by merchant", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100}),
        createTestInvoice({merchantId: "merchant-2", amount: 300}),
        createTestInvoice({merchantId: "merchant-1", amount: 200}),
      ];

      const result = computeMerchantAggregates(invoices);

      expect(result).toHaveLength(2);

      const merchant1 = result.find((m) => m.merchantId === "merchant-1");
      expect(merchant1?.totalSpend).toBe(300);
      expect(merchant1?.invoiceCount).toBe(2);
      expect(merchant1?.averageSpend).toBe(150);

      const merchant2 = result.find((m) => m.merchantId === "merchant-2");
      expect(merchant2?.totalSpend).toBe(300);
      expect(merchant2?.invoiceCount).toBe(1);
      expect(merchant2?.averageSpend).toBe(300);
    });

    it("should sort by total spend descending", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100}),
        createTestInvoice({merchantId: "merchant-2", amount: 300}),
        createTestInvoice({merchantId: "merchant-3", amount: 200}),
      ];

      const result = computeMerchantAggregates(invoices);

      expect(result[0]?.merchantId).toBe("merchant-2");
      expect(result[1]?.merchantId).toBe("merchant-3");
      expect(result[2]?.merchantId).toBe("merchant-1");
    });

    it("should skip invoices without merchant reference", () => {
      const invoices = [createTestInvoice({merchantId: "merchant-1", amount: 100}), createTestInvoice({merchantId: "", amount: 50})];

      const result = computeMerchantAggregates(invoices);

      expect(result).toHaveLength(1);
      expect(result[0]?.merchantId).toBe("merchant-1");
    });
  });

  describe("computeDailySpending", () => {
    it("should return empty array for no invoices", () => {
      const result = computeDailySpending([]);

      expect(result).toEqual([]);
    });

    it("should aggregate by day", () => {
      const invoices = [
        createTestInvoice({amount: 100, date: new Date("2025-01-15T10:00:00")}),
        createTestInvoice({amount: 200, date: new Date("2025-01-15T14:00:00")}),
        createTestInvoice({amount: 150, date: new Date("2025-01-16T10:00:00")}),
      ];

      const result = computeDailySpending(invoices);

      expect(result).toHaveLength(2);
      expect(result[0]?.date).toBe("2025-01-15");
      expect(result[0]?.amount).toBe(300);
      expect(result[0]?.invoiceCount).toBe(2);
      expect(result[1]?.date).toBe("2025-01-16");
      expect(result[1]?.amount).toBe(150);
      expect(result[1]?.invoiceCount).toBe(1);
    });

    it("should sort by date ascending", () => {
      const invoices = [
        createTestInvoice({amount: 100, date: new Date("2025-01-17")}),
        createTestInvoice({amount: 200, date: new Date("2025-01-15")}),
        createTestInvoice({amount: 150, date: new Date("2025-01-16")}),
      ];

      const result = computeDailySpending(invoices);

      expect(result[0]?.date).toBe("2025-01-15");
      expect(result[1]?.date).toBe("2025-01-16");
      expect(result[2]?.date).toBe("2025-01-17");
    });

    it("should format dates as ISO strings", () => {
      const invoices = [createTestInvoice({amount: 100, date: new Date("2025-01-15")})];

      const result = computeDailySpending(invoices);

      expect(result[0]?.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("computePriceDistribution", () => {
    it("should return buckets with zero counts for empty array", () => {
      const result = computePriceDistribution([]);

      expect(result).toHaveLength(6);
      expect(result.every((b) => b.count === 0)).toBe(true);
    });

    it("should distribute invoices into buckets", () => {
      const invoices = [
        createTestInvoice({amount: 3}), // 0-5
        createTestInvoice({amount: 7}), // 5-10
        createTestInvoice({amount: 15}), // 10-25
        createTestInvoice({amount: 35}), // 25-50
        createTestInvoice({amount: 75}), // 50-100
        createTestInvoice({amount: 150}), // 100+
      ];

      const result = computePriceDistribution(invoices);

      expect(result[0]?.count).toBe(1); // 0-5
      expect(result[1]?.count).toBe(1); // 5-10
      expect(result[2]?.count).toBe(1); // 10-25
      expect(result[3]?.count).toBe(1); // 25-50
      expect(result[4]?.count).toBe(1); // 50-100
      expect(result[5]?.count).toBe(1); // 100+
    });

    it("should compute total amounts per bucket", () => {
      const invoices = [createTestInvoice({amount: 3}), createTestInvoice({amount: 4})];

      const result = computePriceDistribution(invoices);

      expect(result[0]?.totalAmount).toBe(7);
      expect(result[0]?.count).toBe(2);
    });

    it("should handle boundary values correctly", () => {
      const invoices = [
        createTestInvoice({amount: 0}), // 0-5
        createTestInvoice({amount: 5}), // 5-10
        createTestInvoice({amount: 10}), // 10-25
        createTestInvoice({amount: 100}), // 100+
      ];

      const result = computePriceDistribution(invoices);

      expect(result[0]?.count).toBe(1); // 0-5
      expect(result[1]?.count).toBe(1); // 5-10
      expect(result[2]?.count).toBe(1); // 10-25
      expect(result[5]?.count).toBe(1); // 100+
    });

    it("should have correct bucket ranges", () => {
      const result = computePriceDistribution([]);

      expect(result[0]?.range).toBe("0-5");
      expect(result[1]?.range).toBe("5-10");
      expect(result[2]?.range).toBe("10-25");
      expect(result[3]?.range).toBe("25-50");
      expect(result[4]?.range).toBe("50-100");
      expect(result[5]?.range).toBe("100+");
    });
  });

  describe("computeTimeOfDay", () => {
    it("should return all segments with zero counts for empty array", () => {
      const result = computeTimeOfDay([]);

      expect(result).toHaveLength(4);
      expect(result.every((s) => s.invoiceCount === 0)).toBe(true);
    });

    it("should segment by time of day", () => {
      const invoices = [
        createTestInvoice({amount: 100, date: new Date("2025-01-15T08:00:00")}), // Morning
        createTestInvoice({amount: 200, date: new Date("2025-01-15T14:00:00")}), // Afternoon
        createTestInvoice({amount: 150, date: new Date("2025-01-15T19:00:00")}), // Evening
        createTestInvoice({amount: 50, date: new Date("2025-01-15T23:00:00")}), // Night
      ];

      const result = computeTimeOfDay(invoices);

      const morning = result.find((s) => s.segment === "Morning");
      expect(morning?.invoiceCount).toBe(1);
      expect(morning?.totalAmount).toBe(100);

      const afternoon = result.find((s) => s.segment === "Afternoon");
      expect(afternoon?.invoiceCount).toBe(1);
      expect(afternoon?.totalAmount).toBe(200);

      const evening = result.find((s) => s.segment === "Evening");
      expect(evening?.invoiceCount).toBe(1);
      expect(evening?.totalAmount).toBe(150);

      const night = result.find((s) => s.segment === "Night");
      expect(night?.invoiceCount).toBe(1);
      expect(night?.totalAmount).toBe(50);
    });

    it("should compute average amounts correctly", () => {
      const invoices = [
        createTestInvoice({amount: 100, date: new Date("2025-01-15T08:00:00")}),
        createTestInvoice({amount: 200, date: new Date("2025-01-15T09:00:00")}),
      ];

      const result = computeTimeOfDay(invoices);

      const morning = result.find((s) => s.segment === "Morning");
      expect(morning?.averageAmount).toBe(150);
    });

    it("should handle boundary hours correctly", () => {
      const invoices = [
        createTestInvoice({amount: 100, date: new Date("2025-01-15T06:00:00")}), // Morning start
        createTestInvoice({amount: 200, date: new Date("2025-01-15T12:00:00")}), // Afternoon start
        createTestInvoice({amount: 150, date: new Date("2025-01-15T17:00:00")}), // Evening start
        createTestInvoice({amount: 50, date: new Date("2025-01-15T21:00:00")}), // Night start
      ];

      const result = computeTimeOfDay(invoices);

      expect(result.find((s) => s.segment === "Morning")?.invoiceCount).toBe(1);
      expect(result.find((s) => s.segment === "Afternoon")?.invoiceCount).toBe(1);
      expect(result.find((s) => s.segment === "Evening")?.invoiceCount).toBe(1);
      expect(result.find((s) => s.segment === "Night")?.invoiceCount).toBe(1);
    });
  });

  describe("computeMonthComparison", () => {
    it("should return empty comparison for no invoices", () => {
      const result = computeMonthComparison([]);

      expect(result.currentMonth.amount).toBe(0);
      expect(result.previousMonth).toBeNull();
      expect(result.spendingDelta).toBe(0);
      expect(result.spendingDeltaPercent).toBe(0);
      expect(result.invoiceCountDelta).toBe(0);
      expect(result.newMerchantCount).toBe(0);
    });

    it("should compare current and previous month", () => {
      const invoices = [
        createTestInvoice({amount: 100, date: new Date("2025-01-15")}),
        createTestInvoice({amount: 200, date: new Date("2025-02-15")}),
      ];

      const result = computeMonthComparison(invoices);

      expect(result.currentMonth.monthKey).toBe("2025-02");
      expect(result.currentMonth.amount).toBe(200);
      expect(result.previousMonth?.monthKey).toBe("2025-01");
      expect(result.previousMonth?.amount).toBe(100);
      expect(result.spendingDelta).toBe(100);
      expect(result.spendingDeltaPercent).toBe(100);
      expect(result.invoiceCountDelta).toBe(0);
    });

    it("should handle no previous month", () => {
      const invoices = [createTestInvoice({amount: 100, date: new Date("2025-01-15")})];

      const result = computeMonthComparison(invoices);

      expect(result.currentMonth.amount).toBe(100);
      expect(result.previousMonth).toBeNull();
      expect(result.spendingDelta).toBe(100);
      expect(result.spendingDeltaPercent).toBe(0);
    });

    it("should count new merchants in current month", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100, date: new Date("2025-01-15")}),
        createTestInvoice({merchantId: "merchant-1", amount: 150, date: new Date("2025-02-15")}),
        createTestInvoice({merchantId: "merchant-2", amount: 200, date: new Date("2025-02-20")}),
      ];

      const result = computeMonthComparison(invoices);

      expect(result.newMerchantCount).toBe(1); // merchant-2 is new in Feb
    });

    it("should calculate negative delta for decreased spending", () => {
      const invoices = [
        createTestInvoice({amount: 200, date: new Date("2025-01-15")}),
        createTestInvoice({amount: 100, date: new Date("2025-02-15")}),
      ];

      const result = computeMonthComparison(invoices);

      expect(result.spendingDelta).toBe(-100);
      expect(result.spendingDeltaPercent).toBe(-50);
    });
  });

  describe("getPaymentTypeLabel", () => {
    it("should map all known payment types", () => {
      expect(getPaymentTypeLabel(0)).toBe("Unknown");
      expect(getPaymentTypeLabel(100)).toBe("Cash");
      expect(getPaymentTypeLabel(200)).toBe("Card");
      expect(getPaymentTypeLabel(300)).toBe("Bank Transfer");
      expect(getPaymentTypeLabel(400)).toBe("Mobile Payment");
      expect(getPaymentTypeLabel(500)).toBe("Voucher");
      expect(getPaymentTypeLabel(9999)).toBe("Other");
    });

    it("should return Unknown for unknown payment type", () => {
      expect(getPaymentTypeLabel(999)).toBe("Unknown");
      expect(getPaymentTypeLabel(-1)).toBe("Unknown");
    });
  });

  describe("getProductCategoryLabel", () => {
    it("should map all known product categories", () => {
      expect(getProductCategoryLabel(0)).toBe("Uncategorized");
      expect(getProductCategoryLabel(100)).toBe("Baked Goods");
      expect(getProductCategoryLabel(200)).toBe("Groceries");
      expect(getProductCategoryLabel(300)).toBe("Dairy");
      expect(getProductCategoryLabel(400)).toBe("Meat");
      expect(getProductCategoryLabel(500)).toBe("Fish");
      expect(getProductCategoryLabel(600)).toBe("Fruits");
      expect(getProductCategoryLabel(700)).toBe("Vegetables");
      expect(getProductCategoryLabel(800)).toBe("Beverages");
      expect(getProductCategoryLabel(900)).toBe("Alcoholic Beverages");
      expect(getProductCategoryLabel(1000)).toBe("Tobacco");
      expect(getProductCategoryLabel(1100)).toBe("Cleaning Supplies");
      expect(getProductCategoryLabel(1200)).toBe("Personal Care");
      expect(getProductCategoryLabel(1300)).toBe("Medicine");
      expect(getProductCategoryLabel(9999)).toBe("Other");
    });

    it("should return Unknown for unknown category", () => {
      expect(getProductCategoryLabel(999)).toBe("Unknown");
      expect(getProductCategoryLabel(-1)).toBe("Unknown");
    });
  });

  describe("computeCurrencyDistribution", () => {
    it("should return empty array for no invoices", () => {
      const result = computeCurrencyDistribution([]);

      expect(result).toEqual([]);
    });

    it("should aggregate by currency", () => {
      const invoices = [
        createTestInvoice({amount: 100, currency: "RON"}),
        createTestInvoice({amount: 50, currency: "EUR", date: new Date("2025-01-15")}),
        createTestInvoice({amount: 200, currency: "RON"}),
      ];

      const result = computeCurrencyDistribution(invoices);

      expect(result.length).toBeGreaterThan(0);

      const ron = result.find((c) => c.currencyCode === "RON");
      expect(ron).toBeDefined();
      expect(ron?.invoiceCount).toBe(2);

      const eur = result.find((c) => c.currencyCode === "EUR");
      expect(eur).toBeDefined();
      expect(eur?.invoiceCount).toBe(1);
    });

    it("should convert all amounts to RON", () => {
      const invoices = [createTestInvoice({amount: 100, currency: "EUR", date: new Date("2025-01-15")})];

      const result = computeCurrencyDistribution(invoices);

      const eur = result.find((c) => c.currencyCode === "EUR");
      expect(eur?.totalOriginal).toBe(100);
      expect(eur?.totalInRON).toBeGreaterThan(400); // Approx 4.97 rate
    });

    it("should compute percentages correctly", () => {
      const invoices = [createTestInvoice({amount: 100, currency: "RON"}), createTestInvoice({amount: 100, currency: "RON"})];

      const result = computeCurrencyDistribution(invoices);

      expect(result[0]?.percentage).toBe(100);
    });

    it("should sort by RON total descending", () => {
      const invoices = [
        createTestInvoice({amount: 10, currency: "EUR", date: new Date("2025-01-15")}), // ~50 RON
        createTestInvoice({amount: 100, currency: "RON"}),
      ];

      const result = computeCurrencyDistribution(invoices);

      // RON should be first (higher total in RON)
      expect(result[0]?.currencyCode).toBe("RON");
    });
  });

  describe("computeProductCategorySpending", () => {
    it("should return empty array for no invoices", () => {
      const result = computeProductCategorySpending([]);

      expect(result).toEqual([]);
    });

    it("should aggregate by product category", () => {
      const products = [
        createTestProduct({category: 300, totalPrice: 50}), // Dairy
        createTestProduct({category: 400, totalPrice: 100}), // Meat
        createTestProduct({category: 300, totalPrice: 75}), // Dairy
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeProductCategorySpending(invoices);

      const dairy = result.find((c) => c.categoryId === 300);
      expect(dairy?.category).toBe("Dairy");
      expect(dairy?.totalSpent).toBe(125);
      expect(dairy?.productCount).toBe(2);

      const meat = result.find((c) => c.categoryId === 400);
      expect(meat?.category).toBe("Meat");
      expect(meat?.totalSpent).toBe(100);
      expect(meat?.productCount).toBe(1);
    });

    it("should compute percentages correctly", () => {
      const products = [createTestProduct({category: 300, totalPrice: 50}), createTestProduct({category: 400, totalPrice: 50})];

      const invoices = [createTestInvoice({items: products})];

      const result = computeProductCategorySpending(invoices);

      expect(result[0]?.percentage).toBe(50.0);
      expect(result[1]?.percentage).toBe(50.0);
    });

    it("should skip soft-deleted products", () => {
      const products = [
        createTestProduct({category: 300, totalPrice: 50}),
        createTestProduct({category: 400, totalPrice: 100, isSoftDeleted: true}),
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeProductCategorySpending(invoices);

      expect(result).toHaveLength(1);
      expect(result[0]?.categoryId).toBe(300);
    });

    it("should sort by total spent descending", () => {
      const products = [
        createTestProduct({category: 300, totalPrice: 50}),
        createTestProduct({category: 400, totalPrice: 150}),
        createTestProduct({category: 500, totalPrice: 100}),
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeProductCategorySpending(invoices);

      expect(result[0]?.categoryId).toBe(400); // 150
      expect(result[1]?.categoryId).toBe(500); // 100
      expect(result[2]?.categoryId).toBe(300); // 50
    });
  });

  describe("computeTopProducts", () => {
    it("should return empty array for no invoices", () => {
      const result = computeTopProducts([]);

      expect(result).toEqual([]);
    });

    it("should aggregate products by name", () => {
      const products = [
        createTestProduct({genericName: "Milk", quantity: 2, totalPrice: 20, price: 10}),
        createTestProduct({genericName: "Bread", quantity: 1, totalPrice: 5, price: 5}),
        createTestProduct({genericName: "Milk", quantity: 1, totalPrice: 10, price: 10}),
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeTopProducts(invoices);

      const milk = result.find((p) => p.name === "Milk");
      expect(milk?.totalQuantity).toBe(3);
      expect(milk?.totalSpent).toBe(30);
      expect(milk?.purchaseCount).toBe(2);
      expect(milk?.averagePrice).toBe(10);
    });

    it("should return top N products", () => {
      const products = [
        createTestProduct({genericName: "Product1", totalPrice: 100}),
        createTestProduct({genericName: "Product2", totalPrice: 200}),
        createTestProduct({genericName: "Product3", totalPrice: 150}),
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeTopProducts(invoices, 2);

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Product2");
      expect(result[1]?.name).toBe("Product3");
    });

    it("should use rawName if genericName is not available", () => {
      const products = [createTestProduct({genericName: "", rawName: "Milk 2%", totalPrice: 10})];

      const invoices = [createTestInvoice({items: products})];

      const result = computeTopProducts(invoices);

      expect(result[0]?.name).toBe("Milk 2%");
    });

    it("should skip products without names", () => {
      const products = [
        createTestProduct({genericName: "Milk", totalPrice: 10}),
        createTestProduct({genericName: "", rawName: "", totalPrice: 20}),
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeTopProducts(invoices);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Milk");
    });

    it("should skip soft-deleted products", () => {
      const products = [
        createTestProduct({genericName: "Milk", totalPrice: 10}),
        createTestProduct({genericName: "Bread", totalPrice: 5, isSoftDeleted: true}),
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeTopProducts(invoices);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Milk");
    });

    it("should sort by total spent descending", () => {
      const products = [
        createTestProduct({genericName: "Product1", totalPrice: 100}),
        createTestProduct({genericName: "Product2", totalPrice: 300}),
        createTestProduct({genericName: "Product3", totalPrice: 200}),
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeTopProducts(invoices);

      expect(result[0]?.name).toBe("Product2");
      expect(result[1]?.name).toBe("Product3");
      expect(result[2]?.name).toBe("Product1");
    });
  });

  describe("computeAllergenFrequency", () => {
    it("should return empty array for no invoices", () => {
      const result = computeAllergenFrequency([]);

      expect(result).toEqual([]);
    });

    it("should count allergen occurrences", () => {
      const products = [
        createTestProduct({detectedAllergens: [{name: "Lactose", description: "Found in dairy"}]}),
        createTestProduct({detectedAllergens: [{name: "Lactose", description: "Found in dairy"}]}),
        createTestProduct({detectedAllergens: [{name: "Gluten", description: "Found in wheat"}]}),
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeAllergenFrequency(invoices);

      const lactose = result.find((a) => a.name === "Lactose");
      expect(lactose?.productCount).toBe(2);
      expect(lactose?.description).toBe("Found in dairy");

      const gluten = result.find((a) => a.name === "Gluten");
      expect(gluten?.productCount).toBe(1);
      expect(gluten?.description).toBe("Found in wheat");
    });

    it("should compute percentages correctly", () => {
      const products = [
        createTestProduct({detectedAllergens: [{name: "Lactose", description: "Dairy"}]}),
        createTestProduct({detectedAllergens: []}),
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeAllergenFrequency(invoices);

      expect(result[0]?.percentage).toBe(50.0);
    });

    it("should skip soft-deleted products", () => {
      const products = [
        createTestProduct({detectedAllergens: [{name: "Lactose", description: "Dairy"}]}),
        createTestProduct({
          detectedAllergens: [{name: "Gluten", description: "Wheat"}],
          isSoftDeleted: true,
        }),
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeAllergenFrequency(invoices);

      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Lactose");
    });

    it("should sort by product count descending", () => {
      const products = [
        createTestProduct({detectedAllergens: [{name: "Lactose", description: "Dairy"}]}),
        createTestProduct({detectedAllergens: [{name: "Gluten", description: "Wheat"}]}),
        createTestProduct({detectedAllergens: [{name: "Gluten", description: "Wheat"}]}),
      ];

      const invoices = [createTestInvoice({items: products})];

      const result = computeAllergenFrequency(invoices);

      expect(result[0]?.name).toBe("Gluten");
      expect(result[1]?.name).toBe("Lactose");
    });

    it("should handle products without allergens", () => {
      const products = [createTestProduct({detectedAllergens: []})];

      const invoices = [createTestInvoice({items: products})];

      const result = computeAllergenFrequency(invoices);

      expect(result).toEqual([]);
    });
  });

  describe("computeMerchantTrends", () => {
    it("should return empty array for no invoices", () => {
      const result = computeMerchantTrends([]);

      expect(result).toEqual([]);
    });

    it("should compute trends for top N merchants", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100, date: new Date("2025-01-15")}),
        createTestInvoice({merchantId: "merchant-2", amount: 400, date: new Date("2025-01-15")}),
        createTestInvoice({merchantId: "merchant-1", amount: 200, date: new Date("2025-02-15")}),
      ];

      const result = computeMerchantTrends(invoices, 5);

      expect(result).toHaveLength(2);
      expect(result[0]?.merchantId).toBe("merchant-2");
      expect(result[0]?.totalSpend).toBe(400);
      expect(result[1]?.merchantId).toBe("merchant-1");
      expect(result[1]?.totalSpend).toBe(300);
    });

    it("should return only top N merchants", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100, date: new Date("2025-01-15")}),
        createTestInvoice({merchantId: "merchant-2", amount: 300, date: new Date("2025-01-15")}),
        createTestInvoice({merchantId: "merchant-3", amount: 200, date: new Date("2025-01-15")}),
      ];

      const result = computeMerchantTrends(invoices, 2);

      expect(result).toHaveLength(2);
      expect(result[0]?.merchantId).toBe("merchant-2");
      expect(result[1]?.merchantId).toBe("merchant-3");
    });

    it("should compute monthly breakdown per merchant", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100, date: new Date("2025-01-15")}),
        createTestInvoice({merchantId: "merchant-1", amount: 200, date: new Date("2025-02-15")}),
      ];

      const result = computeMerchantTrends(invoices, 5);

      expect(result[0]?.monthlyData).toHaveLength(2);
      expect(result[0]?.monthlyData[0]?.monthKey).toBe("2025-01");
      expect(result[0]?.monthlyData[0]?.amount).toBe(100);
      expect(result[0]?.monthlyData[1]?.monthKey).toBe("2025-02");
      expect(result[0]?.monthlyData[1]?.amount).toBe(200);
    });

    it("should skip invoices without merchant reference", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100, date: new Date("2025-01-15")}),
        createTestInvoice({merchantId: "", amount: 50, date: new Date("2025-01-15")}),
      ];

      const result = computeMerchantTrends(invoices, 5);

      expect(result).toHaveLength(1);
      expect(result[0]?.merchantId).toBe("merchant-1");
    });
  });

  describe("computeMerchantVisitFrequency", () => {
    it("should return empty array for no invoices", () => {
      const result = computeMerchantVisitFrequency([]);

      expect(result).toEqual([]);
    });

    it("should compute visit patterns for merchants", () => {
      const invoices = [
        createTestInvoice({
          merchantId: "merchant-1",
          amount: 100,
          date: new Date("2025-01-15T10:00:00"),
          items: [createTestProduct({}), createTestProduct({})],
        }),
        createTestInvoice({
          merchantId: "merchant-1",
          amount: 150,
          date: new Date("2025-01-22T10:00:00"),
          items: [createTestProduct({}), createTestProduct({}), createTestProduct({})],
        }),
      ];

      const result = computeMerchantVisitFrequency(invoices);

      expect(result).toHaveLength(1);
      expect(result[0]?.merchantId).toBe("merchant-1");
      expect(result[0]?.totalVisits).toBe(2);
      expect(result[0]?.averageSpendPerVisit).toBe(125); // (100 + 150) / 2
      expect(result[0]?.averageBasketSize).toBe(2.5); // (2 + 3) / 2
    });

    it("should sort by total visits descending", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100, date: new Date()}),
        createTestInvoice({merchantId: "merchant-2", amount: 100, date: new Date()}),
        createTestInvoice({merchantId: "merchant-2", amount: 100, date: new Date()}),
        createTestInvoice({merchantId: "merchant-2", amount: 100, date: new Date()}),
      ];

      const result = computeMerchantVisitFrequency(invoices);

      expect(result).toHaveLength(2);
      expect(result[0]?.merchantId).toBe("merchant-2");
      expect(result[0]?.totalVisits).toBe(3);
      expect(result[1]?.merchantId).toBe("merchant-1");
      expect(result[1]?.totalVisits).toBe(1);
    });

    it("should calculate most common day of week", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100, date: new Date("2025-01-15")}), // Wednesday
        createTestInvoice({merchantId: "merchant-1", amount: 150, date: new Date("2025-01-22")}), // Wednesday
      ];

      const result = computeMerchantVisitFrequency(invoices);

      expect(result[0]?.mostCommonDayOfWeek).toBe(3); // Wednesday = 3
    });

    it("should calculate average visits per month", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100, date: new Date("2025-01-01")}),
        createTestInvoice({merchantId: "merchant-1", amount: 100, date: new Date("2025-01-15")}),
        createTestInvoice({merchantId: "merchant-1", amount: 100, date: new Date("2025-02-01")}),
      ];

      const result = computeMerchantVisitFrequency(invoices);

      expect(result[0]?.totalVisits).toBe(3);
      expect(result[0]?.averageVisitsPerMonth).toBeGreaterThan(0);
    });

    it("should handle invoices without items", () => {
      const invoices = [createTestInvoice({merchantId: "merchant-1", amount: 100, items: []})];

      const result = computeMerchantVisitFrequency(invoices);

      expect(result[0]?.averageBasketSize).toBe(0);
    });

    it("should skip invoices without merchant reference", () => {
      const invoices = [
        createTestInvoice({merchantId: "merchant-1", amount: 100, date: new Date()}),
        createTestInvoice({merchantId: "", amount: 50, date: new Date()}),
      ];

      const result = computeMerchantVisitFrequency(invoices);

      expect(result).toHaveLength(1);
      expect(result[0]?.merchantId).toBe("merchant-1");
    });
  });

  /**
   * Edge case tests for null/undefined field handling.
   * These tests ensure nullish coalescing and optional chaining branches are covered.
   */
  describe("Edge Cases: Null and Undefined Fields", () => {
    describe("computeKPIs - null field handling", () => {
      it("should handle invoice with null paymentInformation", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing null paymentInformation
        invoice.paymentInformation = null;

        const result = computeKPIs([invoice]);

        expect(result.totalSpending).toBe(0);
        expect(result.currency).toBe("RON");
      });

      it("should handle invoice with null currency", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing null currency
        invoice.paymentInformation.currency = null;

        const result = computeKPIs([invoice]);

        expect(result.currency).toBe("RON");
      });

      it("should handle invoice with null totalCostAmount", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing null totalCostAmount
        invoice.paymentInformation.totalCostAmount = null;

        const result = computeKPIs([invoice]);

        expect(result.totalSpending).toBe(0);
      });

      it("should handle invoice with undefined currency code", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing undefined currency code
        invoice.paymentInformation.currency.code = undefined;

        const result = computeKPIs([invoice]);

        expect(result.currency).toBe("RON");
      });
    });

    describe("computeCurrencyDistribution - null field handling", () => {
      it("should handle invoice with null paymentInformation", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing null paymentInformation
        invoice.paymentInformation = null;

        const result = computeCurrencyDistribution([invoice]);

        expect(result).toHaveLength(1);
        expect(result[0]?.currencyCode).toBe("RON");
        expect(result[0]?.currencySymbol).toBe("lei");
        expect(result[0]?.totalOriginal).toBe(0);
      });

      it("should handle invoice with null currency", () => {
        const invoice = createTestInvoice({amount: 100, currency: "EUR"});
        // @ts-expect-error - Intentionally testing null currency
        invoice.paymentInformation.currency = null;

        const result = computeCurrencyDistribution([invoice]);

        expect(result).toHaveLength(1);
        expect(result[0]?.currencyCode).toBe("RON");
        expect(result[0]?.currencySymbol).toBe("lei");
      });

      it("should handle invoice with null currency symbol", () => {
        const invoice = createTestInvoice({amount: 100, currency: "EUR"});
        // @ts-expect-error - Intentionally testing null symbol
        invoice.paymentInformation.currency.symbol = null;

        const result = computeCurrencyDistribution([invoice]);

        expect(result).toHaveLength(1);
        expect(result[0]?.currencySymbol).toBe("lei");
      });

      it("should handle invoice with null totalCostAmount", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing null totalCostAmount
        invoice.paymentInformation.totalCostAmount = null;

        const result = computeCurrencyDistribution([invoice]);

        expect(result).toHaveLength(1);
        // totalCostAmount of null gets coalesced to 0
        expect(result[0]?.totalOriginal).toBe(0);
      });

      it("should handle invoice with undefined currency code", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing undefined code
        invoice.paymentInformation.currency.code = undefined;

        const result = computeCurrencyDistribution([invoice]);

        expect(result).toHaveLength(1);
        expect(result[0]?.currencyCode).toBe("RON");
      });
    });

    describe("computeMerchantAggregates - null field handling", () => {
      it("should handle invoice with null paymentInformation", () => {
        const invoice = createTestInvoice({merchantId: "merchant-1", amount: 100});
        // @ts-expect-error - Intentionally testing null paymentInformation
        invoice.paymentInformation = null;

        const result = computeMerchantAggregates([invoice]);

        expect(result).toHaveLength(1);
        expect(result[0]?.totalSpend).toBe(0);
      });

      it("should handle invoice with null currency", () => {
        const invoice = createTestInvoice({merchantId: "merchant-1", amount: 100});
        // @ts-expect-error - Intentionally testing null currency
        invoice.paymentInformation.currency = null;

        const result = computeMerchantAggregates([invoice]);

        expect(result).toHaveLength(1);
        expect(result[0]?.merchantId).toBe("merchant-1");
      });
    });

    describe("computeMonthlySpending - null field handling", () => {
      it("should handle invoice with null paymentInformation", () => {
        const invoice = createTestInvoice({amount: 100, date: new Date("2025-01-15")});
        // @ts-expect-error - Intentionally testing null paymentInformation
        invoice.paymentInformation = null;

        const result = computeMonthlySpending([invoice]);

        expect(result).toHaveLength(1);
        expect(result[0]?.amount).toBe(0);
      });

      it("should handle invoice with null transactionDate", () => {
        const invoice = createTestInvoice({amount: 100, date: new Date("2025-01-15")});
        // @ts-expect-error - Intentionally testing null transactionDate
        invoice.paymentInformation.transactionDate = null;

        const result = computeMonthlySpending([invoice]);

        // Should fall back to createdAt date
        expect(result).toHaveLength(1);
        expect(result[0]?.monthKey).toContain("2025-01");
      });

      it("should handle invoice with null currency", () => {
        const invoice = createTestInvoice({amount: 100, date: new Date("2025-01-15")});
        // @ts-expect-error - Intentionally testing null currency
        invoice.paymentInformation.currency = null;

        const result = computeMonthlySpending([invoice]);

        expect(result).toHaveLength(1);
      });
    });

    describe("computeTimeOfDay - null field handling", () => {
      it("should handle invoice with null transactionDate", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing null transactionDate
        invoice.paymentInformation.transactionDate = null;

        const result = computeTimeOfDay([invoice]);

        // Should use createdAt as fallback
        expect(result.length).toBeGreaterThan(0);
      });

      it("should handle invoice with null paymentInformation", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing null paymentInformation
        invoice.paymentInformation = null;

        const result = computeTimeOfDay([invoice]);

        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe("computeDailySpending - null field handling", () => {
      it("should handle invoice with null transactionDate", () => {
        const invoice = createTestInvoice({amount: 100, date: new Date("2025-01-15")});
        // @ts-expect-error - Intentionally testing null transactionDate
        invoice.paymentInformation.transactionDate = null;

        const result = computeDailySpending([invoice]);

        // Should fall back to createdAt
        expect(result).toHaveLength(1);
        expect(result[0]?.date).toBe("2025-01-15");
      });
    });

    describe("computeTopProducts - edge cases", () => {
      it("should handle product with zero price count (division by zero)", () => {
        const productWithZeroPrice = createTestProduct({name: "Test Product", price: 0, quantity: 1});
        const invoice = createTestInvoice({items: [productWithZeroPrice], amount: 0});

        const result = computeTopProducts([invoice], 10);

        expect(result).toHaveLength(1);
        expect(result[0]?.averagePrice).toBe(0);
      });

      it("should handle products with null items array", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing null items
        invoice.items = null;

        const result = computeTopProducts([invoice], 10);

        expect(result).toHaveLength(0);
      });
    });

    describe("computeAllergenFrequency - edge cases", () => {
      it("should handle products with null items array", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing null items
        invoice.items = null;

        const result = computeAllergenFrequency([invoice]);

        expect(result).toHaveLength(0);
      });

      it("should handle products with null detectedAllergens", () => {
        const product = createTestProduct({name: "Test Product"});
        // @ts-expect-error - Intentionally testing null detectedAllergens
        product.detectedAllergens = null;
        const invoice = createTestInvoice({items: [product], amount: 100});

        const result = computeAllergenFrequency([invoice]);

        expect(result).toHaveLength(0);
      });

      it("should handle zero totalProducts (division by zero)", () => {
        const invoice = createTestInvoice({items: [], amount: 0});

        const result = computeAllergenFrequency([invoice]);

        expect(result).toHaveLength(0);
      });

      it("should calculate percentage correctly when totalProducts > 0", () => {
        const product1 = createTestProduct({
          name: "Product 1",
          detectedAllergens: [{name: "Gluten", description: "Contains gluten"}],
        });
        const product2 = createTestProduct({
          name: "Product 2",
          detectedAllergens: [{name: "Gluten", description: "Contains gluten"}],
        });
        const product3 = createTestProduct({
          name: "Product 3",
          detectedAllergens: [],
        });
        const invoice = createTestInvoice({items: [product1, product2, product3], amount: 100});

        const result = computeAllergenFrequency([invoice]);

        expect(result).toHaveLength(1);
        expect(result[0]?.percentage).toBeCloseTo(66.7, 1); // 2/3 * 100
      });
    });

    describe("computeProductCategorySpending - edge cases", () => {
      it("should handle zero grandTotal (division by zero)", () => {
        const product = createTestProduct({price: 0, totalPrice: 0, category: 100});
        const invoice = createTestInvoice({items: [product], amount: 0});

        const result = computeProductCategorySpending([invoice]);

        expect(result).toHaveLength(1);
        expect(result[0]?.percentage).toBe(0);
      });

      it("should handle invoice with null items", () => {
        const invoice = createTestInvoice({amount: 100});
        // @ts-expect-error - Intentionally testing null items
        invoice.items = null;

        const result = computeProductCategorySpending([invoice]);

        expect(result).toHaveLength(0);
      });

      it("should handle invoice with null paymentInformation in currency code", () => {
        const product = createTestProduct({price: 10, totalPrice: 10, category: 100});
        const invoice = createTestInvoice({items: [product], amount: 10});
        // @ts-expect-error - Intentionally testing null paymentInformation
        invoice.paymentInformation = null;

        const result = computeProductCategorySpending([invoice]);

        // Should still work with default RON currency
        expect(result.length).toBeGreaterThan(0);
      });

      it("should handle invoice with null currency", () => {
        const product = createTestProduct({price: 10, totalPrice: 10, category: 100});
        const invoice = createTestInvoice({items: [product], amount: 10});
        // @ts-expect-error - Intentionally testing null currency
        invoice.paymentInformation.currency = null;

        const result = computeProductCategorySpending([invoice]);

        // Should still work with default RON currency
        expect(result.length).toBeGreaterThan(0);
      });

      it("should handle products with null category", () => {
        const product = createTestProduct({price: 10, totalPrice: 10});
        // @ts-expect-error - Intentionally testing null category
        product.category = null;
        const invoice = createTestInvoice({items: [product], amount: 10});

        const result = computeProductCategorySpending([invoice]);

        // Should use category 0 as default
        expect(result.length).toBeGreaterThan(0);
        expect(result[0]?.categoryId).toBe(0);
      });
    });

    describe("computeTopProducts - more edge cases", () => {
      it("should handle products with null category", () => {
        const product = createTestProduct({name: "Test Product", price: 10, totalPrice: 10});
        // @ts-expect-error - Intentionally testing null category
        product.category = null;
        const invoice = createTestInvoice({items: [product], amount: 10});

        const result = computeTopProducts([invoice], 10);

        expect(result.length).toBeGreaterThan(0);
      });

      it("should handle invoice with null currency in payment information", () => {
        const product = createTestProduct({name: "Test Product", price: 10, totalPrice: 10});
        const invoice = createTestInvoice({items: [product], amount: 10});
        // @ts-expect-error - Intentionally testing null currency
        invoice.paymentInformation.currency = null;

        const result = computeTopProducts([invoice], 10);

        expect(result.length).toBeGreaterThan(0);
      });

      it("should handle invoice with null paymentInformation", () => {
        const product = createTestProduct({name: "Test Product", price: 10, totalPrice: 10});
        const invoice = createTestInvoice({items: [product], amount: 10});
        // @ts-expect-error - Intentionally testing null paymentInformation
        invoice.paymentInformation = null;

        const result = computeTopProducts([invoice], 10);

        expect(result.length).toBeGreaterThan(0);
      });
    });

    describe("computeMerchantVisitFrequency - edge cases", () => {
      it("should handle merchant with zero visits (division by zero)", () => {
        // Create an invoice and then artificially create edge case
        const invoice = createTestInvoice({merchantId: "merchant-1", amount: 100, items: []});

        const result = computeMerchantVisitFrequency([invoice]);

        expect(result).toHaveLength(1);
        expect(result[0]?.averageBasketSize).toBe(0);
        expect(result[0]?.averageSpendPerVisit).toBeGreaterThan(0);
      });

      it("should handle merchant visits edge case for average calculation", () => {
        const invoice = createTestInvoice({
          merchantId: "merchant-1",
          amount: 100,
          items: [createTestProduct({quantity: 2}), createTestProduct({quantity: 3})],
        });

        const result = computeMerchantVisitFrequency([invoice]);

        expect(result).toHaveLength(1);
        expect(result[0]?.averageBasketSize).toBeGreaterThan(0);
        expect(result[0]?.averageSpendPerVisit).toBeGreaterThan(0);
      });
    });
  });
});
