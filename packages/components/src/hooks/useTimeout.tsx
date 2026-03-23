"use client";

import * as React from "react";

/**
 * Executes a callback after a specified delay with automatic cleanup.
 *
 * @remarks
 * This hook wraps `setTimeout` and automatically clears the timeout when the component
 * unmounts or when the delay changes. Setting `delay` to `null` disables the timeout.
 *
 * The timeout is reset whenever the `callback` or `delay` changes, ensuring the most
 * recent callback is always executed.
 *
 * @param callback - The function to execute after the delay.
 * @param delay - The delay in milliseconds, or `null` to disable the timeout.
 *
 * @example
 * ```tsx
 * function DelayedMessage() {
 *   const [visible, setVisible] = useState(false);
 *
 *   useTimeout(() => {
 *     setVisible(true);
 *   }, 3000);
 *
 *   return visible ? <p>Message appeared!</p> : <p>Waiting...</p>;
 * }
 * ```
 */
export function useTimeout(callback: () => void, delay: number | null): void {
  const savedCallback = React.useRef(callback);

  React.useLayoutEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  React.useEffect(() => {
    if (delay === null) {
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      savedCallback.current();
    }, delay);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [delay]);
}
