/**
 * @fileoverview Small shared guards for serialized report trust boundaries.
 * @module github/scripts/helpers/reports/validation
 */

/** Maximum observed bytes accepted by standalone JSON report readers. */
export const MAX_REPORT_BYTES = 64 * 1024 * 1024;

/**
 * Requires a non-array object without trusting a parsed JSON assertion.
 * @param value - Untrusted field.
 * @param field - Diagnostic field path, never the rejected value.
 * @returns An object whose properties remain unknown.
 */
export function record(value: unknown, field: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`Invalid ${field}: expected object`);
  return value as Record<string, unknown>;
}

/**
 * Requires an array while keeping its elements untrusted.
 * @param value - Untrusted field.
 * @param field - Diagnostic field path.
 * @returns Unknown elements for the owning decoder.
 */
export function array(value: unknown, field: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`Invalid ${field}: expected array`);
  return value;
}

/**
 * Requires a serialized string.
 * @param value - Untrusted field.
 * @param field - Diagnostic field path.
 * @returns The validated string.
 */
export function text(value: unknown, field: string): string {
  if (typeof value !== "string") throw new TypeError(`Invalid ${field}: expected string`);
  return value;
}

/**
 * Requires a finite nonnegative measurement within an optional ceiling.
 * @param value - Untrusted field.
 * @param field - Diagnostic field path.
 * @param maximum - Inclusive upper bound.
 * @returns The validated measurement.
 */
export function finite(value: unknown, field: string, maximum = Number.POSITIVE_INFINITY): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > maximum)
    throw new TypeError(`Invalid ${field}: expected finite nonnegative number`);
  return value;
}

/**
 * Requires a nonnegative safe integer counter.
 * @param value - Untrusted field.
 * @param field - Diagnostic field path.
 * @returns The validated count.
 */
export function count(value: unknown, field: string): number {
  const result = finite(value, field);
  if (!Number.isSafeInteger(result)) throw new TypeError(`Invalid ${field}: expected safe integer`);
  return result;
}
