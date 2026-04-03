/**
 * @fileoverview Currency conversion type definitions.
 * @module sites/arolariu.ro/src/lib/currency/types
 *
 * @remarks
 * Defines the data structures used by the currency conversion system.
 * Exchange rates are stored as yearly averages in a static CSV file
 * and loaded at module initialization time.
 *
 * @see {@link converter} for the conversion utility
 * @see {@link public/data/exchange-rates.csv} for the rate data source
 */

/**
 * A single exchange rate record from the CSV data file.
 *
 * @remarks
 * Each record represents the yearly average exchange rate
 * for converting 1 unit of a foreign currency to RON.
 *
 * **Example:** `{ year: 2024, currency: "EUR", rateToRon: 4.9735 }`
 * means that in 2024, 1 EUR ≈ 4.9735 RON on average.
 */
export type ExchangeRate = Readonly<{
  /** The calendar year for which this rate applies. */
  year: number;
  /** ISO 4217 three-letter currency code (e.g., "USD", "EUR", "GBP"). */
  currency: string;
  /** How many RON 1 unit of this currency is worth (yearly average). */
  rateToRon: number;
}>;

/**
 * Result of a currency conversion operation.
 *
 * @remarks
 * Includes the converted amount plus metadata about which rate was used,
 * so the UI can display conversion context to the user.
 */
export type ConversionResult = Readonly<{
  /** The converted amount in RON. */
  amountInRon: number;
  /** The exchange rate that was applied (1 currency = X RON). */
  rateUsed: number;
  /** The year from which the rate was sourced. */
  rateYear: number;
  /** Whether an exact year match was found, or a fallback year was used. */
  isExactYearMatch: boolean;
}>;
