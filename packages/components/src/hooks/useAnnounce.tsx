"use client";

import * as React from "react";

type Politeness = "polite" | "assertive";

/**
 * Creates off-screen ARIA live regions and returns an announcement function for screen readers.
 *
 * @returns A callback that announces a message using the requested politeness level.
 *
 * @example
 * ```tsx
 * const announce = useAnnounce();
 *
 * announce("Item deleted successfully");
 * announce("Error: invalid input", "assertive");
 * ```
 */
export function useAnnounce(): (message: string, politeness?: Politeness) => void {
  const politeRef = React.useRef<HTMLDivElement | null>(null);
  const assertiveRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const createRegion = (politeness: Politeness): HTMLDivElement => {
      const element = document.createElement("div");

      element.setAttribute("role", "status");
      element.setAttribute("aria-live", politeness);
      element.setAttribute("aria-atomic", "true");

      Object.assign(element.style, {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0,0,0,0)",
        whiteSpace: "nowrap",
        border: "0",
      });

      document.body.append(element);

      return element;
    };

    politeRef.current = createRegion("polite");
    assertiveRef.current = createRegion("assertive");

    return () => {
      politeRef.current?.remove();
      assertiveRef.current?.remove();
      politeRef.current = null;
      assertiveRef.current = null;
    };
  }, []);

  return React.useCallback((message: string, politeness: Politeness = "polite") => {
    const region = politeness === "assertive" ? assertiveRef.current : politeRef.current;

    if (!region) {
      return;
    }

    region.textContent = "";

    requestAnimationFrame(() => {
      region.textContent = message;
    });
  }, []);
}
