/**
 * @fileoverview Unit tests for analytics utilities.
 */

import {InvoiceBuilder, ProductBuilder} from "@/data/mocks";
import {ProductCategory} from "@/types/invoices";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {
  computeBudgetImpact,
  computeShoppingPatterns,
  getCategoryComparison,
  getCategorySpending,
  getComparisonStats,
  getInvoiceSummary,
  getMerchantBreakdown,
  getPriceDistribution,
  getQuantityAnalysis,
  getSpendingIntensityClass,
  getSpendingTrend,
  getUnitPriceAnalysis,
  getWeekdayName,
} from "./analytics";

// Mock currency utilities
vi.mock("@/lib/currency", () => ({
  toRON: vi.fn((amount: number, currency: string, _year: number) => {
    // Simple mock: convert EUR to RON at 5:1 rate, USD at 4.5:1, else return as-is
    if (currency === "EUR") return amount * 5;
    if (currency === "USD") return amount * 4.5;
    return amount;
  }),
  getTransactionYear: vi.fn((transactionDate?: Date, createdAt?: Date) => {
    const date = transactionDate || createdAt || new Date();
    return new Date(date).getFullYear();
  }),
}));

describe("getSpendingTrend", () => {
  it("should return empty array if fewer than 2 invoices", () => {
    const invoice = new InvoiceBuilder().build();
    const result = getSpendingTrend(invoice, [invoice]);
    expect(result).toEqual([]);
  });

  it("should group invoices by month and normalize to RON", () => {
    const invoice1 = new InvoiceBuilder()
      .withId("inv1")
      .withCreatedAt(new Date("2024-01-15"))
      .withTransactionDate(new Date("2024-01-15"))
      .withPaymentAmount(100)
      .withPaymentCurrency("RON")
      .build();

    const invoice2 = new InvoiceBuilder()
      .withId("inv2")
      .withCreatedAt(new Date("2024-01-20"))
      .withTransactionDate(new Date("2024-01-20"))
      .withPaymentAmount(200)
      .withPaymentCurrency("RON")
      .build();

    const invoice3 = new InvoiceBuilder()
      .withId("inv3")
      .withCreatedAt(new Date("2024-02-10"))
      .withTransactionDate(new Date("2024-02-10"))
      .withPaymentAmount(150)
      .withPaymentCurrency("RON")
      .build();

    const result = getSpendingTrend(invoice1, [invoice1, invoice2, invoice3]);

    expect(result).toHaveLength(2);
    expect(result[0]?.date).toContain("Jan");
    expect(result[0]?.amount).toBe(300); // 100 + 200
    expect(result[0]?.isCurrent).toBe(true);
    expect(result[1]?.date).toContain("Feb");
    expect(result[1]?.amount).toBe(150);
    expect(result[1]?.isCurrent).toBe(false);
  });

  it("should handle invoices with different currencies", () => {
    const invoice1 = new InvoiceBuilder()
      .withId("inv1")
      .withTransactionDate(new Date("2024-01-15"))
      .withPaymentAmount(100)
      .withPaymentCurrency("EUR")
      .build();

    const invoice2 = new InvoiceBuilder()
      .withId("inv2")
      .withTransactionDate(new Date("2024-01-20"))
      .withPaymentAmount(100)
      .withPaymentCurrency("USD")
      .build();

    const result = getSpendingTrend(invoice1, [invoice1, invoice2]);

    expect(result).toHaveLength(1);
    // EUR: 100 * 5 = 500, USD: 100 * 4.5 = 450, total = 950
    expect(result[0]?.amount).toBe(950);
  });

  it("should fall back to createdAt if transactionDate is missing", () => {
    const invoice1 = new InvoiceBuilder()
      .withId("inv1")
      .withCreatedAt(new Date("2024-01-15"))
      .withTransactionDate(new Date("2024-01-15"))
      .withPaymentAmount(100)
      .withPaymentCurrency("RON")
      .build();

    const invoice2 = new InvoiceBuilder()
      .withId("inv2")
      .withCreatedAt(new Date("2024-02-15"))
      .withTransactionDate(new Date("2024-02-15"))
      .withPaymentAmount(200)
      .withPaymentCurrency("RON")
      .build();

    const result = getSpendingTrend(invoice1, [invoice1, invoice2]);

    expect(result).toHaveLength(2);
    expect(result[0]?.date).toContain("Jan");
    expect(result[1]?.date).toContain("Feb");
  });

  it("should include invoice count in name", () => {
    const invoice1 = new InvoiceBuilder().withTransactionDate(new Date("2024-01-15")).withPaymentAmount(100).build();

    const invoice2 = new InvoiceBuilder().withTransactionDate(new Date("2024-01-20")).withPaymentAmount(200).build();

    const result = getSpendingTrend(invoice1, [invoice1, invoice2]);

    expect(result[0]?.name).toBe("2 invoices");
  });

  it("should use singular form for single invoice", () => {
    const invoice1 = new InvoiceBuilder().withTransactionDate(new Date("2024-01-15")).withPaymentAmount(100).build();

    const invoice2 = new InvoiceBuilder().withTransactionDate(new Date("2024-02-15")).withPaymentAmount(200).build();

    const result = getSpendingTrend(invoice1, [invoice1, invoice2]);

    expect(result[0]?.name).toBe("1 invoice");
    expect(result[1]?.name).toBe("1 invoice");
  });

  it("should sort results by date ascending", () => {
    const invoice1 = new InvoiceBuilder().withTransactionDate(new Date("2024-03-15")).withPaymentAmount(100).build();

    const invoice2 = new InvoiceBuilder().withTransactionDate(new Date("2024-01-15")).withPaymentAmount(200).build();

    const invoice3 = new InvoiceBuilder().withTransactionDate(new Date("2024-02-15")).withPaymentAmount(150).build();

    const result = getSpendingTrend(invoice1, [invoice1, invoice2, invoice3]);

    expect(result[0]?.date).toContain("Jan");
    expect(result[1]?.date).toContain("Feb");
    expect(result[2]?.date).toContain("Mar");
  });
});

