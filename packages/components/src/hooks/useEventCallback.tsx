"use client";

import * as React from "react";

/**
 * Creates a stable callback reference that always calls the latest version of the provided function.
 *
 * @remarks
 * Unlike `useCallback`, this hook returns a stable function reference that never changes,
 * but always invokes the most recent version of the callback. This is useful when you need
 * to pass callbacks to optimized child components or effects without triggering re-renders
 * when dependencies change.
 *
 * The returned function is safe to use in dependency arrays because its identity never changes.
 *
 * @typeParam Args - The tuple type of the callback's arguments.
 * @typeParam Return - The return type of the callback.
 * @param callback - The function to wrap with a stable reference.
 * @returns A stable function reference that invokes the latest callback.
 *
 * @example
 * ```tsx
 * function SearchInput({onSearch}) {
 *   const [query, setQuery] = useState("");
 *   // stableOnSearch never changes identity, but always calls the latest onSearch
 *   const stableOnSearch = useEventCallback(onSearch);
 *
 *   useEffect(() => {
 *     const timer = setTimeout(() => stableOnSearch(query), 500);
 *     return () => clearTimeout(timer);
 *   }, [query, stableOnSearch]); // Safe to include in deps
 *
 *   return <input value={query} onChange={(e) => setQuery(e.target.value)} />;
 * }
 * ```
 */
export function useEventCallback<Args extends unknown[], Return>(callback: (...args: Args) => Return): (...args: Args) => Return {
  const callbackRef = React.useRef(callback);

  React.useLayoutEffect(() => {
    callbackRef.current = callback;
  });

  return React.useCallback((...args: Args) => {
    return callbackRef.current(...args);
  }, []);
}
