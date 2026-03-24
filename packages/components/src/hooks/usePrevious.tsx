"use client";

import * as React from "react";

/**
 * Tracks and returns the previous value of a state or prop.
 *
 * @remarks
 * This hook stores the value from the previous render cycle, allowing you to compare
 * current and previous values. On the initial render, it returns `undefined` since
 * there is no previous value yet.
 *
 * Useful for detecting changes, implementing undo functionality, or creating
 * animations based on value transitions.
 *
 * @typeParam T - The type of the value being tracked.
 * @param value - The current value to track.
 * @returns The value from the previous render, or `undefined` on the first render.
 *
 * @example
 * ```tsx
 * function Counter() {
 *   const [count, setCount] = useState(0);
 *   const previousCount = usePrevious(count);
 *
 *   return (
 *     <div>
 *       <p>Current: {count}</p>
 *       <p>Previous: {previousCount ?? "N/A"}</p>
 *       <button onClick={() => setCount(count + 1)}>Increment</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = React.useRef<T | undefined>(undefined);

  React.useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
}
