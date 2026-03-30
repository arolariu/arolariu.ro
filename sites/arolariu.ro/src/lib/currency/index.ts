/**
 * @fileoverview Currency conversion module barrel export.
 * @module sites/arolariu.ro/src/lib/currency
 *
 * @remarks
 * Re-exports all public APIs from the currency conversion system.
 * Import from `@/lib/currency` for clean, consistent imports.
 *
 * @example
 * ```typescript
 * import { toRON, toRONDetailed, getTransactionYear } from "@/lib/currency";
 * ```
 */

export {
  getAvailableYears,
  getSupportedCurrencies,
  getTransactionYear,
  isSupportedCurrency,
  parseRatesCSV,
  toRON,
  toRONDetailed,
} from "./converter";
export type {ConversionResult, ExchangeRate} from "./types";
