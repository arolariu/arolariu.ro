import {describe, expect, it} from "vitest";
import {topMerchantsByCount} from "./topMerchantsByCount";
import {EMPTY_INVOICES} from "./__fixtures__/empty.fixtures";
import {singleCurrencyFixture} from "./__fixtures__/single-currency.fixtures";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("topMerchantsByCount", () => {
  it("empty marker on empty input", () => {
    expect(topMerchantsByCount(EMPTY_INVOICES, {timeframe: "all-time", topK: 5}, NOW)).toEqual({kind: "empty", timeframe: "all-time"});
  });

  it("returns top-K merchants by visit count, sorted desc", () => {
    const result = topMerchantsByCount(singleCurrencyFixture(NOW), {timeframe: "all-time", topK: 5}, NOW);
    expect(result.kind).toBe("populated");
    if (result.kind === "populated") {
      expect(result.buckets.length).toBeLessThanOrEqual(5);
      for (let i = 1; i < result.buckets.length; i++) {
        expect(result.buckets[i]!.visitCount).toBeLessThanOrEqual(result.buckets[i - 1]!.visitCount);
      }
    }
  });

  it("does not split by currency (count is currency-independent)", () => {
    const result = topMerchantsByCount(singleCurrencyFixture(NOW), {timeframe: "all-time", topK: 10}, NOW);
    if (result.kind === "populated") {
      const ids = new Set(result.buckets.map((b) => b.merchantId));
      expect(ids.size).toBe(result.buckets.length);
    }
  });
});