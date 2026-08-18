/**
 * @fileoverview Shared validation primitives for strict invoice transport contracts.
 * @module types/invoices/transportValidation
 */

const rfc3339Pattern =
  /^(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})T(?<hour>\d{2}):(?<minute>\d{2}):(?<second>\d{2})(?:\.\d+)?(?:Z|[+-](?<offsetHour>\d{2}):(?<offsetMinute>\d{2}))$/u;
const guidPattern = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/iu;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  switch (month) {
    case 2:
      return isLeapYear(year) ? 29 : 28;
    case 4:
    case 6:
    case 9:
    case 11:
      return 30;
    default:
      return 31;
  }
}

/**
 * Determines whether a transport value is a canonical GUID string.
 *
 * @param value - Untrusted transport value.
 * @returns Whether the value has the standard 8-4-4-4-12 GUID shape.
 */
export function isGuid(value: unknown): value is string {
  return typeof value === "string" && guidPattern.test(value);
}

/**
 * Determines whether a value is a strict RFC 3339 timestamp emitted by backend .NET transport.
 *
 * @remarks
 * The check rejects JavaScript's permissive date parsing, validates calendar dates
 * without normalizing overflow, and requires a timezone designator.
 *
 * @param value - Untrusted transport value to validate.
 * @returns Whether the value is a valid strict RFC 3339 timestamp.
 */
export function isStrictRfc3339Timestamp(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const match = rfc3339Pattern.exec(value);
  const groups = match?.groups;
  if (groups === undefined) {
    return false;
  }

  const year = Number(groups["year"]);
  const month = Number(groups["month"]);
  const day = Number(groups["day"]);
  const hour = Number(groups["hour"]);
  const minute = Number(groups["minute"]);
  const second = Number(groups["second"]);
  const offsetHour = groups["offsetHour"] === undefined ? 0 : Number(groups["offsetHour"]);
  const offsetMinute = groups["offsetMinute"] === undefined ? 0 : Number(groups["offsetMinute"]);

  return (
    month >= 1
    && month <= 12
    && day >= 1
    && day <= daysInMonth(year, month)
    && hour <= 23
    && minute <= 59
    && second <= 59
    && offsetHour <= 23
    && offsetMinute <= 59
  );
}
