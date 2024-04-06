import {useEffect, useState} from "react";

/**
 * Client hook to get the window size and whether the window is mobile or desktop.
 * @returns An object containing the window size and whether the window is mobile or desktop.
 */
export default function useWindowSize() {
  const [windowSize, setWindowSize] = useState<{
    width: number | undefined;
    height: number | undefined;
  }>({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    /**
     * Function that handles the window resize event.
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
