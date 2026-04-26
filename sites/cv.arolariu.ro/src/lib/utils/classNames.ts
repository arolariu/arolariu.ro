type ClassValue = string | false | null | undefined;

/**
 * Joins CSS module classes and optional external class names.
 */
export function cx(...values: ReadonlyArray<ClassValue>): string {
  return values.filter((value): value is string => Boolean(value)).join(" ");
}
