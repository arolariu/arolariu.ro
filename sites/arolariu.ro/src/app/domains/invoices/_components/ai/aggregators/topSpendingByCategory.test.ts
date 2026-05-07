import {describe, expect, it} from "vitest";
import {topSpendingByCategory} from "./topSpendingByCategory";
import {EMPTY_INVOICES} from "./__fixtures__/empty.fixtures";
import {singleCurrencyFixture} from "./__fixtures__/single-currency.fixtures";
import {multiCurrencyFixture} from "./__fixtures__/multi-currency.fixtures";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("topSpendingByCategory", () => {
  it("returns empty marker on empty input", () => {
    expect(topSpendingByCategory(EMPTY_INVOICES, {timeframe: "all-time", topK: 5}, NOW)).toEqual({kind: "empty", timeframe: "all-time"});
  });

  it("returns top-K category buckets sorted desc by totalSpend", () => {
    const result = topSpendingByCategory(singleCurrencyFixture(NOW), {timeframe: "all-time", topK: 5}, NOW);
    expect(result.kind).toBe("populated");
    if (result.kind === "populated") {
      expect(result.buckets.length).toBeLessThanOrEqual(5);
      const eurBuckets = result.buckets.filter((b) => b.currency === "EUR");
      for (let i = 1; i < eurBuckets.length; i++) {
        expect(eurBuckets[i]!.totalSpend).toBeLessThanOrEqual(eurBuckets[i - 1]!.totalSpend);
      }
    }
  });

  it("respects topK clamp", () => {
    const result = topSpendingByCategory(singleCurrencyFixture(NOW), {timeframe: "all-time", topK: 2}, NOW);
    if (result.kind === "populated") {
      const eurBuckets = result.buckets.filter((b) => b.currency === "EUR");
      expect(eurBuckets.length).toBeLessThanOrEqual(2);
    }
  });

  it("splits multi-currency, per-currency top-K", () => {
    const result = topSpendingByCategory(multiCurrencyFixture(NOW), {timeframe: "all-time", topK: 3}, NOW);
    if (result.kind === "populated") {
      expect(result.buckets.some((b) => b.currency === "EUR")).toBe(true);
      expect(result.buckets.some((b) => b.currency === "RON")).toBe(true);
    }
  });
});