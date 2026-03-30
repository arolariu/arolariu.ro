/**
 * @fileoverview Tests for the currency conversion utility.
 * @module sites/arolariu.ro/src/lib/currency/converter.test
 */

import {describe, expect, it} from "vitest";
import {getAvailableYears, getSupportedCurrencies, getTransactionYear, isSupportedCurrency, parseRatesCSV, toRON, toRONDetailed} from "./converter";

describe("toRON", () => {
  it("should return the same amount for RON currency", () => {
    expect(toRON(100, "RON", 2024)).toBe(100);
    expect(toRON(0, "RON", 2024)).toBe(0);
    expect(toRON(99.99, "RON", 2023)).toBe(99.99);
  });

  it("should return the same amount for empty currency code", () => {
    expect(toRON(100, "", 2024)).toBe(100);
  });

  it("should convert EUR to RON using 2024 rates", () => {
    const result = toRON(100, "EUR", 2024);
    // 100 * 4.9735 = 497.35
    expect(result).toBe(497.35);
  });

  it("should convert USD to RON using 2023 rates", () => {
    const result = toRON(200, "USD", 2023);
    // 200 * 4.5725 = 914.50
    expect(result).toBe(914.5);
  });

  it("should convert GBP to RON", () => {
    const result = toRON(50, "GBP", 2024);
    // 50 * 5.8020 = 290.10
    expect(result).toBe(290.1);
  });

  it("should convert new currencies added in 50-currency expansion", () => {
    // AED (UAE Dirham)
    const aed = toRON(100, "AED", 2024);
    expect(aed).toBeGreaterThan(100); // 1 AED > 1 RON
    expect(aed).toBeLessThan(200);

    // KWD (Kuwaiti Dinar — one of the strongest currencies)
    const kwd = toRON(10, "KWD", 2024);
    expect(kwd).toBeGreaterThan(100); // 1 KWD ≈ 15 RON

    // MDL (Moldovan Leu — close to RON value)
    const mdl = toRON(100, "MDL", 2024);
    expect(mdl).toBeGreaterThan(20);
    expect(mdl).toBeLessThan(30);

    // VND (Vietnamese Dong — very small per-unit value)
    const vnd = toRON(1000000, "VND", 2024);
    expect(vnd).toBeGreaterThan(100);
    expect(vnd).toBeLessThan(300);
  });

  it("should handle zero amounts", () => {
    expect(toRON(0, "EUR", 2024)).toBe(0);
    expect(toRON(0, "USD", 2023)).toBe(0);
  });

  it("should handle negative amounts (refunds)", () => {
    const result = toRON(-50, "EUR", 2024);
    expect(result).toBeLessThan(0);
    // -50 * 4.9735 = -248.675, which rounds to -248.67 or -248.68 depending on IEEE 754
    expect(Math.abs(result + 248.675)).toBeLessThan(0.01);
  });

  it("should fall back to nearest year for unavailable years", () => {
    // 2017 is not in our data, should fall back to 2018
    const result2017 = toRON(100, "EUR", 2017);
    const result2018 = toRON(100, "EUR", 2018);
    expect(result2017).toBe(result2018);
  });

  it("should fall back to nearest year for far future years", () => {
    // 2030 is not in our data, should fall back to 2025 (nearest)
    const result2030 = toRON(100, "EUR", 2030);
    const result2025 = toRON(100, "EUR", 2025);
    expect(result2030).toBe(result2025);
  });

  it("should return the original amount for unknown currencies", () => {
    expect(toRON(100, "XYZ", 2024)).toBe(100);
    expect(toRON(100, "FAKE", 2024)).toBe(100);
  });

  it("should round results to 2 decimal places", () => {
    const result = toRON(33.33, "EUR", 2024);
    const decimalPlaces = String(result).split(".")[1]?.length ?? 0;
    expect(decimalPlaces).toBeLessThanOrEqual(2);
  });
});

