/**
 * @fileoverview Currency value object for monetary representation.
 * @module types/DDD/SharedKernel/Currency
 */

/**
 * Currency value object representing monetary currency with ISO 4217 standard properties.
 *
 * @remarks
 * **Domain-Driven Design Concept:** Value Object in the Shared Kernel.
 *
 * **Value Object Characteristics:**
 * - Immutable (no setters, create new instance for changes)
 * - Equality by value, not identity (two currencies with same code are equal)
 * - No lifecycle or identity (unlike entities)
 * - Shared across multiple bounded contexts
 *
 * **ISO 4217 Standard:** Currency codes follow international standard.
 *
 * **Properties:**
 * - `name`: Full currency name (e.g., "United States Dollar")
 * - `code`: ISO 4217 3-letter code (e.g., "USD")
 * - `symbol`: Currency symbol for display (e.g., "$")
 *
 * **Common Currencies:**
 * - USD: United States Dollar ($)
 * - EUR: Euro (€)
 * - GBP: British Pound (£)
 * - JPY: Japanese Yen (¥)
 * - RON: Romanian Leu (lei)
 *
 * @example
 * ```typescript
 * const usd: Currency = {
 *   name: "United States Dollar",
 *   code: "USD",
 *   symbol: "$"
 * };
 *
 * const eur: Currency = {
 *   name: "Euro",
 *   code: "EUR",
 *   symbol: "€"
 * };
 * ```
 *
 * @example
 * ```typescript
 * // Formatting with currency
 * function formatAmount(amount: number, currency: Currency): string {
 *   return `${currency.symbol}${amount.toFixed(2)}`;
 * }
 *
 * formatAmount(123.45, usd); // "$123.45"
 * formatAmount(99.99, eur);  // "€99.99"
 * ```
 *
 * @example
 * ```typescript
 * // Common currencies
 * const CURRENCIES: Record<string, Currency> = {
 *   USD: { name: "United States Dollar", code: "USD", symbol: "$" },
 *   EUR: { name: "Euro", code: "EUR", symbol: "€" },
 *   GBP: { name: "British Pound", code: "GBP", symbol: "£" },
 *   RON: { name: "Romanian Leu", code: "RON", symbol: "lei" }
 * };
 * ```
 *
 * @see {@link https://en.wikipedia.org/wiki/ISO_4217|ISO 4217 Standard}
 */
export type Currency = {
  /**
   * Full name of the currency.
   *
   * @remarks
   * Human-readable name for display in UI and documentation.
   *
   * @example
   * - "United States Dollar"
   * - "Euro"
   * - "Romanian Leu"
   */
  name: string;

  /**
   * ISO 4217 three-letter currency code.
   *
   * @remarks
   * Standard code used in financial systems and APIs.
   *
   * **Format:** Exactly 3 uppercase letters.
   *
   * @example
   * - "USD" (United States Dollar)
   * - "EUR" (Euro)
   * - "RON" (Romanian Leu)
   *
   * @see {@link https://en.wikipedia.org/wiki/ISO_4217|ISO 4217 codes}
   */
  code: string;

  /**
   * Currency symbol for compact display.
   *
   * @remarks
   * Used for formatting monetary amounts in UI.
   *
   * **Format:** Unicode symbol or abbreviation.
   *
   * **Display:** Typically appears before or after amount based on locale.
   *
   * @example
   * - "$" (US Dollar)
   * - "€" (Euro)
   * - "£" (British Pound)
   * - "lei" (Romanian Leu)
   */
  symbol: string;
};
