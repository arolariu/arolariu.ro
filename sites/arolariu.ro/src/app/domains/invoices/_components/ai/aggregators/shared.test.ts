import {describe, expect, it} from "vitest";
import {filterByTimeframe, filterNotDeleted, groupByCurrency, resolveTimeframeWindow} from "./shared";
import {singleCurrencyFixture} from "./__fixtures__/single-currency.fixtures";
import {multiCurrencyFixture} from "./__fixtures__/multi-currency.fixtures";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("resolveTimeframeWindow", () => {
  it("returns the calendar bounds for last-month from a fixed now", () => {
    const w = resolveTimeframeWindow("last-month", NOW);
    expect(w.start.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-05-01T00:00:00.000Z");
  });

  it("returns this-month including the as-of moment", () => {
    const w = resolveTimeframeWindow("this-month", NOW);
    expect(w.start.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(w.end.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });

  it("returns last-3-months as a 90-day rolling window", () => {
    const w = resolveTimeframeWindow("last-3-months", NOW);
    expect(w.end).toEqual(NOW);
    const expectedStart = new Date(NOW);
    expectedStart.setUTCDate(expectedStart.getUTCDate() - 90);
    expect(w.start).toEqual(expectedStart);
  });

  it("returns full Date range for all-time", () => {
    const w = resolveTimeframeWindow("all-time", NOW);
    expect(w.start.getUTCFullYear()).toBeLessThan(2000);
    expect(w.end.getUTCFullYear()).toBeGreaterThan(2100);
  });
});

describe("filterByTimeframe + filterNotDeleted", () => {
  it("filters single-currency fixture by last-month and excludes none (no soft-deletes)", () => {
    const all = singleCurrencyFixture(NOW);
    const filtered = filterByTimeframe(filterNotDeleted(all), "last-month", NOW);
    expect(filtered.length).toBeGreaterThan(0);
    for (const inv of filtered) {
      const d = inv.paymentInformation.transactionDate;
      expect(d.getUTCMonth()).toBe(3);
    }
  });

  it("returns empty array on empty input", () => {
    expect(filterByTimeframe([], "last-month", NOW)).toEqual([]);
  });
});

describe("groupByCurrency", () => {
  it("returns single bucket for single-currency input", () => {
    const buckets = groupByCurrency(singleCurrencyFixture(NOW));
    expect(buckets.size).toBe(1);
    expect(buckets.has("EUR")).toBe(true);
  });

  it("splits multi-currency input into per-currency buckets", () => {
    const buckets = groupByCurrency(multiCurrencyFixture(NOW));
    expect(buckets.size).toBe(2);
    expect(buckets.has("EUR")).toBe(true);
    expect(buckets.has("RON")).toBe(true);
  });
});