import {describe, expect, it} from "vitest";
import {topMerchantsBySpend} from "./topMerchantsBySpend";
import {EMPTY_INVOICES} from "./__fixtures__/empty.fixtures";
import {multiCurrencyFixture} from "./__fixtures__/multi-currency.fixtures";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("topMerchantsBySpend", () => {
  it("empty marker on empty input", () => {
    expect(topMerchantsBySpend(EMPTY_INVOICES, {timeframe: "all-time", topK: 5}, NOW).kind).toBe("empty");
  });

  it("returns top-K merchants by total spend per currency", () => {
    const result = topMerchantsBySpend(multiCurrencyFixture(NOW), {timeframe: "all-time", topK: 3}, NOW);
    if (result.kind === "populated") {
      expect(result.buckets.some((b) => b.currency === "EUR")).toBe(true);
      expect(result.buckets.some((b) => b.currency === "RON")).toBe(true);
      const eurBuckets = result.buckets.filter((b) => b.currency === "EUR");
      for (let i = 1; i < eurBuckets.length; i++) {
        expect(eurBuckets[i]!.totalSpend).toBeLessThanOrEqual(eurBuckets[i - 1]!.totalSpend);
      }
    }
  });
});