import {v4, v5} from "uuid";

/* v8 ignore start - Environment variables evaluated at module load time cannot be unit tested */

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

/* v8 ignore stop */

// ============================================================================
// Sharing Constants
// ============================================================================

/**
 * The maximum possible GUID value (all 9s).
 *
 * @remarks
 * Used as a sentinel value to represent special states such as "public" access.
 * For example, when this GUID is present in an invoice's `sharedWith` array,
 * the invoice is publicly accessible to anyone with the link.
 *
 * **Value**: `"99999999-9999-9999-9999-999999999999"`
 *
 * @see {@link EMPTY_GUID} - The minimum GUID value (all 0s)
 */
export const LAST_GUID = "99999999-9999-9999-9999-999999999999";

/**
 * Empty GUID representing no value or uninitialized state (all 0s).
 *
 * @remarks
 * Used as a placeholder or default value when a GUID is required but
 * no meaningful value exists.
 *
 * **Value**: `"00000000-0000-0000-0000-000000000000"`
 */
export const EMPTY_GUID = "00000000-0000-0000-0000-000000000000";

/**
 * Regular expression pattern for validating UUID v4 format.
 *
 * @remarks
 * Matches the standard UUID v4 format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
 * where `x` is any hexadecimal digit and `y` is one of `8`, `9`, `a`, or `b`.
 *
 * @see {@link https://tools.ietf.org/html/rfc4122#section-4.4} - RFC 4122 Section 4.4
 */
const UUID_V4_REGEX = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;

/**
 * Asserts that a given string is a valid UUID v4 format.
 *
 * @remarks
 * This function validates that the input string conforms to the UUID v4 specification.
 * It throws an error if the input is not a valid UUID v4, making it suitable for
 * runtime validation of identifiers in server actions.
 *
 * **Validation Rules:**
 * - Must be a non-empty string
 * - Must match the UUID v4 format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
 * - Version digit (position 14) must be `4`
 * - Variant digit (position 19) must be `8`, `9`, `a`, or `b`
 *
 * @param input - The string to validate as a UUID v4.
 * @param paramName - Optional parameter name for error messages (defaults to "identifier").
 * @throws {Error} If the input is not a valid UUID v4 string.
 *
 * @example
 * ```typescript
 * // Valid UUID v4 - no error thrown
 * assertValidGuid("550e8400-e29b-41d4-a716-446655440000");
 *
 * // Invalid - throws Error
 * assertValidGuid("not-a-guid"); // Error: Invalid identifier: "not-a-guid" is not a valid UUID v4
 *
 * // With custom parameter name
 * assertValidGuid(invoiceId, "invoiceId"); // Error: Invalid invoiceId: "..." is not a valid UUID v4
 * ```
 */
export function validateStringIsGuidType(input: string, paramName = "identifier"): asserts input is string {
  if (typeof input !== "string" || input.length === 0) {
    throw new Error(`Invalid ${paramName}: expected a non-empty string, got ${typeof input}`);
  }

  if (!UUID_V4_REGEX.test(input)) {
    throw new Error(`Invalid ${paramName}: "${input}" is not a valid UUID v4`);
  }
}

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
  const formatOptions: Intl.NumberFormatOptions = {
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

  if (typeof possibleDate === "string") {
    date = new Date(possibleDate);
  } else if (possibleDate instanceof Date) {
    date = possibleDate;
  }

  const formatOptions: Intl.DateTimeFormatOptions = {
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
 * // Direct usage
 * formatEnum(Status, 1); // "Active"
 *
 * // Curried usage (factory pattern)
 * const formatStatus = formatEnum(Status);
 * formatStatus(1); // "Active"
 * ```
 */
// eslint-disable-next-line no-redeclare -- TypeScript function overload signatures
export function formatEnum<T extends Record<string, string | number>>(enumObj: T, value: number): string;
// eslint-disable-next-line no-redeclare -- TypeScript function overload signatures
export function formatEnum<T extends Record<string, string | number>>(enumObj: T): (value: number) => string;
// eslint-disable-next-line no-redeclare, sonarjs/function-return-type -- TypeScript function overload signatures
export function formatEnum<T extends Record<string, string | number>>(enumObj: T, value?: number): string | ((value: number) => string) {
  if (value !== undefined) {
    const key = Object.keys(enumObj).find((k) => enumObj[k] === value);
    return key ?? "";
  }

  return (val: number) => {
    const key = Object.keys(enumObj).find((k) => enumObj[k] === val);
    return key ?? "";
  };
}