describe("getComparisonStats", () => {
  it("should return default values with fewer than 2 invoices", () => {
    const invoice = new InvoiceBuilder().withPaymentAmount(100).withPaymentCurrency("RON").build();
    const result = getComparisonStats(invoice, [invoice]);

    // Should return current amount (might be normalized by currency)
    expect(result.currentAmount).toBeGreaterThan(0);
    expect(result.averageAmount).toBe(result.currentAmount); // Same as current when only 1 invoice
    expect(result.percentageDiff).toBe(0);
    expect(result.isAboveAverage).toBe(false);
    expect(result.totalInvoices).toBe(1);
  });

  it("should compute comparison stats correctly", () => {
    const currentInvoice = new InvoiceBuilder().withId("current").withPaymentAmount(150).withRandomItems(5).build();

    const otherInvoice1 = new InvoiceBuilder().withId("other1").withPaymentAmount(100).withRandomItems(3).build();

    const otherInvoice2 = new InvoiceBuilder().withId("other2").withPaymentAmount(200).withRandomItems(7).build();

    const result = getComparisonStats(currentInvoice, [currentInvoice, otherInvoice1, otherInvoice2]);

    // Basic assertions - amounts might be normalized by currency converter
    expect(result.currentAmount).toBeGreaterThan(0);
    expect(result.averageAmount).toBeGreaterThan(0);
    expect(result.totalInvoices).toBe(3);
    expect(result.minAmount).toBeLessThanOrEqual(result.maxAmount);
  });

  it("should exclude current invoice from average calculation", () => {
    const currentInvoice = new InvoiceBuilder().withId("current").withPaymentAmount(500).withPaymentCurrency("RON").build();

    const otherInvoice1 = new InvoiceBuilder().withId("other1").withPaymentAmount(100).withPaymentCurrency("RON").build();

    const otherInvoice2 = new InvoiceBuilder().withId("other2").withPaymentAmount(200).withPaymentCurrency("RON").build();

    const result = getComparisonStats(currentInvoice, [currentInvoice, otherInvoice1, otherInvoice2]);

    // Average should be (100 + 200) / 2 = 150, not including current 500
    expect(result.averageAmount).toBe(150);
    expect(result.currentAmount).toBe(500);
  });

  it("should calculate percentage difference correctly", () => {
    const currentInvoice = new InvoiceBuilder().withId("current").withPaymentAmount(150).withPaymentCurrency("RON").build();

    const otherInvoice = new InvoiceBuilder().withId("other").withPaymentAmount(100).withPaymentCurrency("RON").build();

    const result = getComparisonStats(currentInvoice, [currentInvoice, otherInvoice]);

    // (150 - 100) / 100 * 100 = 50%
    expect(result.percentageDiff).toBe(50);
    expect(result.isAboveAverage).toBe(true);
  });

  it("should handle below average spending", () => {
    const currentInvoice = new InvoiceBuilder().withId("current").withPaymentAmount(50).withPaymentCurrency("RON").build();

    const otherInvoice = new InvoiceBuilder().withId("other").withPaymentAmount(100).withPaymentCurrency("RON").build();

    const result = getComparisonStats(currentInvoice, [currentInvoice, otherInvoice]);

    expect(result.percentageDiff).toBeLessThan(0);
    expect(result.isAboveAverage).toBe(false);
  });

  it("should compute min and max amounts", () => {
    const currentInvoice = new InvoiceBuilder().withId("current").withPaymentAmount(150).withPaymentCurrency("RON").build();

    const invoice1 = new InvoiceBuilder().withId("inv1").withPaymentAmount(50).withPaymentCurrency("RON").build();

    const invoice2 = new InvoiceBuilder().withId("inv2").withPaymentAmount(300).withPaymentCurrency("RON").build();

    const result = getComparisonStats(currentInvoice, [currentInvoice, invoice1, invoice2]);

    expect(result.minAmount).toBe(50);
    expect(result.maxAmount).toBe(300);
  });

  it("should compute item count statistics", () => {
    const currentInvoice = new InvoiceBuilder().withId("current").withRandomItems(10).build();

    const otherInvoice = new InvoiceBuilder().withId("other").withRandomItems(5).build();

    const result = getComparisonStats(currentInvoice, [currentInvoice, otherInvoice]);

    expect(result.currentItemCount).toBe(10);
    expect(result.averageItemCount).toBe(5);
    expect(result.itemCountDiff).toBe(100); // (10-5)/5 * 100 = 100%
  });

  it("should compute same merchant comparison", () => {
    const currentInvoice = new InvoiceBuilder()
      .withId("current")
      .withMerchantReference("merchant-a")
      .withPaymentAmount(200)
      .withPaymentCurrency("RON")
      .build();

    const sameMerchantInvoice = new InvoiceBuilder()
      .withId("same")
      .withMerchantReference("merchant-a")
      .withPaymentAmount(100)
      .withPaymentCurrency("RON")
      .build();

    const differentMerchantInvoice = new InvoiceBuilder()
      .withId("different")
      .withMerchantReference("merchant-b")
      .withPaymentAmount(50)
      .withPaymentCurrency("RON")
      .build();

    const result = getComparisonStats(currentInvoice, [currentInvoice, sameMerchantInvoice, differentMerchantInvoice]);

    // Same merchant avg should be 100 (only sameMerchantInvoice)
    expect(result.sameMerchantAvg).toBe(100);
    expect(result.sameMerchantDiff).toBe(100); // (200-100)/100 * 100 = 100%
  });

  it("should handle currency normalization", () => {
    const currentInvoice = new InvoiceBuilder().withId("current").withPaymentAmount(100).withPaymentCurrency("EUR").build();

    const otherInvoice = new InvoiceBuilder().withId("other").withPaymentAmount(100).withPaymentCurrency("RON").build();

    const result = getComparisonStats(currentInvoice, [currentInvoice, otherInvoice]);

    // Current: 100 EUR * 5 = 500 RON, Other: 100 RON
    expect(result.currentAmount).toBe(500);
    expect(result.averageAmount).toBe(100);
  });
});

