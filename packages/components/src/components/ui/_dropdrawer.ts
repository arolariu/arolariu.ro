"use client";

import {useEffect, useRef} from "react";

/**
 * Reports each committed mobile submenu transition once.
 *
 * @param mobile - Whether the responsive owner is the mobile drawer.
 * @param open - The committed navigation-path membership.
 * @param onComplete - The caller's current completion observer.
 */
export function useSubmenuCompletion(mobile: boolean, open: boolean, onComplete?: (open: boolean) => void): void {
  const completedOpenRef = useRef(false);
  useEffect(() => {
    if (!mobile) {
      completedOpenRef.current = false;
      return;
    }
    if (completedOpenRef.current === open) return;
    completedOpenRef.current = open;
    onComplete?.(open);
  }, [mobile, onComplete, open]);
}
