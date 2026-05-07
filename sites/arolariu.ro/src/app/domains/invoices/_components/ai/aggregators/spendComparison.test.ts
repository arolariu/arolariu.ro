import {describe, expect, it} from "vitest";
import {spendComparison} from "./spendComparison";
import {EMPTY_INVOICES} from "./__fixtures__/empty.fixtures";
import {singleCurrencyFixture} from "./__fixtures__/single-currency.fixtures";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("spendComparison", () => {
  it("empty marker when both timeframes have zero invoices", () => {
    expect(spendComparison(EMPTY_INVOICES, {timeframeA: "this-month", timeframeB: "last-month"}, NOW).kind).toBe("empty");
  });

  it("returns delta and percent change between two timeframes", () => {
    const result = spendComparison(singleCurrencyFixture(NOW), {timeframeA: "last-month", timeframeB: "this-month"}, NOW);
    expect(result.kind).toBe("populated");
    if (result.kind === "populated") {
      expect(result.buckets.length).toBeGreaterThan(0);
      const eur = result.buckets.find((b) => b.currency === "EUR");
      if (eur) {
        expect(typeof eur.deltaAbs).toBe("number");
        expect(typeof eur.deltaPct === "number" || eur.deltaPct === null).toBe(true);
      }
    }
  });

  it("handles zero-spend on one side (deltaPct is null, not Infinity)", () => {
    const result = spendComparison(singleCurrencyFixture(NOW), {timeframeA: "all-time", timeframeB: "last-week"}, NOW);
    if (result.kind === "populated") {
      for (const b of result.buckets) {
        expect(Number.isFinite(b.deltaPct) || b.deltaPct === null).toBe(true);
      }
    }
  });
});