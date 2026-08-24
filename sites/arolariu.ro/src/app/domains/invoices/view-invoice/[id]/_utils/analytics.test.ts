/**
 * @fileoverview Unit tests for analytics utilities.
 */

import {InvoiceBuilder, ProductBuilder} from "@/data/mocks";
import {ClassificationOrigin, ClassificationSystem, type StandardClassification} from "@/types/invoices/Classification";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {
  computeBudgetImpact,
  computeShoppingPatterns,
  getClassificationGroupComparison,
  getClassificationGroupSpending,
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

// ---------------------------------------------------------------------------
// Classification helpers for analytics tests
// ---------------------------------------------------------------------------

function makeTestClassification(rootLabel: string, code: string = "50000000"): StandardClassification {
  return {
    system: ClassificationSystem.Gs1Gpc,
    code,
    officialLabel: rootLabel,
    version: "2026-05",
    hierarchy: [{level: "segment", code, officialLabel: rootLabel}],
    origin: ClassificationOrigin.Analysis,
    confidence: 0.9,
    evidence: [],
  };
}

const FOOD_CLASS = makeTestClassification("Food/Beverage");
const CLEANING_CLASS = makeTestClassification("Cleaning/Hygiene Products");

describe("getClassificationGroupSpending — color cycling", () => {
  it("should assign chart colors cycling over CHART_COLORS", () => {
    const items = [
      new ProductBuilder().withClassification(FOOD_CLASS).withTotalPrice(25).build(),
    ];

    const result = getClassificationGroupSpending(items);

    expect(result).toHaveLength(1);
    expect(result[0]?.fill).toContain("var(--ac-chart-");
  });
});

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

  it("should include invoice details in the invoices array", () => {
    const invoice1 = new InvoiceBuilder()
      .withId("inv1")
      .withName("Grocery Shopping")
      .withTransactionDate(new Date("2024-01-15"))
      .withPaymentAmount(100)
      .withPaymentCurrency("RON")
      .build();

    const invoice2 = new InvoiceBuilder()
      .withId("inv2")
      .withName("Pharmacy")
      .withTransactionDate(new Date("2024-01-20"))
      .withPaymentAmount(50)
      .withPaymentCurrency("RON")
      .build();

    const invoice3 = new InvoiceBuilder()
      .withId("inv3")
      .withName("Electronics")
      .withTransactionDate(new Date("2024-02-10"))
      .withPaymentAmount(200)
      .withPaymentCurrency("RON")
      .build();

    const result = getSpendingTrend(invoice1, [invoice1, invoice2, invoice3]);

    expect(result).toHaveLength(2);

    // Check January data
    expect(result[0]?.invoices).toHaveLength(2);
    expect(result[0]?.invoices[0]?.id).toBe("inv1");
    expect(result[0]?.invoices[0]?.name).toBe("Grocery Shopping");
    expect(result[0]?.invoices[0]?.amount).toBe(100);
    expect(result[0]?.invoices[1]?.id).toBe("inv2");
    expect(result[0]?.invoices[1]?.name).toBe("Pharmacy");
    expect(result[0]?.invoices[1]?.amount).toBe(50);

    // Check February data
    expect(result[1]?.invoices).toHaveLength(1);
    expect(result[1]?.invoices[0]?.id).toBe("inv3");
    expect(result[1]?.invoices[0]?.name).toBe("Electronics");
    expect(result[1]?.invoices[0]?.amount).toBe(200);
  });

  it("should generate fallback name for invoices without names", () => {
    const invoice1 = new InvoiceBuilder()
      .withId("abc12345678")
      .withName("")
      .withTransactionDate(new Date("2024-01-15"))
      .withPaymentAmount(100)
      .build();

    const invoice2 = new InvoiceBuilder().withId("inv2").withTransactionDate(new Date("2024-02-15")).withPaymentAmount(200).build();

    const result = getSpendingTrend(invoice1, [invoice1, invoice2]);

    expect(result[0]?.invoices[0]?.name).toBe("Invoice abc12345");
  });

  it("should fall back to createdAt when paymentInformation is missing on allInvoices entries", () => {
    // Lines 172-178: paymentInformation?.transactionDate ?? inv.createdAt,
    // paymentInformation?.totalCostAmount ?? 0, paymentInformation?.currency?.code ?? "RON"
    const invoice1 = new InvoiceBuilder()
      .withId("inv1")
      .withCreatedAt(new Date("2024-03-10"))
      .withTransactionDate(new Date("2024-03-10"))
      .withPaymentAmount(100)
      .withPaymentCurrency("RON")
      .build();

    const invoice2 = new InvoiceBuilder()
      .withId("inv2")
      .withCreatedAt(new Date("2024-03-20"))
      .withTransactionDate(new Date("2024-03-20"))
      .withPaymentAmount(50)
      .withPaymentCurrency("RON")
      .build();
    // Strip paymentInformation so optional chaining paths fire
    (invoice2 as any).paymentInformation = null;

    const result = getSpendingTrend(invoice1, [invoice1, invoice2]);

    // invoice2 has no paymentInformation: amount falls back to 0, currency to "RON",
    // date falls back to invoice2.createdAt (2024-03-20 → same month as invoice1)
    expect(result).toHaveLength(1);
    expect(result[0]?.date).toContain("Mar");
    // invoice2 contributes 0 (null paymentInformation → amount ?? 0)
    expect(result[0]?.amount).toBe(100);
  });

  it("should fall back to currentInvoice.createdAt when its paymentInformation is missing", () => {
    // Line 204: currentInvoice.paymentInformation?.transactionDate ?? currentInvoice.createdAt
    const invoice1 = new InvoiceBuilder()
      .withId("inv1")
      .withCreatedAt(new Date("2024-04-05"))
      .withTransactionDate(new Date("2024-04-05"))
      .withPaymentAmount(100)
      .withPaymentCurrency("RON")
      .build();

    const invoice2 = new InvoiceBuilder()
      .withId("current")
      .withCreatedAt(new Date("2024-04-15"))
      .withTransactionDate(new Date("2024-04-15"))
      .withPaymentAmount(200)
      .withPaymentCurrency("RON")
      .build();
    // Strip paymentInformation from the currentInvoice so line 204 uses createdAt
    (invoice2 as any).paymentInformation = null;

    const result = getSpendingTrend(invoice2, [invoice1, invoice2]);

    // Both are April — the current month key should match April (from createdAt fallback)
    expect(result).toHaveLength(1);
    expect(result[0]?.isCurrent).toBe(true);
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

  it("should use fallback values when current invoice paymentInformation is missing (lines 250-254)", () => {
    // Lines 250-254: currentInvoice.paymentInformation?.totalCostAmount ?? 0,
    // paymentInformation?.currency?.code ?? "RON", currentInvoice.items?.length ?? 0
    const currentInvoice = new InvoiceBuilder().withId("current").build();
    (currentInvoice as any).paymentInformation = null;
    (currentInvoice as any).items = null;

    const otherInvoice = new InvoiceBuilder().withId("other").withPaymentAmount(100).withPaymentCurrency("RON").build();

    // With fewer than 2 invoices (early-return path with fallback fields):
    const singleResult = getComparisonStats(currentInvoice, [currentInvoice]);
    expect(singleResult.currentAmount).toBe(0); // totalCostAmount ?? 0
    expect(singleResult.currentItemCount).toBe(0); // items?.length ?? 0
    expect(singleResult.totalInvoices).toBe(1);

    // With 2+ invoices, currentAmountInRON still uses the fallbacks
    const multiResult = getComparisonStats(currentInvoice, [currentInvoice, otherInvoice]);
    expect(multiResult.currentAmount).toBe(0);
    expect(multiResult.currentItemCount).toBe(0);
  });

  it("should handle missing paymentInformation on other invoices (lines 278-293)", () => {
    // Lines 278-293: amounts map with optional chaining on other invoices
    const currentInvoice = new InvoiceBuilder().withId("current").withPaymentAmount(150).withPaymentCurrency("RON").build();

    const otherInvoice1 = new InvoiceBuilder().withId("other1").withPaymentAmount(100).withPaymentCurrency("RON").build();
    const otherInvoice2 = new InvoiceBuilder().withId("other2").withPaymentAmount(200).withPaymentCurrency("RON").build();
    // Strip paymentInformation from other2 so optional chaining fires
    (otherInvoice2 as any).paymentInformation = null;

    const result = getComparisonStats(currentInvoice, [currentInvoice, otherInvoice1, otherInvoice2]);

    // other2 contributes 0 (amount ?? 0); only other1's 100 counts
    // averageAmount = (100 + 0) / 2 = 50
    expect(result.averageAmount).toBe(50);
    // minAmount and maxAmount from [100, 0]
    expect(result.minAmount).toBe(0);
    expect(result.maxAmount).toBe(100);
  });

  it("should handle missing paymentInformation on same-merchant invoices (lines 305-312)", () => {
    // Lines 305-312: sameMerchantAmounts map with optional chaining
    const currentInvoice = new InvoiceBuilder()
      .withId("current")
      .withMerchantReference("merchant-x")
      .withPaymentAmount(200)
      .withPaymentCurrency("RON")
      .build();

    const sameMerchantInvoice = new InvoiceBuilder()
      .withId("same")
      .withMerchantReference("merchant-x")
      .withPaymentAmount(100)
      .withPaymentCurrency("RON")
      .build();
    // Strip paymentInformation so the optional chaining on line 305-308 fires
    (sameMerchantInvoice as any).paymentInformation = null;

    const differentMerchant = new InvoiceBuilder()
      .withId("diff")
      .withMerchantReference("merchant-y")
      .withPaymentAmount(50)
      .withPaymentCurrency("RON")
      .build();

    const result = getComparisonStats(currentInvoice, [currentInvoice, sameMerchantInvoice, differentMerchant]);

    // sameMerchantInvoice has null paymentInformation → amount ?? 0, currency ?? "RON"
    // sameMerchantAvg = 0 (only same-merchant invoice has 0 amount)
    expect(result.sameMerchantAvg).toBe(0);
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

    // Invoices without valid merchantReference are now filtered out
    expect(result).toHaveLength(0);
  });

  it("should normalize amounts to RON", () => {
    const invoice1 = new InvoiceBuilder().withMerchantReference("merchant-a").withPaymentAmount(100).withPaymentCurrency("EUR").build();

    const invoice2 = new InvoiceBuilder().withMerchantReference("merchant-a").withPaymentAmount(100).withPaymentCurrency("USD").build();

    const result = getMerchantBreakdown([invoice1, invoice2]);

    // EUR: 100 * 5 = 500, USD: 100 * 4.5 = 450, total = 950
    expect(result[0]?.total).toBe(950);
    expect(result[0]?.average).toBe(475);
  });

  it("should filter out invoices with EMPTY_GUID merchant reference", () => {
    const emptyGuidInvoice = new InvoiceBuilder()
      .withMerchantReference("00000000-0000-0000-0000-000000000000")
      .withPaymentAmount(100)
      .withPaymentCurrency("RON")
      .build();

    const validInvoice = new InvoiceBuilder()
      .withMerchantReference("merchant-valid")
      .withPaymentAmount(200)
      .withPaymentCurrency("RON")
      .build();

    const result = getMerchantBreakdown([emptyGuidInvoice, validInvoice]);

    // Only merchant-valid should appear; EMPTY_GUID invoice is filtered
    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe("merchant-valid");
  });

  it("should use fallback amount/currency when paymentInformation is missing (lines 362-363)", () => {
    // Lines 362-363: inv.paymentInformation?.totalCostAmount ?? 0 and currency?.code ?? "RON"
    const invoiceWithoutPayment = new InvoiceBuilder()
      .withMerchantReference("merchant-nopay")
      .withPaymentAmount(100)
      .withPaymentCurrency("RON")
      .build();
    (invoiceWithoutPayment as any).paymentInformation = null;

    const result = getMerchantBreakdown([invoiceWithoutPayment]);

    // amount ?? 0 → total = 0, currency ?? "RON" (still RON, toRON(0, "RON", year) = 0)
    expect(result).toHaveLength(1);
    expect(result[0]?.total).toBe(0);
    expect(result[0]?.average).toBe(0);
  });
});

describe("getClassificationGroupComparison", () => {
  it("should return empty array if current invoice has no items", () => {
    const invoice = new InvoiceBuilder().withItems([]).build();
    const result = getClassificationGroupComparison(invoice, [invoice]);
    expect(result).toEqual([]);
  });

  it("should compare current invoice classification groups to historical averages", () => {
    const currentInvoice = new InvoiceBuilder()
      .withId("current")
      .withItems([
        {classification: FOOD_CLASS, totalPrice: 50} as any,
        {classification: CLEANING_CLASS, totalPrice: 100} as any,
      ])
      .build();

    const historicalInvoice = new InvoiceBuilder()
      .withId("historical")
      .withItems([
        {classification: FOOD_CLASS, totalPrice: 30} as any,
        {classification: CLEANING_CLASS, totalPrice: 60} as any,
      ])
      .build();

    const result = getClassificationGroupComparison(currentInvoice, [currentInvoice, historicalInvoice]);

    expect(result).toHaveLength(2);
    // Should be sorted by current amount descending
    expect(result[0]?.category).toBe("Cleaning/Hygiene Products");
    expect(result[0]?.current).toBe(100);
    expect(result[0]?.average).toBe(60);

    expect(result[1]?.category).toBe("Food/Beverage");
    expect(result[1]?.current).toBe(50);
    expect(result[1]?.average).toBe(30);
  });

  it("should handle group with no historical data", () => {
    const currentInvoice = new InvoiceBuilder()
      .withId("current")
      .withItems([{classification: FOOD_CLASS, totalPrice: 75} as any])
      .build();

    const historicalInvoice = new InvoiceBuilder()
      .withId("historical")
      .withItems([{classification: CLEANING_CLASS, totalPrice: 30} as any])
      .build();

    const result = getClassificationGroupComparison(currentInvoice, [currentInvoice, historicalInvoice]);

    expect(result).toHaveLength(1);
    expect(result[0]?.category).toBe("Food/Beverage");
    expect(result[0]?.current).toBe(75);
    expect(result[0]?.average).toBe(0);
  });

  it("should use fallback empty array when currentInvoice.items is null", () => {
    const invoice = new InvoiceBuilder().withId("current").build();
    (invoice as any).items = null;

    const result = getClassificationGroupComparison(invoice, [invoice]);

    expect(result).toEqual([]);
  });

  it("should use fallback empty array when other invoice items are null", () => {
    const currentInvoice = new InvoiceBuilder()
      .withId("current")
      .withItems([{classification: FOOD_CLASS, totalPrice: 40} as any])
      .build();

    const otherInvoice = new InvoiceBuilder().withId("other").withPaymentAmount(50).build();
    (otherInvoice as any).items = null;

    const result = getClassificationGroupComparison(currentInvoice, [currentInvoice, otherInvoice]);

    expect(result).toHaveLength(1);
    expect(result[0]?.category).toBe("Food/Beverage");
    expect(result[0]?.current).toBe(40);
    expect(result[0]?.average).toBe(0);
  });
});

describe("getClassificationGroupSpending", () => {
  it("should return empty array for no items", () => {
    const result = getClassificationGroupSpending([]);
    expect(result).toEqual([]);
  });

  it("should group items by classification group and compute totals", () => {
    const items = [
      new ProductBuilder().withClassification(FOOD_CLASS).withTotalPrice(50).build(),
      new ProductBuilder().withClassification(FOOD_CLASS).withTotalPrice(30).build(),
      new ProductBuilder().withClassification(CLEANING_CLASS).withTotalPrice(100).build(),
    ];

    const result = getClassificationGroupSpending(items);

    expect(result).toHaveLength(2);
    expect(result[0]?.category).toBe("Cleaning/Hygiene Products");
    expect(result[0]?.amount).toBe(100);
    expect(result[0]?.count).toBe(1);
    expect(result[1]?.category).toBe("Food/Beverage");
    expect(result[1]?.amount).toBe(80);
    expect(result[1]?.count).toBe(2);
  });

  it("should sort by amount descending", () => {
    const items = [
      new ProductBuilder().withClassification(FOOD_CLASS).withTotalPrice(30).build(),
      new ProductBuilder().withClassification(CLEANING_CLASS).withTotalPrice(100).build(),
      new ProductBuilder().withClassification(null).withTotalPrice(50).build(),
    ];

    const result = getClassificationGroupSpending(items);

    expect(result[0]?.amount).toBe(100);
    expect(result[1]?.amount).toBe(50);
    expect(result[2]?.amount).toBe(30);
  });

  it("should assign fill colors from the cycling palette", () => {
    const items = [new ProductBuilder().withClassification(FOOD_CLASS).withTotalPrice(50).build()];

    const result = getClassificationGroupSpending(items);

    expect(result[0]?.fill).toBeDefined();
    expect(result[0]?.fill).toContain("var(--ac-chart-");
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
        .withName(`Product ${i}`)
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
    const items = [new ProductBuilder().withName("Very Long Product Name Here").withTotalPrice(50).build()];

    const result = getQuantityAnalysis(items);

    expect(result[0]?.name).toContain("...");
    expect(result[0]?.name.length).toBeLessThanOrEqual(15);
  });

  it("should include quantity and unit", () => {
    const items = [new ProductBuilder().withName("Product A").withQuantity(2.5).withQuantityUnit("kg").withTotalPrice(50).build()];

    const result = getQuantityAnalysis(items);

    expect(result[0]?.quantity).toBe(2.5);
    expect(result[0]?.unit).toBe("kg");
  });
});

describe("getInvoiceSummary", () => {
  it("should compute summary statistics correctly", () => {
    const items = [
      new ProductBuilder().withClassification(makeTestClassification("Dairy", "50130000")).withTotalPrice(50).withName("Milk").build(),
      new ProductBuilder().withClassification(makeTestClassification("Meat", "50230000")).withTotalPrice(100).withName("Beef").build(),
      new ProductBuilder().withClassification(makeTestClassification("Fruits", "50100000")).withTotalPrice(30).withName("Apples").build(),
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
    const items = [new ProductBuilder().withName("Single Item").withTotalPrice(75).build()];

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
    const items = [new ProductBuilder().withName("Product").withTotalPrice(100).withQuantity(5).withQuantityUnit("kg").build()];

    const result = getUnitPriceAnalysis(items);

    // Unit price should be totalPrice / quantity
    const expectedUnitPrice = Math.round((items[0]!.totalPrice / items[0]!.quantity) * 100) / 100;
    expect(result[0]?.unitPrice).toBe(expectedUnitPrice);
  });

  it("should sort by unit price descending", () => {
    const items = [
      new ProductBuilder().withName("A").withTotalPrice(100).withQuantity(10).withQuantityUnit("kg").build(), // 10 per unit
      new ProductBuilder().withName("B").withTotalPrice(50).withQuantity(2).withQuantityUnit("kg").build(), // 25 per unit
      new ProductBuilder().withName("C").withTotalPrice(90).withQuantity(6).withQuantityUnit("kg").build(), // 15 per unit
    ];

    const result = getUnitPriceAnalysis(items);

    // Verify sorted descending
    expect(result[0]?.unitPrice).toBeGreaterThanOrEqual(result[1]?.unitPrice ?? 0);
    expect(result[1]?.unitPrice).toBeGreaterThanOrEqual(result[2]?.unitPrice ?? 0);
  });

  it("should truncate long product names", () => {
    const items = [
      new ProductBuilder()
        .withName("Very Long Product Name That Exceeds Limit")
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

  it("should compute historical comparison when prior-year same-month invoices exist (lines 618-649)", () => {
    // This exercises computeHistoricalComparison's inner block:
    // when `historical && historical.years.size > 0` is true.
    // We need current-month invoices (Jan 2024) and prior-year same-month invoices (Jan 2023).
    const currentMonthInvoice = new InvoiceBuilder()
      .withId("cur-jan-2024")
      .withName("Jan 2024 Shopping")
      .withTransactionDate(new Date("2024-01-10"))
      .withPaymentAmount(150)
      .build();

    // Historical: January 2023, same day-of-month (10th) → should create comparison
    const priorYearInvoice = new InvoiceBuilder()
      .withId("hist-jan-2023")
      .withName("Jan 2023 Shopping")
      .withTransactionDate(new Date("2023-01-10"))
      .withPaymentAmount(100)
      .build();

    const allInvoices = [currentMonthInvoice, priorYearInvoice];
    const result = computeShoppingPatterns(allInvoices, new Date("2024-01-01"));

    // Current month has spending on day 10
    expect(result.spendingByDay[10]?.amount).toBe(150);

    // historicalByDay should have an entry for day 10 (from priorYearInvoice)
    // meaning historicalByDay[10] is populated and the if-block at line 616 fires
    expect(result.historicalByDay[10]).toBeDefined();
    expect(result.historicalByDay[10]?.yearsWithData).toBe(1);
    expect(result.historicalByDay[10]?.historicalAverage).toBe(100);
    // current (150) > historical (100) → isAboveAverage = true
    expect(result.historicalByDay[10]?.isAboveAverage).toBe(true);
    // percentageDiff = (150-100)/100*100 = 50%
    expect(result.historicalByDay[10]?.percentageDiff).toBe(50);
  });

  it("should compute historicalAverage=0 percentageDiff=0 when prior-year amount is zero (line 618)", () => {
    // Exercise the ternary: percentageDiff = historicalAverage > 0 ? ... : 0
    const currentMonthInvoice = new InvoiceBuilder()
      .withId("cur-feb-2024")
      .withName("Feb 2024 Shopping")
      .withTransactionDate(new Date("2024-02-05"))
      .withPaymentAmount(80)
      .build();

    const priorYearZeroInvoice = new InvoiceBuilder()
      .withId("hist-feb-2023")
      .withName("Feb 2023 Shopping")
      .withTransactionDate(new Date("2023-02-05"))
      .withPaymentAmount(0)
      .build();

    const result = computeShoppingPatterns([currentMonthInvoice, priorYearZeroInvoice], new Date("2024-02-01"));

    // historicalAverage = 0 → percentageDiff = 0 (else branch of ternary)
    expect(result.historicalByDay[5]).toBeDefined();
    expect(result.historicalByDay[5]?.historicalAverage).toBe(0);
    expect(result.historicalByDay[5]?.percentageDiff).toBe(0);
  });

  it("should compute historical comparison with multiple prior years on same day", () => {
    // Verifies yearsWithData > 1 path through computeHistoricalComparison
    const currentMonthInvoice = new InvoiceBuilder()
      .withId("cur-mar-2024")
      .withName("Mar 2024")
      .withTransactionDate(new Date("2024-03-20"))
      .withPaymentAmount(200)
      .build();

    const year2022Invoice = new InvoiceBuilder()
      .withId("hist-mar-2022")
      .withName("Mar 2022")
      .withTransactionDate(new Date("2022-03-20"))
      .withPaymentAmount(80)
      .build();

    const year2023Invoice = new InvoiceBuilder()
      .withId("hist-mar-2023")
      .withName("Mar 2023")
      .withTransactionDate(new Date("2023-03-20"))
      .withPaymentAmount(120)
      .build();

    const result = computeShoppingPatterns([currentMonthInvoice, year2022Invoice, year2023Invoice], new Date("2024-03-01"));

    expect(result.historicalByDay[20]).toBeDefined();
    expect(result.historicalByDay[20]?.yearsWithData).toBe(2);
    // average = (80 + 120) / 2 = 100
    expect(result.historicalByDay[20]?.historicalAverage).toBe(100);
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

    expect(getSpendingIntensityClass(10, maxAmount)).toBe("intensity1");
    expect(getSpendingIntensityClass(30, maxAmount)).toBe("intensity2");
    expect(getSpendingIntensityClass(50, maxAmount)).toBe("intensity3");
    expect(getSpendingIntensityClass(70, maxAmount)).toBe("intensity4");
    expect(getSpendingIntensityClass(90, maxAmount)).toBe("intensity5");
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
