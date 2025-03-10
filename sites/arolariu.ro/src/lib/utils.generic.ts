/** @format */

import {Currency} from "@/types/DDD";

export const SITE_ENV = process.env["SITE_ENV"] ?? "";
export const SITE_URL = process.env["SITE_URL"] ?? "";
export const SITE_NAME = process.env["SITE_NAME"] ?? "";
export const COMMIT_SHA = process.env["COMMIT_SHA"] ?? "";
export const TIMESTAMP = process.env["TIMESTAMP"] ?? "";
export const CONFIG_STORE = process.env["CONFIG_STORE"] ?? "";

/**
 * Function that generates a GUID from an ArrayBuffer
 * @param arraybuffer The ArrayBuffer to generate the GUID from
 * @returns A UUIDv4 compliant GUID, converted to a string
 * @example
 * GUID: b23090df-9e68-4c12-ae2a-5368db13b6c1
 * GUID: 8b3f7b7e-6b1b-4b7b-8b1b-4b7b8b1b4b7b
 * GUID: b1624a43-1f96-4d22-b94f-d030cc5df437
 */
export function generateGuid(arraybuffer: ArrayBuffer): string {
  const byte_array = new Uint8Array(arraybuffer);
  byte_array[6] = (byte_array[6]! & 0x0f) | 0x40;
  byte_array[8] = (byte_array[8]! & 0x3f) | 0x80;
  const uuid_hex = [...byte_array].map((b) => b.toString(16).padStart(2, "0")).join("");

  const uuid_str = `${uuid_hex.slice(0, 8)}-${uuid_hex.slice(8, 12)}-${uuid_hex.slice(12, 16)}-${uuid_hex.slice(16, 20)}-${uuid_hex.slice(20, 32)}`;

  return uuid_str;
}

/**
 * Formats a number as a currency string based on the specified currency code
 * @param amount The numeric value to be formatted as currency
 * @param currency The ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP')
 * @returns A formatted currency string with the appropriate symbol and formatting
 * @example
 * // Returns "$123.45"
 * formatCurrency(123.45, "USD")
 *
 * // Returns "€100.00"
 * formatCurrency(100, "EUR")
 *
 * // Returns "£50.00"
 * formatCurrency(50, "GBP")
 */
export function formatCurrency(amount: number, currency?: string | Currency) {
  if (currency) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: typeof currency === "string" ? currency : currency.code,
    }).format(amount);
  } else {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  }
}

/**
 * Formats a date string into a human-readable format
 * @param dateString The date string to format (any valid date format accepted by Date constructor)
 * @returns A formatted date string in the format "MMM D, YYYY" (e.g., "Mar 15, 2023")
 * @example
 * // Returns "Mar 15, 2023"
 * formatDate("2023-03-15")
 *
 * // Returns "Jan 1, 2023"
 * formatDate("2023-01-01T00:00:00Z")
 */
export function formatDate(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
