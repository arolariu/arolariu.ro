"use client";

import {useMediaQuery} from "./useMediaQuery";

const BREAKPOINTS = [
  ["2xl", "(min-width: 1536px)"],
  ["xl", "(min-width: 1280px)"],
  ["lg", "(min-width: 1024px)"],
  ["md", "(min-width: 768px)"],
  ["sm", "(min-width: 640px)"],
] as const;

type Breakpoint = (typeof BREAKPOINTS)[number][0];

/**
 * Returns the name of the current CSS breakpoint based on viewport width.
 * Evaluates breakpoints from largest to smallest and returns the first match.
 *
 * @returns The active breakpoint name: `"sm"`, `"md"`, `"lg"`, `"xl"`, or `"2xl"`.
 *   Returns `"sm"` when no breakpoint matches (viewport narrower than 640px).
 *
 * @example
 * ```tsx
 * const bp = useBreakpoint(); // "lg" on a 1200px viewport
 * ```
 */
export function useBreakpoint(): Breakpoint {
  const is2xl = useMediaQuery("(min-width: 1536px)");
  const isXl = useMediaQuery("(min-width: 1280px)");
  const isLg = useMediaQuery("(min-width: 1024px)");
  const isMd = useMediaQuery("(min-width: 768px)");

  if (is2xl) return "2xl";
  if (isXl) return "xl";
  if (isLg) return "lg";
  if (isMd) return "md";

  return "sm";
}

export type {Breakpoint};
