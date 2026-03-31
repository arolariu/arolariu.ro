/**
 * @fileoverview Generic utilities and environment-derived constants.
 * @module sites/arolariu.ro/src/lib/utils.generic
 */

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
 * Regular expression pattern for validating UUID v4 and v7 formats.
 *
 * @remarks
 * Matches the standard UUID format: `xxxxxxxx-xxxx-Vxxx-yxxx-xxxxxxxxxxxx`
 * where `V` is the version nibble (`4` for v4, `7` for v7),
 * `x` is any hexadecimal digit, and `y` is one of `8`, `9`, `a`, or `b`.
 *
 * @see {@link https://tools.ietf.org/html/rfc4122#section-4.4} - RFC 4122 Section 4.4
 * @see {@link https://www.ietf.org/archive/id/draft-peabody-dispatch-new-uuid-format-04.html} - UUID v7
 */
const UUID_REGEX = /^[\da-f]{8}-[\da-f]{4}-[47][\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/iu;

/**
 * Asserts that a given string is a valid UUID (v4 or v7) or a special sentinel GUID.
 *
 * @remarks
 * This function validates that the input string conforms to the UUID v4 or v7
 * specification, or is one of the special sentinel GUIDs (EMPTY_GUID or LAST_GUID).
 * It throws an error if the input is invalid, making it suitable for
 * runtime validation of identifiers in server actions.
 *
 * **Validation Rules:**
 * - Must be a non-empty string
 * - Must match one of:
 *   - UUID v4 format: `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`
 *   - UUID v7 format: `xxxxxxxx-xxxx-7xxx-yxxx-xxxxxxxxxxxx`
 *   - EMPTY_GUID: `00000000-0000-0000-0000-000000000000`
 *   - LAST_GUID: `99999999-9999-9999-9999-999999999999`
 *
 * @param input - The string to validate as a UUID or sentinel GUID.
 * @param paramName - Optional parameter name for error messages (defaults to "identifier").
 * @throws {Error} If the input is not a valid UUID or sentinel GUID string.
 *
 * @example
 * ```typescript
 * // Valid UUID v4 - no error thrown
 * assertValidGuid("550e8400-e29b-41d4-a716-446655440000");
 *
 * // Valid sentinel GUIDs - no error thrown
 * assertValidGuid("00000000-0000-0000-0000-000000000000"); // EMPTY_GUID
 * assertValidGuid("99999999-9999-9999-9999-999999999999"); // LAST_GUID
 *
 * // Invalid - throws Error
 * assertValidGuid("not-a-guid"); // Error: Invalid identifier: "not-a-guid" is not a valid GUID
 *
 * // With custom parameter name
 * assertValidGuid(invoiceId, "invoiceId"); // Error: Invalid invoiceId: "..." is not a valid GUID
 * ```
 */
export function validateStringIsGuidType(input: string, paramName = "identifier"): asserts input is string {
  if (typeof input !== "string" || input.length === 0) {
    throw new Error(`Invalid ${paramName}: expected a non-empty string, got ${typeof input}`);
  }

  // Allow special sentinel GUIDs
  if (input === EMPTY_GUID || input === LAST_GUID) {
    return;
  }

  if (!UUID_REGEX.test(input)) {
    throw new Error(`Invalid ${paramName}: "${input}" is not a valid GUID`);
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
export function formatDate(possibleDate: string | Date | null | undefined, options: FormatDateOptions): string {
  const date: Date = toSafeDate(possibleDate);
  if (date.getTime() === 0) return "";

  // Don't apply dateStyle default when individual fields (year, month, day) are specified
  // because Intl.DateTimeFormat throws if dateStyle is mixed with individual fields.
  const hasIndividualFields = options.year ?? options.month ?? options.day ?? options.weekday ?? options.era;
  const formatOptions: Intl.DateTimeFormatOptions = {
    ...(hasIndividualFields ? {} : {dateStyle: "short" as const}),
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

// #region Date & Number Utilities (Phase 9 — centralized formatting)

/**
 * Safely converts any date-like value to a Date object.
 *
 * @remarks
 * Handles ISO strings, Date objects, null, and undefined.
 * Returns `new Date(0)` (epoch) for invalid/missing input rather than throwing.
 *
 * @param value - The date-like value to convert
 * @returns A valid Date object
 *
 * @example
 * ```typescript
 * toSafeDate("2024-01-15T10:30:00Z"); // Date object
 * toSafeDate(new Date());              // Same Date object
 * toSafeDate(null);                    // Date(0) — epoch
 * ```
 */
export function toSafeDate(value: Date | string | null | undefined): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string" && value.length > 0) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
  }
  return new Date(0);
}

/**
 * Formats a numeric amount with locale-aware thousand separators and decimals.
 *
 * @remarks
 * Replaces raw `.toFixed(2)` usage across the codebase.
 * Uses `Intl.NumberFormat` for proper locale-aware formatting.
 *
 * Unlike `formatCurrency`, this does NOT include a currency symbol — it
 * formats the number only (e.g., "1,234.56" instead of "$1,234.56").
 *
 * @param amount - The numeric value to format
 * @param locale - The locale string (defaults to "en-US")
 * @param decimals - Number of decimal places (defaults to 2)
 * @returns Locale-aware formatted number string
 *
 * @example
 * ```typescript
 * formatAmount(1234.5);                    // "1,234.50"
 * formatAmount(1234.5, "de-DE");           // "1.234,50"
 * formatAmount(1234.5, "en-US", 0);        // "1,235"
 * ```
 */
export function formatAmount(amount: number, locale = "en-US", decimals = 2): string {
  if (!Number.isFinite(amount)) return "0.00";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/**
 * Formats a date with both date and time components.
 *
 * @remarks
 * Extends `formatDate` by including time information.
 * Uses `Intl.DateTimeFormat` for locale-aware formatting.
 *
 * @param date - The date to format (ISO string or Date object)
 * @param locale - The locale string (defaults to "en-US")
 * @param options - Optional Intl.DateTimeFormatOptions overrides
 * @returns Formatted datetime string
 *
 * @example
 * ```typescript
 * formatDateTime("2024-01-15T10:30:00Z");
 * // "1/15/2024, 10:30 AM"
 *
 * formatDateTime(new Date(), "ro-RO");
 * // "15.01.2024, 10:30"
 * ```
 */
export function formatDateTime(date: Date | string | null | undefined, locale = "en-US", options?: Intl.DateTimeFormatOptions): string {
  const dateObj = toSafeDate(date);
  if (dateObj.getTime() === 0) return "";

  const formatOptions: Intl.DateTimeFormatOptions = {
    dateStyle: "short",
    timeStyle: "short",
    ...options,
  };

  return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj);
}

/**
 * Formats a date as a human-readable relative time string.
 *
 * @remarks
 * Consolidates 3 scattered `getRelativeTime` implementations into one.
 * Handles both Date objects and ISO strings.
 *
 * **Output examples:**
 * - "just now" (< 1 minute)
 * - "5 minutes ago"
 * - "2 hours ago"
 * - "3 days ago"
 * - "2 weeks ago"
 * - "1 month ago"
 *
 * @param date - The date to format relative to now
 * @returns Human-readable relative time string
 *
 * @example
 * ```typescript
 * formatRelativeTime(new Date(Date.now() - 5 * 60_000));  // "5 minutes ago"
 * formatRelativeTime("2024-01-01T00:00:00Z");              // "6 months ago"
 * ```
 */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  const dateObj = toSafeDate(date);
  if (dateObj.getTime() === 0) return "";

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(Math.abs(diffMs) / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  const isFuture = diffMs < 0;
  const suffix = isFuture ? "from now" : "ago";

  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ${suffix}`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ${suffix}`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ${suffix}`;
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks === 1 ? "" : "s"} ${suffix}`;
  return `${diffMonths} month${diffMonths === 1 ? "" : "s"} ${suffix}`;
}

// #endregion
