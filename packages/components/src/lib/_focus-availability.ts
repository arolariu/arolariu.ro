"use client";

import * as React from "react";

/** The element's own window; same-origin iframe content fails the parent window's constructors. */
type ElementRealm = Document["defaultView"];

/** The computed style values the availability checks read. */
export type FocusStyleValues = Readonly<Pick<CSSStyleDeclaration, "display" | "visibility">>;

/**
 * Computed `display` and `visibility` values memoized for one synchronous read pass, such as a single keydown. Create
 * one per pass, share it across that pass's checks and discard it afterwards, so the next pass observes style changes.
 */
export type FocusStyleCache = Map<Element, FocusStyleValues | undefined>;

function readStyle(element: Element, view: ElementRealm, styles: FocusStyleCache | undefined): FocusStyleValues | undefined {
  // Uncached callers keep reading the live computed style on every call.
  if (!styles) return view?.getComputedStyle(element);
  if (styles.has(element)) return styles.get(element);
  const style = view?.getComputedStyle(element);
  const values = style ? {display: style.display, visibility: style.visibility} : undefined;
  styles.set(element, values);
  return values;
}

/**
 * Reads an element's computed `display` and `visibility` from its own window.
 *
 * @param element - The element whose computed style is read.
 * @param styles - Optional per-pass memo; each element's style is then read at most once while that memo lives.
 * @returns The computed values, or `undefined` when the element's document has no window.
 */
export function readFocusStyle(element: Element, styles?: FocusStyleCache): FocusStyleValues | undefined {
  return readStyle(element, element.ownerDocument.defaultView, styles);
}

function isDisabledByFieldset(element: HTMLElement, ancestor: HTMLElement, view: ElementRealm): boolean {
  const FieldSet = view?.HTMLFieldSetElement ?? HTMLFieldSetElement;
  if (!(ancestor instanceof FieldSet) || !ancestor.disabled || !element.matches("button, input, select, textarea")) {
    return false;
  }
  const Legend = view?.HTMLLegendElement ?? HTMLLegendElement;
  const legend = [...ancestor.children].find((child) => child instanceof Legend);
  return !legend?.contains(element);
}

/**
 * Private structural owner checks, excluding visibility that descendants can override. Pass a per-pass `styles` memo to
 * share each ancestor's computed style across the candidates of one pass.
 */
export function isFocusSubtreeAvailable(element: HTMLElement, allowAriaDisabled = false, styles?: FocusStyleCache): boolean {
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
    if (isDisabledByFieldset(element, ancestor, view) || readStyle(ancestor, view, styles)?.display === "none") return false;
    if (ancestor instanceof Details && !ancestor.open) {
      const summary = [...ancestor.children].find((child) => child.tagName === "SUMMARY");
      if (!summary?.contains(element)) return false;
    }
  }
  return true;
}

/** Shared availability only; each focus owner retains its candidate and ordering policy. */
export function isFocusAvailable(element: HTMLElement, allowAriaDisabled = false, styles?: FocusStyleCache): boolean {
  if (!isFocusSubtreeAvailable(element, allowAriaDisabled, styles)) return false;
  const visibility = readFocusStyle(element, styles)?.visibility;
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
