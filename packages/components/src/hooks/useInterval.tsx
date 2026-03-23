"use client";

import * as React from "react";

/**
 * Executes a callback function at specified intervals with automatic cleanup.
 *
 * @remarks
 * This hook provides a declarative interface for `setInterval` that automatically
 * handles cleanup on unmount and ensures the latest callback is always invoked
 * (preventing stale closures). Setting the delay to `null` pauses the interval,
 * which is useful for implementing play/pause functionality.
 *
 * Unlike raw `setInterval`, this hook guarantees that the interval is cleared
 * when the component unmounts or when the delay changes, preventing memory leaks
 * and unexpected behavior.
 *
 * @param callback - The function to execute at each interval.
 * @param delay - The interval delay in milliseconds, or `null` to pause the interval.
 *
 * @example
 * ```tsx
 * function Timer() {
 *   const [count, setCount] = useState(0);
 *
 *   useInterval(() => {
 *     setCount((c) => c + 1);
 *   }, 1000);
 *
 *   return <div>Count: {count}</div>;
 * }
 * ```
 *
 * @example
 * ```tsx
 * function PausableTimer() {
 *   const [count, setCount] = useState(0);
 *   const [isRunning, setIsRunning] = useState(true);
 *
 *   useInterval(
 *     () => {
 *       setCount((c) => c + 1);
 *     },
 *     isRunning ? 1000 : null,
 *   );
 *
 *   return (
 *     <div>
 *       <div>Count: {count}</div>
 *       <button onClick={() => setIsRunning(!isRunning)}>
 *         {isRunning ? "Pause" : "Resume"}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = React.useRef(callback);

  // Update ref to latest callback on every render to avoid stale closures
  React.useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  React.useEffect(() => {
    // Don't schedule if delay is null
    if (delay === null) {
      return;
    }

    const intervalId = globalThis.setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, [delay]);
}
