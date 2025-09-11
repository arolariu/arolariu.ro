"use client";

import {useEffect, useState} from "react";

const MOBILE_BREAKPOINT = 768;

type WindowSize = {
  width: number | null;
  height: number | null;
};

type HookReturnType = Readonly<{
  windowSize: WindowSize;
  isMobile: boolean;
  isDesktop: boolean;
}>;

/**
 * Client hook to get the window size and whether the window is mobile or desktop.
 * @returns An object containing the window size and whether the window is mobile or desktop.
 *@example
 * ```tsx
 * function MyComponent() {
 *   const { windowSize, isMobile, isDesktop } = useWindowSize();
 *
 *   return (
 *     <div>
 *       <p>Window Size: {windowSize.width} x {windowSize.height}</p>
 *       <p>{isMobile ? 'Mobile View' : 'Desktop View'}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWindowSize(): HookReturnType {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: null,
    height: null,
  });

  useEffect(() => {
    /**
     * This function updates the window size.
     * It is created inside of useEffect and has a short lifespan.
     * After it is attached to the window object, it will be garbage collected
     *  when the component unmounts or the window is resized.
     */
    function __handleResize__() {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      setWindowSize({
        width: globalThis.window.innerWidth,
        height: globalThis.window.innerHeight,
      });
    }

    globalThis.window.addEventListener("resize", __handleResize__);
    __handleResize__(); // Call the function once to get the initial window size
    return () => globalThis.window.removeEventListener("resize", __handleResize__);
  }, []); // Empty array ensures that effect is only run on mount

  return {
    windowSize,
    isMobile: typeof windowSize.width === "number" && windowSize.width < MOBILE_BREAKPOINT,
    isDesktop: typeof windowSize.width === "number" && windowSize.width >= MOBILE_BREAKPOINT,
  } as const;
}

