/**
 * @fileoverview Edge-case tests for analytics utilities using the real currency module (RON-only fixtures).
 */

import {InvoiceBuilder, ProductBuilder} from "@/data/mocks";
import type {Invoice, Product} from "@/types/invoices";
import {ClassificationOrigin, ClassificationSystem, type StandardClassification} from "@/types/invoices/Classification";
import {describe, expect, it} from "vitest";
import {computeShoppingPatterns, getClassificationGroupComparison, getComparisonStats} from "./analytics";

const FOOD_CLASS: StandardClassification = {
  system: ClassificationSystem.Gs1Gpc,
  code: "50000000",
  officialLabel: "Food/Beverage",
  version: "2026-05",
  hierarchy: [{level: "segment", code: "50000000", officialLabel: "Food/Beverage"}],
  origin: ClassificationOrigin.Analysis,
  confidence: 0.9,
  evidence: [],
};

function ronInvoice(id: string, amount: number, items: Product[] = []): Invoice {
  return new InvoiceBuilder()
    .withId(id)
    .withCreatedAt(new Date("2024-01-15T12:00:00"))
    .withTransactionDate(new Date("2024-01-15T12:00:00"))
    .withPaymentAmount(amount)
    .withPaymentCurrency("RON")
    .withItems(items)
    .build();
}

describe("getComparisonStats — no other invoices", () => {
  it("falls back to the current invoice values when every cached invoice is the current one", () => {
    const items = [new ProductBuilder().withTotalPrice(10).build(), new ProductBuilder().withTotalPrice(20).build()];
    const current = ronInvoice("same", 100, items);

    const stats = getComparisonStats(current, [current, current]);

    expect(stats.totalInvoices).toBe(2);
    expect(stats.averageAmount).toBe(100);
    expect(stats.minAmount).toBe(100);
    expect(stats.maxAmount).toBe(100);
    expect(stats.percentageDiff).toBe(0);
    expect(stats.isAboveAverage).toBe(false);
    expect(stats.averageItemCount).toBe(2);
    expect(stats.itemCountDiff).toBe(0);
  });

  it("reports a zero percentage difference when the current invoice amount is zero", () => {
    const current = ronInvoice("zero", 0);

    const stats = getComparisonStats(current, [current, current]);

    expect(stats.averageAmount).toBe(0);
    expect(stats.percentageDiff).toBe(0);
    expect(stats.isAboveAverage).toBe(false);
  });

  it("contrasts with a real comparison when another invoice exists", () => {
    const current = ronInvoice("current", 300);
    const other = ronInvoice("other", 100);

    const stats = getComparisonStats(current, [current, other]);

    expect(stats.averageAmount).toBe(100);
    expect(stats.percentageDiff).toBe(200);
    expect(stats.isAboveAverage).toBe(true);
  });

  it("counts an other invoice with null items as zero items", () => {
    const items = [new ProductBuilder().withTotalPrice(10).build(), new ProductBuilder().withTotalPrice(20).build()];
    const current = ronInvoice("current", 100, items);
    // Documented cast: the API may deliver null items despite the static type.
    const nullItems = {...ronInvoice("null-items", 50), items: null} as unknown as Invoice;

    const stats = getComparisonStats(current, [current, nullItems]);

    expect(stats.averageItemCount).toBe(0);
    expect(stats.itemCountDiff).toBe(0);
    expect(stats.averageAmount).toBe(50);
  });
});

describe("getClassificationGroupComparison — unclassified items", () => {
  it("groups unclassified items in the current and other invoices under 'unclassified'", () => {
    const current = ronInvoice("current", 40, [new ProductBuilder().withTotalPrice(40).build()]);
    const other = ronInvoice("other", 20, [new ProductBuilder().withTotalPrice(20).build()]);

    const result = getClassificationGroupComparison(current, [current, other]);

    expect(result).toEqual([{category: "unclassified", current: 40, average: 20}]);
  });

  it("keeps classified and unclassified groups apart", () => {
    const current = ronInvoice("current", 50, [
      new ProductBuilder().withClassification(FOOD_CLASS).withTotalPrice(30).build(),
      new ProductBuilder().withTotalPrice(20).build(),
    ]);
    const other = ronInvoice("other", 10, [new ProductBuilder().withTotalPrice(10).build()]);

    const result = getClassificationGroupComparison(current, [current, other]);

    expect(result.find((entry) => entry.category === "Food/Beverage")).toEqual({category: "Food/Beverage", current: 30, average: 0});
    expect(result.find((entry) => entry.category === "unclassified")).toEqual({category: "unclassified", current: 20, average: 10});
  });
});

describe("computeShoppingPatterns — invalid transaction dates", () => {
  it("ignores an invoice with an invalid transaction date in every metric and keeps the weekday defaults", () => {
    const invalid = new InvoiceBuilder().withId("invalid").withTransactionDate(new Date(Number.NaN)).withPaymentAmount(80).build();

    const result = computeShoppingPatterns([invalid], new Date("2024-01-15T12:00:00"));

    expect(result.monthTotal).toBe(0);
    expect(result.shoppingDaysCount).toBe(0);
    expect(result.spendingByDay).toEqual({});
    expect(result.historicalByDay).toEqual({});
    expect(result.avgDaysBetween).toBe(0);
    expect(result.avgPerTrip).toBe(0);
    expect(result.mostActiveWeekday).toBe(0);
    expect(result.leastActiveWeekday).toBe(0);
  });
});
