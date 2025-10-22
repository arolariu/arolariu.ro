"use client";

import {useEffect, useState} from "react";

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
 */
export function useWindowSize(): HookReturnType {
  const [windowSize, setWindowSize] = useState<WindowSize>({width: null, height: null});

  useEffect(() => {
    /**
     * This function updates the window size.
     * It is created inside of useEffect and has a short lifespan.
     * After it is attached to the window object, it will be garbage collected
     *  when the component unmounts or the window is resized.
     */
    function __handleResize__() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", __handleResize__);
    __handleResize__(); // Call the function once to get the initial window size
    return () => window.removeEventListener("resize", __handleResize__);
  }, []); // Empty array ensures that effect is only run on mount

  return {
    windowSize,
    isMobile: typeof windowSize.width === "number" && windowSize.width < 768,
    isDesktop: typeof windowSize.width === "number" && windowSize.width >= 768,
  } as const;
}