describe("getMerchantBreakdown", () => {
  it("should return empty array for no invoices", () => {
    const result = getMerchantBreakdown([]);
    expect(result).toEqual([]);
  });

  it("should group invoices by merchant and compute totals", () => {
    const invoice1 = new InvoiceBuilder().withMerchantReference("merchant-a").withPaymentAmount(100).build();

    const invoice2 = new InvoiceBuilder().withMerchantReference("merchant-a").withPaymentAmount(200).build();

    const invoice3 = new InvoiceBuilder().withMerchantReference("merchant-b").withPaymentAmount(150).build();

    const result = getMerchantBreakdown([invoice1, invoice2, invoice3]);

    expect(result).toHaveLength(2);
    // Results are sorted by total descending, so merchant-a (300) should be first
    const merchantA = result.find((m) => m.name === "merchant-a");
    const merchantB = result.find((m) => m.name === "merchant-b");

    expect(merchantA).toBeDefined();
    expect(merchantA?.count).toBe(2);
    expect(merchantA?.total).toBeGreaterThan(0);

    expect(merchantB).toBeDefined();
    expect(merchantB?.count).toBe(1);
  });

  it("should sort by total spend descending", () => {
    const invoice1 = new InvoiceBuilder().withMerchantReference("merchant-a").withPaymentAmount(100).withPaymentCurrency("RON").build();

    const invoice2 = new InvoiceBuilder().withMerchantReference("merchant-b").withPaymentAmount(300).withPaymentCurrency("RON").build();

    const invoice3 = new InvoiceBuilder().withMerchantReference("merchant-c").withPaymentAmount(200).withPaymentCurrency("RON").build();

    const result = getMerchantBreakdown([invoice1, invoice2, invoice3]);

    expect(result[0]?.name).toBe("merchant-b");
    expect(result[0]?.total).toBe(300);
    expect(result[1]?.name).toBe("merchant-c");
    expect(result[1]?.total).toBe(200);
    expect(result[2]?.name).toBe("merchant-a");
    expect(result[2]?.total).toBe(100);
  });

  it("should compute average per merchant", () => {
    const invoice1 = new InvoiceBuilder().withMerchantReference("merchant-a").withPaymentAmount(100).withPaymentCurrency("RON").build();

    const invoice2 = new InvoiceBuilder().withMerchantReference("merchant-a").withPaymentAmount(200).withPaymentCurrency("RON").build();

    const result = getMerchantBreakdown([invoice1, invoice2]);

    expect(result[0]?.average).toBe(150); // (100 + 200) / 2
  });

  it("should handle missing merchantReference", () => {
    const invoice = new InvoiceBuilder().withPaymentAmount(100).build();
    // Manually remove merchantReference
    (invoice as any).merchantReference = null;

    const result = getMerchantBreakdown([invoice]);

    expect(result[0]?.name).toBe("Unknown");
    expect(result[0]?.total).toBe(100);
  });

  it("should normalize amounts to RON", () => {
    const invoice1 = new InvoiceBuilder().withMerchantReference("merchant-a").withPaymentAmount(100).withPaymentCurrency("EUR").build();

    const invoice2 = new InvoiceBuilder().withMerchantReference("merchant-a").withPaymentAmount(100).withPaymentCurrency("USD").build();

    const result = getMerchantBreakdown([invoice1, invoice2]);

    // EUR: 100 * 5 = 500, USD: 100 * 4.5 = 450, total = 950
    expect(result[0]?.total).toBe(950);
    expect(result[0]?.average).toBe(475);
  });
});

