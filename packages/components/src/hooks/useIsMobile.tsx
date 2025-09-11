"use client";
import * as React from "react";

const MOBILE_BREAKPOINT = 768;

/**
 * A custom React hook that detects whether the current device is a mobile device
 * based on the screen width.
 * This hook uses a media query to check if the viewport width is less than the defined
 * mobile breakpoint (768px). It updates the state when the window size changes.
 * @returns Returns true if the viewport width is less than the mobile breakpoint,
 * false otherwise.
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMobile = useIsMobile();
 *
 *   return (
 *     <div>
 *       {isMobile ? 'Mobile View' : 'Desktop View'}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    const mql = globalThis.window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setIsMobile(globalThis.window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    setIsMobile(globalThis.window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return Boolean(isMobile);
}

