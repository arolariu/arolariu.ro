"use client";

import * as React from "react";

/**
 * Subscribes to a CSS media query and returns whether it currently matches.
 * SSR-safe — returns `false` on the server until hydration.
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
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = globalThis.window.matchMedia(query);
    const onChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);

    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
