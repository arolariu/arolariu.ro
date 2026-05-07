import {describe, expect, it} from "vitest";
import {averageSpendPerVisit} from "./averageSpendPerVisit";
import {EMPTY_INVOICES} from "./__fixtures__/empty.fixtures";
import {singleCurrencyFixture} from "./__fixtures__/single-currency.fixtures";

const NOW = new Date("2026-05-01T12:00:00Z");

describe("averageSpendPerVisit", () => {
  it("empty on no input", () => {
    expect(averageSpendPerVisit(EMPTY_INVOICES, {timeframe: "all-time"}, NOW).kind).toBe("empty");
  });

  it("returns average per currency", () => {
    const result = averageSpendPerVisit(singleCurrencyFixture(NOW), {timeframe: "all-time"}, NOW);
    if (result.kind === "populated") {
      const eur = result.buckets.find((b) => b.currency === "EUR");
      expect(eur).toBeDefined();
      if (eur) {
        expect(eur.averageSpend).toBeGreaterThan(0);
        expect(eur.sampleSize).toBe(54);
      }
    }
  });

  it("filters by merchantId when provided", () => {
    const result = averageSpendPerVisit(singleCurrencyFixture(NOW), {timeframe: "all-time", merchantId: "m-lidl"}, NOW);
    if (result.kind === "populated") {
      const eur = result.buckets.find((b) => b.currency === "EUR");
      if (eur) {
        expect(eur.sampleSize).toBeLessThan(54);
        expect(eur.merchantName).toBe("m-lidl");
      }
    }
  });
});