describe("toRONDetailed", () => {
  it("should return identity conversion for RON", () => {
    const result = toRONDetailed(100, "RON", 2024);
    expect(result).toEqual({
      amountInRon: 100,
      rateUsed: 1,
      rateYear: 2024,
      isExactYearMatch: true,
    });
  });

  it("should return conversion details for EUR", () => {
    const result = toRONDetailed(100, "EUR", 2024);
    expect(result.amountInRon).toBe(497.35);
    expect(result.rateUsed).toBe(4.9735);
    expect(result.rateYear).toBe(2024);
    expect(result.isExactYearMatch).toBe(true);
  });

  it("should indicate when year fallback was used", () => {
    const result = toRONDetailed(100, "EUR", 2017);
    expect(result.isExactYearMatch).toBe(false);
    expect(result.rateYear).toBe(2018); // Nearest available year
    expect(result.amountInRon).toBeGreaterThan(0);
  });

  it("should return rate 1 for unknown currencies", () => {
    const result = toRONDetailed(100, "XYZ", 2024);
    expect(result.amountInRon).toBe(100);
    expect(result.rateUsed).toBe(1);
    expect(result.isExactYearMatch).toBe(false);
  });
});

describe("getTransactionYear", () => {
  it("should extract year from Date object", () => {
    expect(getTransactionYear(new Date("2024-03-15"))).toBe(2024);
    expect(getTransactionYear(new Date("2023-12-01"))).toBe(2023);
  });

  it("should extract year from ISO string", () => {
    expect(getTransactionYear("2024-06-15T10:00:00Z")).toBe(2024);
    expect(getTransactionYear("2022-01-01")).toBe(2022);
  });

  it("should use fallback date when primary is null/undefined", () => {
    expect(getTransactionYear(null, new Date("2023-05-01"))).toBe(2023);
    expect(getTransactionYear(undefined, "2022-07-15")).toBe(2022);
  });

  it("should use current year when both dates are missing", () => {
    const currentYear = new Date().getFullYear();
    expect(getTransactionYear(null)).toBe(currentYear);
    expect(getTransactionYear(undefined)).toBe(currentYear);
  });

  it("should reject unreasonable years and return current year", () => {
    const currentYear = new Date().getFullYear();
    expect(getTransactionYear(new Date("1900-01-01"))).toBe(currentYear);
    expect(getTransactionYear(new Date("2200-01-01"))).toBe(currentYear);
  });
});

describe("getSupportedCurrencies", () => {
  it("should return a non-empty sorted array", () => {
    const currencies = getSupportedCurrencies();
    expect(currencies.length).toBeGreaterThan(0);
    // Check sorted
    for (let i = 1; i < currencies.length; i++) {
      const prev = currencies[i - 1];
      const curr = currencies[i];
      if (prev && curr) {
        expect(prev.localeCompare(curr)).toBeLessThanOrEqual(0);
      }
    }
  });

  it("should include common currencies", () => {
    const currencies = getSupportedCurrencies();
    expect(currencies).toContain("EUR");
    expect(currencies).toContain("USD");
    expect(currencies).toContain("GBP");
    expect(currencies).toContain("CHF");
    // New currencies added in 50-currency expansion
    expect(currencies).toContain("AED");
    expect(currencies).toContain("THB");
    expect(currencies).toContain("MDL");
    expect(currencies).toContain("KWD");
  });

  it("should contain exactly 50 currencies", () => {
    const currencies = getSupportedCurrencies();
    expect(currencies.length).toBe(50);
  });
});

describe("getAvailableYears", () => {
  it("should return a non-empty sorted array", () => {
    const years = getAvailableYears();
    expect(years.length).toBeGreaterThan(0);
    for (let i = 1; i < years.length; i++) {
      const prev = years[i - 1];
      const curr = years[i];
      if (prev !== undefined && curr !== undefined) {
        expect(prev).toBeLessThan(curr);
      }
    }
  });

  it("should include expected years", () => {
    const years = getAvailableYears();
    expect(years).toContain(2020);
    expect(years).toContain(2024);
    expect(years).toContain(2025);
  });
});

