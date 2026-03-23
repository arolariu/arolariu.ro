"use client";

import {useMediaQuery} from "./useMediaQuery";

/**
 * Returns whether the user prefers higher contrast.
 *
 * @remarks
 * Wraps a `prefers-contrast` media query in a semantic accessibility hook so components
 * can adapt borders, focus states, and surface styling without repeating query strings.
 *
 * @returns `true` when `prefers-contrast: more` is active.
 *
 * @example
 * ```tsx
 * const highContrast = usePrefersContrast();
 * ```
 *
 * @see {@link useMediaQuery} — Shared media-query subscription hook.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-contrast | MDN prefers-contrast}
 */
export function usePrefersContrast(): boolean {
  return useMediaQuery("(prefers-contrast: more)");
}
