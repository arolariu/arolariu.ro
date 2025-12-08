import {v4, v5} from "uuid";

/**
 * The environment in which the site is running.
 *
 * @remarks
 * **Source**: `process.env.SITE_ENV`
 *
 * **Usage**: Used to determine feature flags, logging levels, and API endpoints.
 *
 * **Values**: Typically "development", "production", or "test".
 */
export const SITE_ENV = process.env["SITE_ENV"] ?? "";

/**
 * The base URL of the site.
 *
 * @remarks
 * **Source**: `process.env.SITE_URL`
 *
 * **Usage**: Used for generating absolute URLs for SEO, OpenGraph, and redirects.
 *
 * **Example**: "https://arolariu.ro"
 */
export const SITE_URL = process.env["SITE_URL"] ?? "";

/**
 * The name of the site.
 *
 * @remarks
 * **Source**: `process.env.SITE_NAME`
 *
 * **Usage**: Used for page titles, metadata, and branding.
 *
 * **Default**: "arolariu.ro" (if set in env).
 */
export const SITE_NAME = process.env["SITE_NAME"] ?? "";

/**
 * The commit SHA of the current build.
 *
 * @remarks
 * **Source**: `process.env.COMMIT_SHA`
 *
 * **Usage**: Used for Sentry releases, telemetry, and debugging version issues.
 *
 * **Format**: Full 40-character SHA-1 hash or short hash.
 */
export const COMMIT_SHA = process.env["COMMIT_SHA"] ?? "";

/**
 * The timestamp of the current build.
 *
 * @remarks
 * **Source**: `process.env.TIMESTAMP`
 *
 * **Usage**: Displayed in the footer or debug info to indicate build age.
 *
 * **Format**: ISO 8601 date string.
 */
export const TIMESTAMP = process.env["TIMESTAMP"] ?? "";

/**
 * The configuration store identifier.
 *
 * @remarks
 * **Source**: `process.env.CONFIG_STORE`
 *
 * **Usage**: Identifies the Azure App Configuration store or local config source.
 */
export const CONFIG_STORE = process.env["CONFIG_STORE"] ?? "";

/**
 * Generates a UUID v4 (random) or v5 (namespaced) string.
 *
 * @remarks
 * **Behavior:**
 * - If a `seed` is provided, generates a deterministic UUID v5 using the DNS namespace.
 * - If no `seed` is provided, generates a random UUID v4.
 *
 * **Usage Context:**
 * - Use without seed for unique identifiers (primary keys).
 * - Use with seed for deterministic identifiers based on input data (e.g., hashing).
 *
 * @param seed - Optional seed string or byte array for deterministic UUID generation.
 * @returns A standard UUID string (e.g., "b23090df-9e68-4c12-ae2a-5368db13b6c1").
 *
 * @example
 * ```typescript
 * // Random UUID v4
 * const id = generateGuid();
 *
 * // Deterministic UUID v5
 * const hash = generateGuid("my-seed-string");
 * ```
 */
export function generateGuid(seed?: string | Uint8Array): Readonly<string> {
  // If a seed is provided, use it to generate a consistent UUID
  if (seed) {
    const guid = v5(seed, v5.DNS);
    return guid;
  } else {
    // Generate a random UUIDv4
    const guid = v4();
    return guid;
  }
}

/**
 * Configuration options for currency formatting.
 *
 * @remarks
 * Controls the output style of `formatCurrency` using `Intl.NumberFormat` options.
 */
interface FormatCurrencyOptions extends Partial<Intl.NumberFormatOptions> {
  /**
   * The ISO 4217 currency code (e.g., "USD", "EUR").
   * Required if style is "currency".
   */
  currencyCode: string;
  /**
   * The locale to use for formatting.
   */
  locale: string;
}

/**
 * Formats a numeric amount as a localized currency string.
 *
 * @remarks
 * Uses `Intl.NumberFormat` for consistent formatting.
 *
 * **Formatting Rules:**
 * - Default Locale: "en-US"
 * - Default Style: Currency
 * - Default Currency: "USD" (if not specified)
 *
 * @param possibleAmount - The numeric value to format.
 * @param options - Formatting configuration (currency code, locale, etc.).
 * @returns Formatted currency string (e.g., "$1,234.56").
 *
 * @example
 * ```typescript
 * formatCurrency(1234.56, { currency: "USD" }); // "$1,234.56"
 * formatCurrency(100, { currency: "EUR", locale: "de-DE" }); // "100,00 €"
 * ```
 */
export function formatCurrency(possibleAmount: number, options: FormatCurrencyOptions): string {
  let formatOptions: Intl.NumberFormatOptions = {};

  formatOptions = {
    style: "currency",
    currency: options.currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
    ...options,
  };

  const value = new Intl.NumberFormat(options.locale, formatOptions).format(possibleAmount);
  return value;
}

/**
 * Configuration options for date and time formatting.
 *
 * @remarks
 * Controls the output style of `formatDate` using `Intl.DateTimeFormat` options.
 */
export interface FormatDateOptions extends Partial<Intl.DateTimeFormatOptions> {
  /**
   * The locale to use for formatting.
   * @default "en-US"
   */
  locale: string;
}

/**
 * Formats a date string or object into a human-readable string.
 *
 * @remarks
 * **Behavior:**
 * - Handles both ISO date strings and Date objects.
 * - Returns empty string if input is invalid or missing.
 * - Uses `Intl.DateTimeFormat` for localization.
 *
 * **Defaults:**
 * - Locale: "en-US"
 * - Date Style: "short" (e.g., "10/12/23")
 *
 * @param possibleDate - The date to format (ISO string or Date object).
 * @param options - Formatting configuration (style, locale).
 * @returns Formatted date string or empty string if invalid.
 *
 * @example
 * ```typescript
 * formatDate("2023-10-12"); // "10/12/23"
 * formatDate(new Date(), { dateStyle: "full" }); // "Thursday, October 12, 2023"
 * ```
 */
export function formatDate(possibleDate: string | Date, options: FormatDateOptions): string {
  let date: Date | undefined;
  let formatOptions: Intl.DateTimeFormatOptions = {};

  if (typeof possibleDate === "string") {
    date = new Date(possibleDate);
  } else if (possibleDate instanceof Date) {
    date = possibleDate;
  }

  formatOptions = {
    dateStyle: "short",
    ...options,
  };

  const value = new Intl.DateTimeFormat(options.locale, formatOptions).format(date);
  return value;
}

/**
 * Converts a numeric enum value back to its string key.
 *
 * @remarks
 * **Usage Context:**
 * Useful for displaying human-readable labels for numeric enums.
 *
 * **Limitations:**
 * - Only works for numeric enums where values are unique.
 * - Returns empty string if value is not found.
 *
 * @param enumObj - The enum object definition.
 * @param value - The numeric value to look up.
 * @returns The string key corresponding to the value, or empty string.
 *
 * @example
 * ```typescript
 * enum Status { Active = 1, Inactive = 0 }
 * formatEnum(Status, 1); // "Active"
 * ```
 */
export function formatEnum<T extends Record<string, string | number>>(enumObj: T, value: number): string {
  const key = Object.keys(enumObj).find((k) => enumObj[k] === value);
  return key ?? "";
}
