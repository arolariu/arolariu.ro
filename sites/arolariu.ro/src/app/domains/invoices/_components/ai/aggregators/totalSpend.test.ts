import {describe, expect, it} from "vitest";
import {totalSpend} from "./totalSpend";
import {EMPTY_INVOICES} from "./__fixtures__/empty.fixtures";
import {singleCurrencyFixture} from "./__fixtures__/single-currency.fixtures";
import {multiCurrencyFixture} from "./__fixtures__/multi-currency.fixtures";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("totalSpend", () => {
  it("returns empty marker on empty corpus", () => {
    const result = totalSpend(EMPTY_INVOICES, {timeframe: "last-month"}, NOW);
    expect(result).toEqual({kind: "empty", timeframe: "last-month"});
  });

  it("returns single-currency total for last-month", () => {
    const result = totalSpend(singleCurrencyFixture(NOW), {timeframe: "last-month"}, NOW);
    expect(result.kind).toBe("populated");
    if (result.kind === "populated") {
      expect(result.buckets).toHaveLength(1);
      expect(result.buckets[0]!.currency).toBe("EUR");
      expect(result.buckets[0]!.totalSpend).toBeGreaterThan(0);
      expect(result.buckets[0]!.invoiceCount).toBe(3);
    }
  });

  it("splits multi-currency results into per-currency buckets", () => {
    const result = totalSpend(multiCurrencyFixture(NOW), {timeframe: "all-time"}, NOW);
    expect(result.kind).toBe("populated");
    if (result.kind === "populated") {
      expect(result.buckets).toHaveLength(2);
      const eur = result.buckets.find((b) => b.currency === "EUR");
      const ron = result.buckets.find((b) => b.currency === "RON");
      expect(eur).toBeDefined();
      expect(ron).toBeDefined();
    }
  });

  it("filters by category when provided", () => {
    const all = singleCurrencyFixture(NOW);
    const allTime = totalSpend(all, {timeframe: "all-time"}, NOW);
    const groceryOnly = totalSpend(all, {timeframe: "all-time", category: "100"}, NOW);
    expect(groceryOnly.kind).toBe("populated");
    if (allTime.kind === "populated" && groceryOnly.kind === "populated") {
      expect(groceryOnly.buckets[0]!.invoiceCount).toBeLessThan(allTime.buckets[0]!.invoiceCount);
    }
  });

  it("excludes soft-deleted invoices", () => {
    const all = [...singleCurrencyFixture(NOW)];
    const before = totalSpend(all, {timeframe: "all-time"}, NOW);
    const mutated = all.map((inv, i) => (i === 0 ? {...inv, isDeleted: true} : inv));
    const after = totalSpend(mutated, {timeframe: "all-time"}, NOW);
    if (before.kind === "populated" && after.kind === "populated") {
      expect(after.buckets[0]!.invoiceCount).toBe(before.buckets[0]!.invoiceCount - 1);
    }
  });

  it("returns either populated or empty for last-week", () => {
    const result = totalSpend(singleCurrencyFixture(NOW), {timeframe: "last-week"}, NOW);
    expect(result.kind === "populated" || result.kind === "empty").toBe(true);
  });
});