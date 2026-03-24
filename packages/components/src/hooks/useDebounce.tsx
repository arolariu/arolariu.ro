"use client";

import * as React from "react";

/**
 * Debounces a value, delaying updates until after the specified delay has elapsed.
 *
 * @remarks
 * This hook returns a debounced version of the provided value that only updates
 * after the value has stopped changing for the specified delay. Useful for optimizing
 * performance in scenarios like search inputs, where you want to avoid triggering
 * expensive operations on every keystroke.
 *
 * The debounce timer resets on every value change and cleans up automatically on unmount.
 *
 * @typeParam T - The type of the value being debounced.
 * @param value - The value to debounce.
 * @param delay - The delay in milliseconds before the debounced value updates.
 * @returns The debounced value.
 *
 * @example
 * ```tsx
 * function SearchInput() {
 *   const [searchTerm, setSearchTerm] = useState("");
 *   const debouncedSearchTerm = useDebounce(searchTerm, 500);
 *
 *   useEffect(() => {
 *     // Expensive search operation
 *     performSearch(debouncedSearchTerm);
 *   }, [debouncedSearchTerm]);
 *
 *   return <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />;
 * }
 * ```
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [value, delay]);

  return debouncedValue;
}