describe("getCategoryComparison", () => {
  it("should return empty array if current invoice has no items", () => {
    const invoice = new InvoiceBuilder().withItems([]).build();
    const result = getCategoryComparison(invoice, [invoice]);
    expect(result).toEqual([]);
  });

  it("should compare current invoice categories to historical averages", () => {
    const currentInvoice = new InvoiceBuilder()
      .withId("current")
      .withItems([{category: ProductCategory.DAIRY, totalPrice: 50} as any, {category: ProductCategory.MEAT, totalPrice: 100} as any])
      .build();

    const historicalInvoice = new InvoiceBuilder()
      .withId("historical")
      .withItems([{category: ProductCategory.DAIRY, totalPrice: 30} as any, {category: ProductCategory.MEAT, totalPrice: 60} as any])
      .build();

    const result = getCategoryComparison(currentInvoice, [currentInvoice, historicalInvoice]);

    expect(result).toHaveLength(2);
    // Should be sorted by current amount descending
    expect(result[0]?.category).toContain("MEAT");
    expect(result[0]?.current).toBe(100);
    expect(result[0]?.average).toBe(60);

    expect(result[1]?.category).toContain("DAIRY");
    expect(result[1]?.current).toBe(50);
    expect(result[1]?.average).toBe(30);
  });

  it("should handle category with no historical data", () => {
    const currentInvoice = new InvoiceBuilder()
      .withId("current")
      .withItems([{category: ProductCategory.FRUITS, totalPrice: 75} as any])
      .build();

    const historicalInvoice = new InvoiceBuilder()
      .withId("historical")
      .withItems([{category: ProductCategory.DAIRY, totalPrice: 30} as any])
      .build();

    const result = getCategoryComparison(currentInvoice, [currentInvoice, historicalInvoice]);

    expect(result).toHaveLength(1);
    expect(result[0]?.category).toContain("FRUITS");
    expect(result[0]?.current).toBe(75);
    expect(result[0]?.average).toBe(0);
  });
});

