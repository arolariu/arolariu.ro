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

// ---------------------------------------------------------------------------
// Rate data — parsed from the embedded CSV at module load time
// ---------------------------------------------------------------------------

/**
 * Raw CSV data for exchange rates.
 *
 * @remarks
 * This is imported as a raw string at build time via the CSV in public/data/.
 * We embed a copy here so the module works both server-side and client-side
 * without needing a fetch call or dynamic import.
 */
const RATES_CSV = `year,currency,rate_to_ron
2018,EUR,4.6535
2018,USD,3.9416
2018,GBP,5.2610
2018,CHF,4.0332
2018,JPY,0.0356
2018,CAD,3.0540
2018,AUD,2.9756
2018,SEK,0.4525
2018,NOK,0.4908
2018,DKK,0.6240
2018,PLN,1.0947
2018,CZK,0.1810
2018,HUF,0.0143
2018,BGN,2.3793
2018,HRK,0.6260
2018,TRY,0.8320
2018,CNY,0.5959
2018,INR,0.0574
2018,BRL,1.0820
2018,MXN,0.2042
2018,ZAR,0.2998
2018,KRW,0.0036
2018,SGD,2.9080
2018,HKD,0.5034
2018,NZD,2.7310
2019,EUR,4.7452
2019,USD,4.2378
2019,GBP,5.3722
2019,CHF,4.3040
2019,JPY,0.0390
2019,CAD,3.1940
2019,AUD,2.9360
2019,SEK,0.4465
2019,NOK,0.4790
2019,DKK,0.6350
2019,PLN,1.1050
2019,CZK,0.1846
2019,HUF,0.0144
2019,BGN,2.4255
2019,HRK,0.6395
2019,TRY,0.7460
2019,CNY,0.6140
2019,INR,0.0600
2019,BRL,1.0700
2019,MXN,0.2200
2019,ZAR,0.2920
2019,KRW,0.0036
2019,SGD,3.1100
2019,HKD,0.5420
2019,NZD,2.8100
2020,EUR,4.8371
2020,USD,4.2440
2020,GBP,5.4122
2020,CHF,4.5340
2020,JPY,0.0400
2020,CAD,3.1920
2020,AUD,2.9730
2020,SEK,0.4590
2020,NOK,0.4520
2020,DKK,0.6490
2020,PLN,1.0800
2020,CZK,0.1830
2020,HUF,0.0137
2020,BGN,2.4730
2020,HRK,0.6400
2020,TRY,0.5990
2020,CNY,0.6150
2020,INR,0.0568
2020,BRL,0.8040
2020,MXN,0.1960
2020,ZAR,0.2580
2020,KRW,0.0036
2020,SGD,3.0900
2020,HKD,0.5475
2020,NZD,2.8170
2021,EUR,4.9204
2021,USD,4.1604
2021,GBP,5.7405
2021,CHF,4.5616
2021,JPY,0.0379
2021,CAD,3.3220
2021,AUD,3.1240
2021,SEK,0.4850
2021,NOK,0.4830
2021,DKK,0.6613
2021,PLN,1.0700
2021,CZK,0.1918
2021,HUF,0.0137
2021,BGN,2.5158
2021,HRK,0.6530
2021,TRY,0.4830
2021,CNY,0.6450
2021,INR,0.0560
2021,BRL,0.7680
2021,MXN,0.2040
2021,ZAR,0.2830
2021,KRW,0.0036
2021,SGD,3.0920
2021,HKD,0.5340
2021,NZD,2.9340
2022,EUR,4.9313
2022,USD,4.6885
2022,GBP,5.7030
2022,CHF,4.8940
2022,JPY,0.0362
2022,CAD,3.6180
2022,AUD,3.2420
2022,SEK,0.4670
2022,NOK,0.4810
2022,DKK,0.6630
2022,PLN,1.0530
2022,CZK,0.2008
2022,HUF,0.0126
2022,BGN,2.5210
2022,HRK,0.6540
2022,TRY,0.2810
2022,CNY,0.6970
2022,INR,0.0592
2022,BRL,0.9080
2022,MXN,0.2340
2022,ZAR,0.2880
2022,KRW,0.0036
2022,SGD,3.3710
2022,HKD,0.5988
2022,NZD,2.9490
2023,EUR,4.9467
2023,USD,4.5725
2023,GBP,5.6770
2023,CHF,5.1140
2023,JPY,0.0326
2023,CAD,3.3980
2023,AUD,3.0100
2023,SEK,0.4390
2023,NOK,0.4340
2023,DKK,0.6636
2023,PLN,1.1050
2023,CZK,0.2069
2023,HUF,0.0131
2023,BGN,2.5290
2023,HRK,0.6565
2023,TRY,0.1940
2023,CNY,0.6370
2023,INR,0.0553
2023,BRL,0.9210
2023,MXN,0.2630
2023,ZAR,0.2490
2023,KRW,0.0035
2023,SGD,3.4160
2023,HKD,0.5850
2023,NZD,2.8280
2024,EUR,4.9735
2024,USD,4.5780
2024,GBP,5.8020
2024,CHF,5.1480
2024,JPY,0.0300
2024,CAD,3.3570
2024,AUD,3.0380
2024,SEK,0.4340
2024,NOK,0.4290
2024,DKK,0.6668
2024,PLN,1.1550
2024,CZK,0.1980
2024,HUF,0.0126
2024,BGN,2.5420
2024,HRK,0.6600
2024,TRY,0.1400
2024,CNY,0.6340
2024,INR,0.0548
2024,BRL,0.8960
2024,MXN,0.2640
2024,ZAR,0.2520
2024,KRW,0.0034
2024,SGD,3.4380
2024,HKD,0.5870
2024,NZD,2.7630
2025,EUR,4.9780
2025,USD,4.6500
2025,GBP,5.9020
2025,CHF,5.3260
2025,JPY,0.0315
2025,CAD,3.2840
2025,AUD,2.9520
2025,SEK,0.4550
2025,NOK,0.4370
2025,DKK,0.6680
2025,PLN,1.1680
2025,CZK,0.1985
2025,HUF,0.0125
2025,BGN,2.5450
2025,HRK,0.6610
2025,TRY,0.1230
2025,CNY,0.6380
2025,INR,0.0542
2025,BRL,0.8140
2025,MXN,0.2290
2025,ZAR,0.2550
2025,KRW,0.0033
2025,SGD,3.5020
2025,HKD,0.5980
2025,NZD,2.7410`;

