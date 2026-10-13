"use client";

import * as React from "react";

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 * SSR-safe — returns `false` on the server and during hydration, then the current match.
 *
 * @param query - A valid CSS media query string (e.g. `"(min-width: 768px)"`).
 * @returns `true` when the media query matches, `false` otherwise.
 *
 * @example
 * ```tsx
 * const isWide = useMediaQuery("(min-width: 1024px)");
 * ```
 */
export function useMediaQuery(query: string): boolean {
  const store = React.useMemo(() => {
    const mql = globalThis.window?.matchMedia(query);
    let matches = mql?.matches ?? false;

    const subscribe = (onStoreChange: () => void): (() => void) => {
      const onChange = (event: MediaQueryListEvent): void => {
        const {matches: nextMatches} = event;
        matches = nextMatches;
        onStoreChange();
      };

      mql?.addEventListener("change", onChange);
      // Recheck after subscribing to catch changes between render and subscription or reconnection.
      matches = mql?.matches ?? false;

      return () => mql?.removeEventListener("change", onChange);
    };

    return {getSnapshot: (): boolean => matches, subscribe};
  }, [query]);

  return React.useSyncExternalStore(store.subscribe, store.getSnapshot, () => false);
}