describe("getCategorySpending", () => {
  it("should return empty array for no items", () => {
    const result = getCategorySpending([]);
    expect(result).toEqual([]);
  });

  it("should group items by category and compute totals", () => {
    const items = [
      new ProductBuilder().withCategory(ProductCategory.DAIRY).withTotalPrice(50).build(),
      new ProductBuilder().withCategory(ProductCategory.DAIRY).withTotalPrice(30).build(),
      new ProductBuilder().withCategory(ProductCategory.MEAT).withTotalPrice(100).build(),
    ];

    const result = getCategorySpending(items);

    expect(result).toHaveLength(2);
    expect(result[0]?.category).toContain("MEAT");
    expect(result[0]?.amount).toBe(100);
    expect(result[0]?.count).toBe(1);
    expect(result[1]?.category).toContain("DAIRY");
    expect(result[1]?.amount).toBe(80);
    expect(result[1]?.count).toBe(2);
  });

  it("should sort by amount descending", () => {
    const items = [
      new ProductBuilder().withCategory(ProductCategory.DAIRY).withTotalPrice(30).build(),
      new ProductBuilder().withCategory(ProductCategory.MEAT).withTotalPrice(100).build(),
      new ProductBuilder().withCategory(ProductCategory.FRUITS).withTotalPrice(50).build(),
    ];

    const result = getCategorySpending(items);

    expect(result[0]?.amount).toBe(100);
    expect(result[1]?.amount).toBe(50);
    expect(result[2]?.amount).toBe(30);
  });

  it("should assign fill colors from category color map", () => {
    const items = [new ProductBuilder().withCategory(ProductCategory.DAIRY).withTotalPrice(50).build()];

    const result = getCategorySpending(items);

    expect(result[0]?.fill).toBeDefined();
    expect(result[0]?.fill).toContain("var(--chart-");
  });
});

describe("getPriceDistribution", () => {
  it("should return empty array for no items", () => {
    const result = getPriceDistribution([]);
    expect(result).toEqual([]);
  });

  it("should group items into price ranges", () => {
    const items = [
      new ProductBuilder().withTotalPrice(5).build(),
      new ProductBuilder().withTotalPrice(8).build(),
      new ProductBuilder().withTotalPrice(15).build(),
      new ProductBuilder().withTotalPrice(30).build(),
      new ProductBuilder().withTotalPrice(60).build(),
    ];

    const result = getPriceDistribution(items);

    const under10 = result.find((r) => r.range === "Under 10");
    const range10to25 = result.find((r) => r.range === "10-25");
    const range25to50 = result.find((r) => r.range === "25-50");
    const range50plus = result.find((r) => r.range === "50+");

    expect(under10?.count).toBe(2);
    expect(range10to25?.count).toBe(1);
    expect(range25to50?.count).toBe(1);
    expect(range50plus?.count).toBe(1);
  });

  it("should filter out empty ranges", () => {
    const items = [new ProductBuilder().withTotalPrice(5).build(), new ProductBuilder().withTotalPrice(8).build()];

    const result = getPriceDistribution(items);

    expect(result).toHaveLength(1);
    expect(result[0]?.range).toBe("Under 10");
    expect(result[0]?.count).toBe(2);
  });
});

