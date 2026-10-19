"use client";

import * as React from "react";

/** The element's own window; same-origin iframe content fails the parent window's constructors. */
type ElementRealm = Document["defaultView"];

function isDisabledByFieldset(element: HTMLElement, ancestor: HTMLElement, view: ElementRealm): boolean {
  const FieldSet = view?.HTMLFieldSetElement ?? HTMLFieldSetElement;
  if (!(ancestor instanceof FieldSet) || !ancestor.disabled || !element.matches("button, input, select, textarea")) {
    return false;
  }
  const Legend = view?.HTMLLegendElement ?? HTMLLegendElement;
  const legend = [...ancestor.children].find((child) => child instanceof Legend);
  return !legend?.contains(element);
}

/** Private structural owner checks, excluding visibility that descendants can override. */
export function isFocusSubtreeAvailable(element: HTMLElement, allowAriaDisabled = false): boolean {
  if (
    !element.isConnected
    || element.matches(':disabled, input[type="hidden"]')
    || (!allowAriaDisabled && element.matches('[aria-disabled="true"]'))
    || element.closest("[hidden], [inert]")
  ) {
    return false;
  }

  const view = element.ownerDocument.defaultView;
  const Details = view?.HTMLDetailsElement ?? HTMLDetailsElement;
  for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
    if (isDisabledByFieldset(element, ancestor, view)) return false;
    const style = view?.getComputedStyle(ancestor);
    if (style?.display === "none") return false;
    if (ancestor instanceof Details && !ancestor.open) {
      const summary = [...ancestor.children].find((child) => child.tagName === "SUMMARY");
      if (!summary?.contains(element)) return false;
    }
  }
  return true;
}

/** Shared availability only; each focus owner retains its candidate and ordering policy. */
export function isFocusAvailable(element: HTMLElement, allowAriaDisabled = false): boolean {
  if (!isFocusSubtreeAvailable(element, allowAriaDisabled)) return false;
  const visibility = element.ownerDocument.defaultView?.getComputedStyle(element).visibility;
  return visibility !== "hidden" && visibility !== "collapse";
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
