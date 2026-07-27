/**
 * @fileoverview Pure currency conversion utility using static yearly average rates.
 * @module sites/arolariu.ro/src/lib/currency/converter
 *
 * @remarks
 * Converts foreign currency amounts to RON using yearly average exchange rates
 * stored in a static CSV file (`public/data/exchange-rates.csv`).
 *
 * **Design:**
 * - Rates are parsed once at module load and cached in a Map for O(1) lookups.
 * - All functions are pure — no side effects, no API calls.
 * - If a rate is missing for the exact year, falls back to the nearest available year.
 * - RON amounts pass through unchanged (identity conversion).
 *
 * **Rate Source:**
 * Rates are yearly averages sourced from BNR (National Bank of Romania) / ECB data.
 * The CSV file is updated once per year via `scripts/update-exchange-rates.ts`.
 *
 * @example
 * ```typescript
 * import { toRON, toRONDetailed } from "@/lib/currency/converter";
 *
 * // Simple conversion
 * const ronAmount = toRON(100, "EUR", 2024); // ~497.35
 *
 * // Detailed conversion with metadata
 * const result = toRONDetailed(100, "EUR", 2024);
 * // { amountInRon: 497.35, rateUsed: 4.9735, rateYear: 2024, isExactYearMatch: true }
 * ```
 *
 * @see {@link ExchangeRate} for the rate record type
 * @see {@link ConversionResult} for detailed conversion output
 */

import type {ConversionResult, ExchangeRate} from "./types";
// Imported via the `?raw` query suffix so both Turbopack (Next.js) and Vite
// (Vitest) inline the file contents as a string at build time. This keeps
// the module isomorphic — works on both server and client without a fetch
// or `fs` call — while ensuring `public/data/exchange-rates.csv` is the
// single source of truth.
import RATES_CSV from "../../../public/data/exchange-rates.csv?raw";

// ---------------------------------------------------------------------------
// Rate data — parsed from the CSV at module load time
// ---------------------------------------------------------------------------

/**
 * Lookup map for exchange rates. Key format: `"YEAR-CURRENCY"` (e.g., `"2024-EUR"`).
 * Populated once at module load time from `public/data/exchange-rates.csv`.
 */
const rateMap = new Map<string, ExchangeRate>();

/**
 * Set of all years for which we have rate data.
 * Used for fallback year resolution when exact year is unavailable.
 */
const availableYears = new Set<number>();

/**
 * Set of all currency codes for which we have rate data.
 */
const availableCurrencies = new Set<string>();

/**
 * Parses CSV text into exchange rate records and populates the lookup structures.
 *
 * @remarks
 * Exported for testing purposes. In production, called once at module load
 * with the contents of `public/data/exchange-rates.csv` (embedded at build
 * time via the `?raw` import suffix).
 *
 * @param csv - Raw CSV string with header row `year,currency,rate_to_ron`
 * @returns The number of valid records parsed
 */
export function parseRatesCSV(csv: string): number {
  let count = 0;
  const lines = csv.split("\n");
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]?.trim();
    if (line) {
      const parts = line.split(",");
      const [yearStr, currency, rateStr] = parts;
      if (yearStr && currency && rateStr) {
        const year = Number(yearStr);
        const rateToRon = Number(rateStr);
        if (!Number.isNaN(year) && !Number.isNaN(rateToRon)) {
          const rate: ExchangeRate = {year, currency, rateToRon};
          rateMap.set(`${year}-${currency}`, rate);
          availableYears.add(year);
          availableCurrencies.add(currency);
          count++;
        }
      }
    }
  }
  return count;
}

// Initialize at module load
parseRatesCSV(RATES_CSV);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Converts an amount from a given currency to RON using yearly average rates.
 *
 * @param amount - The monetary amount to convert
 * @param currencyCode - ISO 4217 currency code (e.g., "EUR", "USD")
 * @param year - The calendar year for rate lookup (extracted from transaction date)
 * @returns The equivalent amount in RON, rounded to 2 decimal places
 *
 * @remarks
 * - RON amounts pass through unchanged (identity conversion).
 * - If the exact year is unavailable, falls back to the nearest available year.
 * - If the currency is completely unknown, returns the original amount unchanged.
 * - All returned values are rounded to 2 decimal places.
 *
 * @example
 * ```typescript
 * toRON(100, "EUR", 2024);  // 497.46 (100 × 4.9746)
 * toRON(50, "RON", 2024);   // 50.00  (identity)
 * toRON(200, "USD", 2023);  // 915.26 (200 × 4.5763)
 * ```
 */
export function toRON(amount: number, currencyCode: string, year: number): number {
  if (currencyCode === "RON" || !currencyCode) return amount;

  const rate = findRate(currencyCode, year);
  if (!rate) return amount; // Unknown currency — return as-is

  return Math.round(amount * rate.rateToRon * 100) / 100;
}

