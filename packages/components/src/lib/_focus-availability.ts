"use client";

import * as React from "react";

function isDisabledByFieldset(element: HTMLElement, ancestor: HTMLElement): boolean {
  if (!(ancestor instanceof HTMLFieldSetElement) || !ancestor.disabled || !element.matches("button, input, select, textarea")) {
    return false;
  }
  const legend = [...ancestor.children].find((child) => child instanceof HTMLLegendElement);
  return !legend?.contains(element);
}

/** Shared availability only; each focus owner retains its candidate and ordering policy. */
export function isFocusAvailable(element: HTMLElement, allowAriaDisabled = false): boolean {
  if (
    !element.isConnected
    || element.matches(':disabled, input[type="hidden"]')
    || (!allowAriaDisabled && element.matches('[aria-disabled="true"]'))
    || element.closest("[hidden], [inert]")
  ) {
    return false;
  }

  const view = element.ownerDocument.defaultView;
  const visibility = view?.getComputedStyle(element).visibility;
  if (visibility === "hidden" || visibility === "collapse") return false;
  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    if (isDisabledByFieldset(element, ancestor)) return false;
    const style = view?.getComputedStyle(ancestor);
    if (style?.display === "none") return false;
    if (ancestor instanceof HTMLDetailsElement && !ancestor.open) {
      const summary = [...ancestor.children].find((child) => child.tagName === "SUMMARY");
      if (!summary?.contains(element)) return false;
    }
  }
  return true;
}

interface FocusPanel {
  readonly panelRef: React.RefObject<HTMLElement | null>;
}

function focusAvailableElement(element: HTMLElement | null | undefined): boolean {
  // SDK buttons may intentionally remain focusable while aria-disabled.
  if (!element || !isFocusAvailable(element, true)) return false;
  element.focus();
  const tree = element.getRootNode() as Document | ShadowRoot;
  return tree.activeElement === element;
}

/** Resolves the active mobile panel and synchronizes entry/return focus after its commit. */
export function useMobilePanelFocusRecovery(
  open: boolean,
  path: readonly string[],
  mainRef: React.RefObject<HTMLElement | null>,
  entriesRef: React.RefObject<ReadonlyMap<string, FocusPanel>>,
  pendingFocusRef: React.RefObject<"entry" | HTMLElement | null>,
): string | null {
  const activeId = path.at(-1) ?? null;
  React.useLayoutEffect(() => {
    const target = pendingFocusRef.current;
    if (!open || !target) return;
    if (target !== "entry" && focusAvailableElement(target)) {
      pendingFocusRef.current = null;
      return;
    }
    const panel = activeId === null ? mainRef.current : entriesRef.current.get(activeId)?.panelRef.current;
    const candidates = panel?.querySelectorAll<HTMLElement>('button:not(:disabled), a[href]:not([aria-disabled="true"]), [tabindex="0"]');
    if (candidates) {
      for (const candidate of candidates) {
        if (focusAvailableElement(candidate)) {
          pendingFocusRef.current = null;
          return;
        }
      }
    }
    if (focusAvailableElement(panel)) pendingFocusRef.current = null;
  }, [activeId, entriesRef, mainRef, open, path, pendingFocusRef]);
  return activeId;
}
