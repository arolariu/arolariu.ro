"use client";

import {useMediaQuery} from "./useMediaQuery";

type ColorScheme = "light" | "dark";

/**
 * Returns the user's system color scheme preference.
 *
 * @returns `"dark"` when the system prefers dark mode, `"light"` otherwise.
 *
 * @example
 * ```tsx
 * const scheme = useColorScheme(); // "dark"
 * ```
 */
export function useColorScheme(): ColorScheme {
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");

  return prefersDark ? "dark" : "light";
}

export type {ColorScheme};
