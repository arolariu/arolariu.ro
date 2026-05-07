import {describe, expect, it} from "vitest";
import {invoiceCount} from "./invoiceCount";
import {EMPTY_INVOICES} from "./__fixtures__/empty.fixtures";
import {singleCurrencyFixture} from "./__fixtures__/single-currency.fixtures";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("invoiceCount", () => {
  it("returns empty marker for empty corpus", () => {
    expect(invoiceCount(EMPTY_INVOICES, {timeframe: "all-time"}, NOW)).toEqual({kind: "empty", timeframe: "all-time"});
  });

  it("returns total count and category breakdown", () => {
    const result = invoiceCount(singleCurrencyFixture(NOW), {timeframe: "all-time"}, NOW);
    expect(result.kind).toBe("populated");
    if (result.kind === "populated") {
      expect(result.count).toBe(54);
      expect(Object.keys(result.breakdown ?? {})).toContain("100");
    }
  });

  it("filters by category and returns count without breakdown", () => {
    const result = invoiceCount(singleCurrencyFixture(NOW), {timeframe: "all-time", category: "100"}, NOW);
    if (result.kind === "populated") {
      expect(result.count).toBeGreaterThan(0);
      expect(result.breakdown).toBeUndefined();
    }
  });

  it("excludes soft-deleted", () => {
    const all = singleCurrencyFixture(NOW);
    const mutated = all.map((inv, i) => (i < 5 ? {...inv, isDeleted: true} : inv));
    const result = invoiceCount(mutated, {timeframe: "all-time"}, NOW);
    if (result.kind === "populated") expect(result.count).toBe(49);
  });
});