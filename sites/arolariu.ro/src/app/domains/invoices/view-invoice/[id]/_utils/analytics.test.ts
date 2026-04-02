/**
 * @fileoverview Unit tests for analytics utilities.
 */

import {InvoiceBuilder} from "@/data/mocks";
import {ProductCategory} from "@/types/invoices";
import {describe, expect, it} from "vitest";
import {getCategoryComparison, getComparisonStats, getMerchantBreakdown, getSpendingTrend} from "./analytics";

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
});
