import {describe, expect, it} from "vitest";
import {categoryBreakdown} from "./categoryBreakdown";
import {EMPTY_INVOICES} from "./__fixtures__/empty.fixtures";
import {singleCurrencyFixture} from "./__fixtures__/single-currency.fixtures";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("categoryBreakdown", () => {
  it("empty marker on empty input", () => {
    expect(categoryBreakdown(EMPTY_INVOICES, {timeframe: "all-time"}, NOW).kind).toBe("empty");
  });

  it("returns categories with percent-of-total summing to ~100", () => {
    const result = categoryBreakdown(singleCurrencyFixture(NOW), {timeframe: "all-time"}, NOW);
    if (result.kind === "populated") {
      const eurBuckets = result.buckets.filter((b) => b.currency === "EUR");
      const totalPct = eurBuckets.reduce((s, b) => s + b.percentOfTotal, 0);
      expect(totalPct).toBeCloseTo(100, 0);
    }
  });

  it("sorts buckets desc by spend within each currency", () => {
    const result = categoryBreakdown(singleCurrencyFixture(NOW), {timeframe: "all-time"}, NOW);
    if (result.kind === "populated") {
      const eurBuckets = result.buckets.filter((b) => b.currency === "EUR");
      for (let i = 1; i < eurBuckets.length; i++) {
        expect(eurBuckets[i]!.spend).toBeLessThanOrEqual(eurBuckets[i - 1]!.spend);
      }
    }
  });
});