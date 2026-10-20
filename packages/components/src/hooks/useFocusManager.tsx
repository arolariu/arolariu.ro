"use client";

import * as React from "react";

import {isFocusAvailable} from "@/lib/_focus-availability";

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
 * Picks the candidate after (`step` 1) or before (`step` -1) the focused element in DOM order, wrapping at the ends.
 *
 * @remarks
 * A focused element that is not a candidate keeps its DOM position: candidates are in DOM order, so the ones preceding
 * it (its ancestors included) form a prefix whose length is its insertion index. Nothing focused counts as before all.
 */
function getAdjacentCandidate(items: readonly HTMLElement[], current: Element | null, step: 1 | -1): HTMLElement | undefined {
  const elements: readonly Element[] = items;
  let index = current ? elements.indexOf(current) : -1;
  if (index === -1) {
    // For two elements in one tree, a preceding non-ancestor compares as exactly DOCUMENT_POSITION_PRECEDING.
    const preceding = current
      ? items.filter((item) => item.contains(current) || current.compareDocumentPosition(item) === Node.DOCUMENT_POSITION_PRECEDING).length
      : 0;
    index = step === 1 ? preceding - 1 : preceding;
  }
  return items[index + step] ?? (step === 1 ? items[0] : items.at(-1));
}

/**
 * Focus movement helpers returned by {@link useFocusManager}.
 *
 * @remarks
 * Each helper re-reads the container's candidates when it is called, so it reflects the current DOM, and does nothing
 * while the container ref is `null` or the container has no candidate.
 */
export interface FocusManager {
  /**
   * Focuses the first candidate in DOM order.
   */
  focusFirst: () => void;
  /**
   * Focuses the last candidate in DOM order.
   */
  focusLast: () => void;
  /**
   * Focuses the candidate after the focused element in DOM order, wrapping from the last candidate to the first.
   *
   * @remarks
   * A focused element that is not a candidate, such as a focusable `aria-disabled` control, keeps its DOM position, so
   * focus moves to the first candidate after it. With focus outside the container or on nothing, that is the first
   * candidate.
   */
  focusNext: () => void;
  /**
   * Focuses the candidate before the focused element in DOM order, wrapping from the first candidate to the last.
   *
   * @remarks
   * A focused element that is not a candidate keeps its DOM position, so focus moves to the last candidate before it.
   * With focus outside the container or on nothing, that is the last candidate.
   */
  focusPrevious: () => void;
}

/**
 * Moves focus programmatically among the focusable descendants of a container.
 *
 * @remarks
 * **Candidates**: `a[href]`, `button`, `input`, `select`, `textarea`, `[contenteditable]` and `[tabindex]` descendants
 * whose `tabIndex` is not negative, in DOM order; positive `tabindex` values do not reorder them. A candidate is
 * skipped when it is disconnected; has a `disabled` attribute or matches `:disabled` (a disabled `<fieldset>` disables
 * its controls outside the first `<legend>`); has `aria-disabled="true"`; is a hidden `<input>`; sits in a `hidden`,
 * `inert` or `display: none` subtree, or in a closed `<details>` outside its first `<summary>`; or is itself
 * `visibility: hidden` or `collapse`. `aria-disabled` controls are skipped even though they stay in the browser's Tab
 * order, so arrow-key patterns that should still reach disabled items (as WAI-ARIA APG menus often do) need their own
 * handling. Candidates come from `querySelectorAll` on the container, so shadow roots are not searched, and the focused
 * element is read from `document.activeElement`.
 *
 * **Order and wrapping**: `focusNext` and `focusPrevious` move to the candidate after or before the focused element in
 * DOM order and wrap at the ends. A focused element that is not a candidate, such as a focusable `aria-disabled` control
 * or a `tabindex="-1"` element, keeps its DOM position, so focus continues to the nearest candidate after or before it
 * instead of jumping to an end. With focus outside the container or on nothing, `focusNext` therefore focuses the first
 * candidate and `focusPrevious` the last.
 *
 * **Side effects**: the hook renders nothing and adds no listeners, attributes or roles; a helper only calls `focus()`
 * on the chosen candidate. Call the helpers from event handlers or effects, not during render. The hook does not handle
 * keys, contain Tab or restore focus: wire the helpers to your own keyboard handling and use `FocusScope` for
 * containment.
 *
 * @param containerRef - Ref to the container whose descendants are managed; every helper is a no-op while it is `null`.
 * @returns Helpers that focus the first, last, next or previous candidate; they keep their identity while the same ref
 * object is passed.
 *
 * @example
 * ```tsx
 * function QuickActions() {
 *   const containerRef = React.useRef<HTMLDivElement>(null);
 *   const {focusFirst, focusLast, focusNext, focusPrevious} = useFocusManager(containerRef);
 *   const moves: Partial<Record<string, () => void>> = {
 *     ArrowDown: focusNext,
 *     ArrowUp: focusPrevious,
 *     Home: focusFirst,
 *     End: focusLast,
 *   };
 *
 *   return (
 *     <div
 *       ref={containerRef}
 *       role="group"
 *       aria-label="Quick actions"
 *       onKeyDown={(event) => {
 *         const move = moves[event.key];
 *         if (!move) return;
 *         event.preventDefault();
 *         move();
 *       }}>
 *       <button type="button">Copy</button>
 *       <button type="button" disabled>
 *         Paste
 *       </button>
 *       <a href="/settings">Settings</a>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFocusManager(containerRef: React.RefObject<HTMLElement | null>): FocusManager {
  const getFocusable = React.useCallback((): HTMLElement[] => {
    if (!containerRef.current) {
      return [];
    }

    return [...containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
      (element) => !element.hasAttribute("disabled") && element.tabIndex >= 0 && isFocusAvailable(element),
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
    getAdjacentCandidate(getFocusable(), document.activeElement, 1)?.focus();
  }, [getFocusable]);

  const focusPrevious = React.useCallback(() => {
    getAdjacentCandidate(getFocusable(), document.activeElement, -1)?.focus();
  }, [getFocusable]);

  return {focusFirst, focusLast, focusNext, focusPrevious};
}
