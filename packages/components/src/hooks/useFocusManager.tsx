"use client";

import * as React from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
  "[contenteditable]",
].join(", ");

/**
 * Represents the focus movement helpers returned by {@link useFocusManager}.
 */
interface FocusManager {
  /**
   * Focuses the first focusable element in the container.
   */
  focusFirst: () => void;
  /**
   * Focuses the last focusable element in the container.
   */
  focusLast: () => void;
  /**
   * Focuses the next focusable element after the currently focused one.
   */
  focusNext: () => void;
  /**
   * Focuses the previous focusable element before the currently focused one.
   */
  focusPrevious: () => void;
}

/**
 * Provides programmatic focus movement helpers for a container element.
 *
 * @param containerRef - Ref pointing to the container whose focusable descendants should be managed.
 * @returns Focus helpers for moving to the first, last, next, or previous focusable descendant.
 *
 * @example
 * ```tsx
 * const containerRef = React.useRef<HTMLDivElement>(null);
 * const {focusNext, focusPrevious} = useFocusManager(containerRef);
 * ```
 */
export function useFocusManager(containerRef: React.RefObject<HTMLElement | null>): FocusManager {
  const getFocusable = React.useCallback((): HTMLElement[] => {
    if (!containerRef.current) {
      return [];
    }

    return [...containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
      (element) => !element.hasAttribute("disabled") && element.tabIndex >= 0,
    );
  }, [containerRef]);

  const focusFirst = React.useCallback(() => {
    getFocusable()[0]?.focus();
  }, [getFocusable]);

  const focusLast = React.useCallback(() => {
    const items = getFocusable();

    items.at(-1)?.focus();
  }, [getFocusable]);

  const focusNext = React.useCallback(() => {
    const items = getFocusable();
    const current = document.activeElement;
    const index = items.indexOf(current as HTMLElement);
    const next = items[index + 1] ?? items[0];

    next?.focus();
  }, [getFocusable]);

  const focusPrevious = React.useCallback(() => {
    const items = getFocusable();
    const current = document.activeElement;
    const index = items.indexOf(current as HTMLElement);
    const previous = items[index - 1] ?? items.at(-1);

    previous?.focus();
  }, [getFocusable]);

  return {focusFirst, focusLast, focusNext, focusPrevious};
}