describe("isSupportedCurrency", () => {
  it("should return true for supported currencies", () => {
    expect(isSupportedCurrency("EUR")).toBe(true);
    expect(isSupportedCurrency("USD")).toBe(true);
    expect(isSupportedCurrency("GBP")).toBe(true);
  });

  it("should return false for unsupported currencies", () => {
    expect(isSupportedCurrency("XYZ")).toBe(false);
    expect(isSupportedCurrency("FAKE")).toBe(false);
    expect(isSupportedCurrency("")).toBe(false);
  });

  it("should return false for RON (RON is the base, not in the rate table)", () => {
    // RON is the base currency — it's not stored in the rate table
    // The converter handles RON via early return, not via lookup
    expect(isSupportedCurrency("RON")).toBe(false);
  });
});

describe("edge cases", () => {
  it("should handle conversion for each available year", () => {
    const years = getAvailableYears();
    for (const year of years) {
      const result = toRON(100, "EUR", year);
      expect(result).toBeGreaterThan(400); // EUR/RON always above 4.0
      expect(result).toBeLessThan(600); // EUR/RON always below 6.0
    }
  });

  it("should handle conversion for all supported currencies", () => {
    const currencies = getSupportedCurrencies();
    for (const currency of currencies) {
      const result = toRON(100, currency, 2024);
      expect(result).toBeGreaterThan(0);
    }
  });

  it("should produce consistent results between toRON and toRONDetailed", () => {
    const simple = toRON(100, "USD", 2024);
    const detailed = toRONDetailed(100, "USD", 2024);
    expect(simple).toBe(detailed.amountInRon);
  });

  it("should handle year boundaries correctly", () => {
    // First available year
    const years = getAvailableYears();
    const firstYear = years[0]!;
    const lastYear = years[years.length - 1]!;

    expect(toRON(100, "EUR", firstYear)).toBeGreaterThan(0);
    expect(toRON(100, "EUR", lastYear)).toBeGreaterThan(0);

    // One year before first — falls back to first
    const beforeFirst = toRONDetailed(100, "EUR", firstYear - 1);
    expect(beforeFirst.rateYear).toBe(firstYear);
    expect(beforeFirst.isExactYearMatch).toBe(false);

    // One year after last — falls back to last
    const afterLast = toRONDetailed(100, "EUR", lastYear + 1);
    expect(afterLast.rateYear).toBe(lastYear);
    expect(afterLast.isExactYearMatch).toBe(false);
  });
});

describe("parseRatesCSV", () => {
  it("should parse valid CSV data", () => {
    const csv = `year,currency,rate_to_ron
2024,EUR,4.9735
2024,USD,4.5780`;
    const count = parseRatesCSV(csv);
    expect(count).toBe(2);
  });

  it("should skip empty lines", () => {
    const csv = `year,currency,rate_to_ron

2024,EUR,4.9735

2024,USD,4.5780
`;
    const count = parseRatesCSV(csv);
    expect(count).toBe(2);
  });

  it("should skip lines with missing fields", () => {
    const csv = `year,currency,rate_to_ron
2024,EUR
2024,,4.5780
,USD,4.5780
2024,GBP,5.8020`;
    const count = parseRatesCSV(csv);
    expect(count).toBe(1); // Only GBP line is valid
  });

  it("should skip lines with NaN values", () => {
    const csv = `year,currency,rate_to_ron
abc,EUR,4.9735
2024,USD,xyz`;
    const count = parseRatesCSV(csv);
    expect(count).toBe(0); // Both lines have NaN
  });

  it("should handle header-only CSV", () => {
    const csv = "year,currency,rate_to_ron";
    const count = parseRatesCSV(csv);
    expect(count).toBe(0);
  });
});
