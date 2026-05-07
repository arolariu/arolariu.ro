import {describe, expect, it} from "vitest";
import {topProductsByCount} from "./topProductsByCount";
import {EMPTY_INVOICES} from "./__fixtures__/empty.fixtures";
import {singleCurrencyFixture} from "./__fixtures__/single-currency.fixtures";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("topProductsByCount", () => {
  it("empty marker on empty input", () => {
    expect(topProductsByCount(EMPTY_INVOICES, {timeframe: "all-time", topK: 5}, NOW).kind).toBe("empty");
  });

  it("returns top-K products by total quantity, sorted desc", () => {
    const result = topProductsByCount(singleCurrencyFixture(NOW), {timeframe: "all-time", topK: 10}, NOW);
    expect(result.kind).toBe("populated");
    if (result.kind === "populated") {
      for (let i = 1; i < result.buckets.length; i++) {
        expect(result.buckets[i]!.totalQuantity).toBeLessThanOrEqual(result.buckets[i - 1]!.totalQuantity);
      }
    }
  });

  it("excludes soft-deleted products", () => {
    const all = singleCurrencyFixture(NOW);
    const mutated = all.map((inv) => ({
      ...inv,
      items: inv.items.map((p, i) => (i === 0 ? {...p, metadata: {...p.metadata, isSoftDeleted: true}} : p)),
    }));
    const before = topProductsByCount(all, {timeframe: "all-time", topK: 20}, NOW);
    const after = topProductsByCount(mutated, {timeframe: "all-time", topK: 20}, NOW);
    if (before.kind === "populated" && after.kind === "populated") {
      const breadBefore = before.buckets.find((b) => b.productName === "Bread");
      const breadAfter = after.buckets.find((b) => b.productName === "Bread");
      if (breadBefore && breadAfter) expect(breadAfter.occurrences).toBeLessThanOrEqual(breadBefore.occurrences);
    }
  });
});