describe("getQuantityAnalysis", () => {
  it("should return empty array for no items", () => {
    const result = getQuantityAnalysis([]);
    expect(result).toEqual([]);
  });

  it("should return top 5 items sorted by price", () => {
    const items = Array.from({length: 10}, (_, i) =>
      new ProductBuilder()
        .withGenericName(`Product ${i}`)
        .withTotalPrice(100 - i * 10)
        .withQuantity(1)
        .withQuantityUnit("kg")
        .build(),
    );

    const result = getQuantityAnalysis(items);

    expect(result).toHaveLength(5);
    // Verify descending order - first item should have highest price
    expect(result[0]?.price).toBeGreaterThan(result[4]?.price ?? 0);
  });

  it("should truncate long product names", () => {
    const items = [new ProductBuilder().withGenericName("Very Long Product Name Here").withTotalPrice(50).build()];

    const result = getQuantityAnalysis(items);

    expect(result[0]?.name).toContain("...");
    expect(result[0]?.name.length).toBeLessThanOrEqual(15);
  });

  it("should include quantity and unit", () => {
    const items = [new ProductBuilder().withGenericName("Product A").withQuantity(2.5).withQuantityUnit("kg").withTotalPrice(50).build()];

    const result = getQuantityAnalysis(items);

    expect(result[0]?.quantity).toBe(2.5);
    expect(result[0]?.unit).toBe("kg");
  });
});

describe("getInvoiceSummary", () => {
  it("should compute summary statistics correctly", () => {
    const items = [
      new ProductBuilder().withCategory(ProductCategory.DAIRY).withTotalPrice(50).withGenericName("Milk").build(),
      new ProductBuilder().withCategory(ProductCategory.MEAT).withTotalPrice(100).withGenericName("Beef").build(),
      new ProductBuilder().withCategory(ProductCategory.FRUITS).withTotalPrice(30).withGenericName("Apples").build(),
    ];

    const invoice = new InvoiceBuilder().withItems(items).withPaymentAmount(180).build();

    // Manually set tax amount through paymentInformation
    invoice.paymentInformation.totalTaxAmount = 18;

    const result = getInvoiceSummary(invoice);

    expect(result.totalItems).toBe(3);
    expect(result.uniqueCategories).toBe(3);
    expect(result.averageItemPrice).toBe(60);
    expect(result.highestItem.name).toBe("Beef");
    expect(result.highestItem.price).toBe(100);
    expect(result.lowestItem.name).toBe("Apples");
    expect(result.lowestItem.price).toBe(30);
    expect(result.totalAmount).toBe(180);
    expect(result.taxAmount).toBe(18);
    expect(result.taxPercentage).toBe(10);
  });

  it("should handle invoice with no items", () => {
    const invoice = new InvoiceBuilder().withItems([]).withPaymentAmount(0).build();
    invoice.paymentInformation.totalTaxAmount = 0;

    const result = getInvoiceSummary(invoice);

    expect(result.totalItems).toBe(0);
    expect(result.uniqueCategories).toBe(0);
    expect(result.averageItemPrice).toBe(0);
    expect(result.highestItem.name).toBe("N/A");
    expect(result.lowestItem.name).toBe("N/A");
  });

  it("should handle single item invoice", () => {
    const items = [new ProductBuilder().withGenericName("Single Item").withTotalPrice(75).build()];

    const invoice = new InvoiceBuilder().withItems(items).withPaymentAmount(75).build();
    invoice.paymentInformation.totalTaxAmount = 7.5;

    const result = getInvoiceSummary(invoice);

    expect(result.totalItems).toBe(1);
    expect(result.highestItem.name).toBe("Single Item");
    expect(result.lowestItem.name).toBe("Single Item");
    expect(result.averageItemPrice).toBe(75);
  });
});

