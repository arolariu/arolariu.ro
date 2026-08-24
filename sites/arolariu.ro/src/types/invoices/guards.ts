/**
 * @fileoverview Shared runtime type guards for the invoice transport boundary.
 * @module types/invoices/guards
 *
 * @remarks
 * These guards are the only primitives used to validate untrusted API JSON.
 * They exist in one place so that `Classification.ts`, `transport.ts`, and the
 * taxonomy catalog cannot drift apart.
 */

/**
 * Determines whether a value is a plain (non-null, non-array) object.
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` is a plain object record; `false` otherwise.
 *
 * @example
 * isRecord({a: 1})  // true
 * isRecord(null)    // false
 * isRecord([])      // false
 */
export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Determines whether every key in `record` is contained in `keys`.
 *
 * @param record - A plain object whose keys are checked.
 * @param keys - The exhaustive list of allowed key names.
 * @returns `true` when all keys of `record` are members of `keys`; `false` if any unexpected key is found.
 *
 * @example
 * hasOnlyKeys({a: 1}, ["a", "b"])       // true
 * hasOnlyKeys({a: 1, z: 2}, ["a", "b"]) // false
 */
export function hasOnlyKeys(record: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  return Object.keys(record).every((key) => keys.includes(key));
}

/**
 * Determines whether a value is a non-empty, non-whitespace-only string.
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` is a string with at least one non-whitespace character; `false` otherwise.
 *
 * @example
 * isNonEmptyString("ok") // true
 * isNonEmptyString("  ") // false
 * isNonEmptyString("")   // false
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Determines whether a value is a finite number (excludes `NaN` and `±Infinity`).
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` is a number and `Number.isFinite(value)` holds; `false` otherwise.
 *
 * @example
 * isFiniteNumber(0)                      // true
 * isFiniteNumber(Number.NaN)             // false
 * isFiniteNumber(Number.POSITIVE_INFINITY) // false
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Determines whether a value is a boolean primitive.
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` is strictly `true` or `false`; `false` for any other value including `0` or `1`.
 *
 * @example
 * isBoolean(false) // true
 * isBoolean(0)     // false
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

/**
 * Determines whether a value is a read-only array whose every element satisfies `guard`.
 *
 * @typeParam T - The element type asserted by `guard`.
 * @param value - The unknown value to test.
 * @param guard - A type-predicate function applied to each array element.
 * @returns `true` when `value` is an array and every element passes `guard`; `false` otherwise.
 *          An empty array always returns `true` (vacuous truth).
 *
 * @example
 * isArrayOf([], isNonEmptyString)          // true  — empty array
 * isArrayOf(["a", "b"], isNonEmptyString) // true
 * isArrayOf(["a", 1], isNonEmptyString)   // false — 1 is not a string
 */
export function isArrayOf<T>(value: unknown, guard: (item: unknown) => item is T): value is readonly T[] {
  return Array.isArray(value) && value.every((item) => guard(item));
}
