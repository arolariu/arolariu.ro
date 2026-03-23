"use client";

import {useMediaQuery} from "./useMediaQuery";

/**
 * A custom React hook that detects whether the current device is a mobile device
 * based on the screen width (viewport < 768px).
 *
 * @returns `true` if the viewport width is less than 768px, `false` otherwise.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isMobile = useIsMobile();
 *   return <div>{isMobile ? 'Mobile View' : 'Desktop View'}</div>;
 * }
 * ```
 */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