/**
 * Lookup map for exchange rates. Key format: `"YEAR-CURRENCY"` (e.g., `"2024-EUR"`).
 * Populated once at module load time from the embedded CSV data.
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
 * with the embedded CSV data.
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
    if (!line) continue;

    const parts = line.split(",");
    const yearStr = parts[0];
    const currency = parts[1];
    const rateStr = parts[2];
    if (!yearStr || !currency || !rateStr) continue;

    const year = Number(yearStr);
    const rateToRon = Number(rateStr);
    if (Number.isNaN(year) || Number.isNaN(rateToRon)) continue;

    const rate: ExchangeRate = {year, currency, rateToRon};
    rateMap.set(`${year}-${currency}`, rate);
    availableYears.add(year);
    availableCurrencies.add(currency);
    count++;
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
 * toRON(100, "EUR", 2024);  // 497.35 (100 × 4.9735)
 * toRON(50, "RON", 2024);   // 50.00  (identity)
 * toRON(200, "USD", 2023);  // 914.50 (200 × 4.5725)
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
 * //   amountInRon: 497.35,
 * //   rateUsed: 4.9735,
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
  const date = transactionDate ? new Date(transactionDate) : fallbackDate ? new Date(fallbackDate) : new Date();
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
  return [...availableCurrencies].sort();
}

/**
 * Returns the list of all years for which rate data is available.
 *
 * @returns Sorted array of years
 */
export function getAvailableYears(): ReadonlyArray<number> {
  return [...availableYears].sort((a, b) => a - b);
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
 * Falls back to the nearest available year if an exact match is not found.
 */
function findRate(currencyCode: string, year: number): ExchangeRate | null {
  // Try exact match first
  const exactKey = `${year}-${currencyCode}`;
  const exactMatch = rateMap.get(exactKey);
  if (exactMatch) return exactMatch;

  // Currency not supported at all
  if (!availableCurrencies.has(currencyCode)) return null;

  // Find nearest year
  const years = [...availableYears].sort((a, b) => a - b);
  let nearestYear = years[0];
  if (nearestYear === undefined) return null;

  let minDistance = Math.abs(year - nearestYear);

  for (const y of years) {
    const distance = Math.abs(year - y);
    if (distance < minDistance) {
      minDistance = distance;
      nearestYear = y;
    }
  }

  return rateMap.get(`${nearestYear}-${currencyCode}`) ?? null;
}
