"use client";

import * as React from "react";

/**
 * Tracks and returns the value from the previous committed render.
 *
 * @remarks
 * The stored value is updated in an effect after each commit in which `value` changed. Therefore:
 * - on the first render it returns `undefined`;
 * - on the render where `value` changes it returns the prior value;
 * - on a later render where `value` did not change it returns the current value (it is not "the previous distinct
 *   value"). Compare against it only on renders caused by a change of `value`.
 *
 * Useful for detecting changes or creating animations based on value transitions.
 *
 * @typeParam T - The type of the value being tracked.
 * @param value - The current value to track.
 * @returns The value as of the previous committed render, or `undefined` on the first render.
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