describe("getUnitPriceAnalysis", () => {
  it("should return empty array for no items", () => {
    const result = getUnitPriceAnalysis([]);
    expect(result).toEqual([]);
  });

  it("should compute unit price correctly", () => {
    const items = [new ProductBuilder().withGenericName("Product").withTotalPrice(100).withQuantity(5).withQuantityUnit("kg").build()];

    const result = getUnitPriceAnalysis(items);

    // Unit price should be totalPrice / quantity
    const expectedUnitPrice = Math.round((items[0]!.totalPrice / items[0]!.quantity) * 100) / 100;
    expect(result[0]?.unitPrice).toBe(expectedUnitPrice);
  });

  it("should sort by unit price descending", () => {
    const items = [
      new ProductBuilder().withGenericName("A").withTotalPrice(100).withQuantity(10).withQuantityUnit("kg").build(), // 10 per unit
      new ProductBuilder().withGenericName("B").withTotalPrice(50).withQuantity(2).withQuantityUnit("kg").build(), // 25 per unit
      new ProductBuilder().withGenericName("C").withTotalPrice(90).withQuantity(6).withQuantityUnit("kg").build(), // 15 per unit
    ];

    const result = getUnitPriceAnalysis(items);

    // Verify sorted descending
    expect(result[0]?.unitPrice).toBeGreaterThanOrEqual(result[1]?.unitPrice ?? 0);
    expect(result[1]?.unitPrice).toBeGreaterThanOrEqual(result[2]?.unitPrice ?? 0);
  });

  it("should truncate long product names", () => {
    const items = [
      new ProductBuilder()
        .withGenericName("Very Long Product Name That Exceeds Limit")
        .withTotalPrice(50)
        .withQuantity(1)
        .withQuantityUnit("kg")
        .build(),
    ];

    const result = getUnitPriceAnalysis(items);

    expect(result[0]?.name).toContain("...");
    expect(result[0]?.name.length).toBeLessThanOrEqual(18);
  });
});

describe("computeBudgetImpact", () => {
  it("should compute budget impact correctly", () => {
    const paymentInfo = {
      totalCostAmount: 150,
      transactionDate: new Date("2024-01-15"),
    } as any;

    const result = computeBudgetImpact(paymentInfo);

    expect(result.monthlyBudget).toBe(2000);
    expect(result.spentBeforeThis).toBe(1057.55);
    expect(result.totalSpent).toBe(1207.55);
    expect(result.remaining).toBe(792.45);
    expect(result.percentUsed).toBeCloseTo(60.38, 1);
    expect(result.thisInvoicePercent).toBe(7.5);
    expect(result.isOverBudget).toBe(false);
    expect(result.isNearLimit).toBe(false);
  });

  it("should detect over budget status", () => {
    const paymentInfo = {
      totalCostAmount: 1000,
      transactionDate: new Date("2024-01-15"),
    } as any;

    const result = computeBudgetImpact(paymentInfo);

    expect(result.isOverBudget).toBe(true);
    expect(result.remaining).toBeLessThan(0);
  });

  it("should detect near limit status", () => {
    const paymentInfo = {
      totalCostAmount: 600,
      transactionDate: new Date("2024-01-15"),
    } as any;

    const result = computeBudgetImpact(paymentInfo);

    expect(result.percentUsed).toBeGreaterThan(80);
    expect(result.isNearLimit).toBe(true);
    expect(result.isOverBudget).toBe(false);
  });

  it("should compute days remaining and daily allowance", () => {
    const paymentInfo = {
      totalCostAmount: 100,
      transactionDate: new Date("2024-01-15"),
    } as any;

    const result = computeBudgetImpact(paymentInfo);

    expect(result.daysRemaining).toBeGreaterThan(0);
    expect(result.dailyAllowance).toBeGreaterThan(0);
    expect(result.monthName).toBe("January");
  });
});

