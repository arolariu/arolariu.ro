/** @format */

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
export default function useWindowSize(): HookReturnType {
  const [windowSize, setWindowSize] = useState<WindowSize>({width: null, height: null});

  useEffect(() => {
    /**
     * Event handler to update the window size.
     */
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount

  return {
    windowSize,
    isMobile: typeof windowSize.width === "number" && windowSize.width < 768,
    isDesktop: typeof windowSize.width === "number" && windowSize.width >= 768,
  };
}
