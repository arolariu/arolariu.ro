"use client";

import * as React from "react";

/**
 * Throttles a callback function, limiting how often it can be invoked.
 *
 * @remarks
 * This hook returns a throttled version of the provided callback that can only
 * be executed once per specified interval. Subsequent calls within the interval
 * are ignored. Useful for rate-limiting expensive operations triggered by high-frequency
 * events like scrolling, resizing, or mouse movement.
 *
 * Unlike debouncing, throttling ensures the callback is invoked at regular intervals
 * during continuous events, providing more predictable execution timing.
 *
 * @typeParam Args - The tuple type of the callback's arguments.
 * @param callback - The function to throttle.
 * @param delay - The minimum interval in milliseconds between invocations.
 * @returns A throttled version of the callback.
 *
 * @example
 * ```tsx
 * function ScrollTracker() {
 *   const [scrollPos, setScrollPos] = useState(0);
 *
 *   const handleScroll = useThrottle(() => {
 *     setScrollPos(window.scrollY);
 *   }, 200);
 *
 *   useEffect(() => {
 *     window.addEventListener("scroll", handleScroll);
 *     return () => window.removeEventListener("scroll", handleScroll);
 *   }, [handleScroll]);
 *
 *   return <p>Scroll position: {scrollPos}</p>;
 * }
 * ```
 */
export function useThrottle<Args extends unknown[]>(callback: (...args: Args) => void, delay: number): (...args: Args) => void {
  const lastRunRef = React.useRef(0);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        globalThis.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return React.useCallback(
    (...args: Args) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRunRef.current;

      if (timeSinceLastRun >= delay) {
        callback(...args);
        lastRunRef.current = now;
      } else {
        if (timeoutRef.current) {
          globalThis.clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = globalThis.setTimeout(() => {
          callback(...args);
          lastRunRef.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    },
    [callback, delay],
  );
}
