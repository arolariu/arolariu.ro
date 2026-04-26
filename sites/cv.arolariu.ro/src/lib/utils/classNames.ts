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