/**
 * Converts an amount from a given currency to RON with detailed metadata.
 *
 * @param amount - The monetary amount to convert
 * @param currencyCode - ISO 4217 currency code (e.g., "EUR", "USD")
 * @param year - The calendar year for rate lookup
 * @returns A {@link ConversionResult} with the converted amount and rate metadata
 *
 * @remarks
 * Use this variant when the UI needs to display conversion context,
 * such as "Converted at 1 EUR = 4.97 RON (2024 average)".
 *
 * @example
 * ```typescript
 * const result = toRONDetailed(100, "EUR", 2024);
 * // {
 * //   amountInRon: 497.46,
 * //   rateUsed: 4.9746,
 * //   rateYear: 2024,
 * //   isExactYearMatch: true
 * // }
 * ```
 */
export function toRONDetailed(amount: number, currencyCode: string, year: number): ConversionResult {
  if (currencyCode === "RON" || !currencyCode) {
    return {
      amountInRon: amount,
      rateUsed: 1,
      rateYear: year,
      isExactYearMatch: true,
    };
  }

  const rate = findRate(currencyCode, year);
  if (!rate) {
    return {
      amountInRon: amount,
      rateUsed: 1,
      rateYear: year,
      isExactYearMatch: false,
    };
  }

  return {
    amountInRon: Math.round(amount * rate.rateToRon * 100) / 100,
    rateUsed: rate.rateToRon,
    rateYear: rate.year,
    isExactYearMatch: rate.year === year,
  };
}

/**
 * Extracts the transaction year from an invoice's payment information.
 *
 * @param transactionDate - The transaction date (Date object or ISO string)
 * @param fallbackDate - Optional fallback date if transactionDate is invalid
 * @returns The calendar year as a number
 *
 * @example
 * ```typescript
 * getTransactionYear(new Date("2024-03-15")); // 2024
 * getTransactionYear("2023-12-01T10:00:00Z"); // 2023
 * ```
 */
export function getTransactionYear(transactionDate: Date | string | undefined | null, fallbackDate?: Date | string): number {
  /** Resolves the effective date from the available inputs. */
  const resolveDate = (): Date => {
    if (transactionDate) return new Date(transactionDate);
    if (fallbackDate) return new Date(fallbackDate);
    return new Date();
  };

  const date: Date = resolveDate();
  const year = date.getFullYear();

  // Sanity check: if year is unreasonable, use current year
  if (year < 2000 || year > 2100) return new Date().getFullYear();

  return year;
}

/**
 * Returns the list of all supported currency codes.
 *
 * @returns Array of ISO 4217 currency codes that have rate data
 *
 * @example
 * ```typescript
 * const currencies = getSupportedCurrencies();
 * // ["EUR", "USD", "GBP", "CHF", ...]
 * ```
 */
export function getSupportedCurrencies(): ReadonlyArray<string> {
  return [...availableCurrencies].toSorted((a, b) => a.localeCompare(b));
}

/**
 * Returns the list of all years for which rate data is available.
 *
 * @returns Sorted array of years
 */
export function getAvailableYears(): ReadonlyArray<number> {
  return [...availableYears].toSorted((a, b) => a - b);
}

/**
 * Checks whether a given currency code has rate data available.
 *
 * @param currencyCode - ISO 4217 currency code to check
 * @returns `true` if rate data exists for the currency
 */
export function isSupportedCurrency(currencyCode: string): boolean {
  return availableCurrencies.has(currencyCode);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Finds the exchange rate for a given currency and year.
 *
 * @remarks
 * Falls back to the nearest available year for which **this currency** has data
 * if no exact (year, currency) match exists. The merged dataset is sparse —
 * some currencies span 2000–2026, others only 2018–2025 — so a per-currency
 * nearest-year search is required to avoid picking a year that exists globally
 * but not for the requested currency (which would yield a `null` lookup and
 * an incorrect identity fallback in {@link toRON}).
 */
function findRate(currencyCode: string, year: number): ExchangeRate | null {
  // Try exact match first
  const exactKey = `${year}-${currencyCode}`;
  const exactMatch = rateMap.get(exactKey);
  if (exactMatch) return exactMatch;

  // Currency not supported at all
  if (!availableCurrencies.has(currencyCode)) return null;

  // Find nearest year for which this currency has data
  let nearestYear: number | null = null;
  let minDistance = Number.POSITIVE_INFINITY;
  for (const y of availableYears) {
    if (rateMap.has(`${y}-${currencyCode}`)) {
      const distance = Math.abs(year - y);
      if (distance < minDistance) {
        minDistance = distance;
        nearestYear = y;
      }
    }
  }

  if (nearestYear === null) return null;
  return rateMap.get(`${nearestYear}-${currencyCode}`) ?? null;
}