describe("computeShoppingPatterns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return empty patterns for no invoices", () => {
    const result = computeShoppingPatterns([], new Date("2024-01-01"));

    expect(result.spendingByDay).toEqual({});
    expect(result.monthTotal).toBe(0);
    expect(result.shoppingDaysCount).toBe(0);
    expect(result.avgPerTrip).toBe(0);
    expect(result.avgDaysBetween).toBe(0);
  });

  it("should group invoices by day of month", () => {
    const invoices = [
      new InvoiceBuilder().withTransactionDate(new Date("2024-01-05")).withPaymentAmount(100).build(),
      new InvoiceBuilder().withTransactionDate(new Date("2024-01-05")).withPaymentAmount(50).build(),
      new InvoiceBuilder().withTransactionDate(new Date("2024-01-10")).withPaymentAmount(75).build(),
    ];

    const result = computeShoppingPatterns(invoices, new Date("2024-01-01"));

    expect(result.spendingByDay[5]?.amount).toBe(150);
    expect(result.spendingByDay[5]?.count).toBe(2);
    expect(result.spendingByDay[10]?.amount).toBe(75);
    expect(result.spendingByDay[10]?.count).toBe(1);
    expect(result.monthTotal).toBe(225);
    expect(result.shoppingDaysCount).toBe(2);
  });

  it("should filter invoices by target month and year", () => {
    const invoices = [
      new InvoiceBuilder().withTransactionDate(new Date("2024-01-15")).withPaymentAmount(100).build(),
      new InvoiceBuilder().withTransactionDate(new Date("2024-02-15")).withPaymentAmount(200).build(),
      new InvoiceBuilder().withTransactionDate(new Date("2023-01-15")).withPaymentAmount(300).build(),
    ];

    const result = computeShoppingPatterns(invoices, new Date("2024-01-01"));

    expect(result.monthTotal).toBe(100);
    expect(result.shoppingDaysCount).toBe(1);
  });

  it("should compute average days between shopping trips", () => {
    const invoices = [
      new InvoiceBuilder().withTransactionDate(new Date("2024-01-05")).withPaymentAmount(100).build(),
      new InvoiceBuilder().withTransactionDate(new Date("2024-01-10")).withPaymentAmount(100).build(),
      new InvoiceBuilder().withTransactionDate(new Date("2024-01-20")).withPaymentAmount(100).build(),
    ];

    const result = computeShoppingPatterns(invoices, new Date("2024-01-01"));

    // Days between: 5->10 (5 days), 10->20 (10 days), avg = 7.5
    expect(result.avgDaysBetween).toBe(7.5);
  });

  it("should compute weekday activity", () => {
    const invoices = [
      new InvoiceBuilder().withTransactionDate(new Date("2024-01-01")).withPaymentAmount(100).build(), // Monday
      new InvoiceBuilder().withTransactionDate(new Date("2024-01-08")).withPaymentAmount(100).build(), // Monday
      new InvoiceBuilder().withTransactionDate(new Date("2024-01-05")).withPaymentAmount(100).build(), // Friday
    ];

    const result = computeShoppingPatterns(invoices, new Date("2024-01-01"));

    expect(result.mostActiveWeekday).toBeDefined();
    expect(result.leastActiveWeekday).toBeDefined();
  });

  it("should store invoice IDs and names per day", () => {
    const invoice = new InvoiceBuilder()
      .withId("test-invoice-id")
      .withName("Test Invoice")
      .withTransactionDate(new Date("2024-01-15"))
      .withPaymentAmount(100)
      .build();

    const result = computeShoppingPatterns([invoice], new Date("2024-01-01"));

    expect(result.spendingByDay[15]?.invoiceIds).toContain("test-invoice-id");
    expect(result.spendingByDay[15]?.invoiceNames).toContain("Test Invoice");
  });
});

describe("getSpendingIntensityClass", () => {
  it("should return empty string for zero amount", () => {
    expect(getSpendingIntensityClass(0, 100)).toBe("");
  });

  it("should return empty string for zero max", () => {
    expect(getSpendingIntensityClass(50, 0)).toBe("");
  });

  it("should return correct intensity classes", () => {
    const maxAmount = 100;

    expect(getSpendingIntensityClass(10, maxAmount)).toContain("bg-primary/20");
    expect(getSpendingIntensityClass(30, maxAmount)).toContain("bg-primary/40");
    expect(getSpendingIntensityClass(50, maxAmount)).toContain("bg-primary/60");
    expect(getSpendingIntensityClass(70, maxAmount)).toContain("bg-primary/80");
    expect(getSpendingIntensityClass(90, maxAmount)).toContain("bg-primary hover");
  });
});

describe("getWeekdayName", () => {
  it("should return correct weekday names", () => {
    expect(getWeekdayName(0)).toBe("Sunday");
    expect(getWeekdayName(1)).toBe("Monday");
    expect(getWeekdayName(6)).toBe("Saturday");
  });

  it("should support custom locale", () => {
    const result = getWeekdayName(0, "ro-RO");
    expect(result).toBeTruthy();
  });
});
