import {describe, expect, it} from "vitest";
import {topProductsBySpend} from "./topProductsBySpend";
import {singleCurrencyFixture} from "./__fixtures__/single-currency.fixtures";
import {EMPTY_INVOICES} from "./__fixtures__/empty.fixtures";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("topProductsBySpend", () => {
  it("empty marker on empty input", () => {
    expect(topProductsBySpend(EMPTY_INVOICES, {timeframe: "all-time", topK: 5}, NOW).kind).toBe("empty");
  });

  it("returns top-K products by total spend per currency, sorted desc", () => {
    const result = topProductsBySpend(singleCurrencyFixture(NOW), {timeframe: "all-time", topK: 5}, NOW);
    if (result.kind === "populated") {
      const eurBuckets = result.buckets.filter((b) => b.currency === "EUR");
      expect(eurBuckets.length).toBeGreaterThan(0);
      for (let i = 1; i < eurBuckets.length; i++) {
        expect(eurBuckets[i]!.totalSpend).toBeLessThanOrEqual(eurBuckets[i - 1]!.totalSpend);
      }
    }
  });
});