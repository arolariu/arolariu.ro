/**
 * @fileoverview `cx()` — a tiny class-name joiner used throughout the
 * `/human`, `/json`, and `/pdf` views to combine CSS Module classes
 * with conditional / external class strings.
 */

/** A value `cx` will accept — either a class string or a falsy short-circuit. */
type ClassValue = string | false | null | undefined;

/**
 * Joins CSS module classes and optional external class names.
 *
 * @param values - Class names or falsey values to join. Falsey entries are ignored.
 * @returns A space-delimited class string that preserves the order of truthy values.
 *
 * @example
 * ```typescript
 * cx(styles.button, isActive && styles.active, extraClass);
 * ```
 */
export function cx(...values: ReadonlyArray<ClassValue>): string {
  return values.filter((value): value is string => Boolean(value)).join(" ");
}
