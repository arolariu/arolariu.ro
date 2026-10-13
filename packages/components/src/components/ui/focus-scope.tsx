"use client";

import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {cn} from "@/lib/utilities";

import styles from "./focus-scope.module.css";

/**
 * Represents the configurable props for the {@link FocusScope} component.
 */
interface FocusScopeProps extends Readonly<React.ComponentPropsWithoutRef<"div">> {
  /**
   * Whether focus should be trapped within the scope.
   *
   * @defaultValue true
   */
  readonly contain?: boolean;
  /**
   * Whether to restore focus to the previously focused element on unmount.
   *
   * @defaultValue true
   */
  readonly restoreFocus?: boolean;
  /**
   * Whether to auto-focus the first focusable element on mount.
   *
   * @defaultValue false
   */
  readonly autoFocus?: boolean;
  /**
   * Content rendered within the focus scope.
   */
  readonly children: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not(:disabled)",
  "input:not(:disabled)",
  "select:not(:disabled)",
  "textarea:not(:disabled)",
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]:not([contenteditable="false"])',
  "summary",
  "iframe",
  "audio[controls]",
  "video[controls]",
].join(", ");

function isDisabledByFieldset(element: HTMLElement, ancestor: HTMLElement): boolean {
  if (!(ancestor instanceof HTMLFieldSetElement) || !ancestor.disabled || !element.matches("button, input, select, textarea")) {
    return false;
  }
  const legend = [...ancestor.children].find((child) => child instanceof HTMLLegendElement);
  return !legend?.contains(element);
}

function isAvailable(element: HTMLElement): boolean {
  if (
    !element.isConnected
    || element.matches(':disabled, input[type="hidden"], [aria-disabled="true"]')
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
      const summary = ancestor.querySelector("summary");
      if (!summary?.contains(element)) return false;
    }
  }
  return true;
}

function getTabIndex(element: HTMLElement): number {
  if (element.hasAttribute("tabindex")) return element.tabIndex;
  if (element.isContentEditable && !element.parentElement?.isContentEditable) return 0;
  if (element.tagName === "SUMMARY" && element.parentElement instanceof HTMLDetailsElement) {
    const firstSummary = [...element.parentElement.children].find((child) => child.tagName === "SUMMARY");
    if (firstSummary === element) return 0;
  }
  return element.tabIndex;
}

function isRadioTabStop(element: HTMLElement, candidates: readonly HTMLElement[]): boolean {
  if (!(element instanceof HTMLInputElement) || element.type !== "radio" || !element.name) return true;
  const group = candidates.filter(
    (candidate): candidate is HTMLInputElement =>
      candidate instanceof HTMLInputElement
      && candidate.type === "radio"
      && candidate.name === element.name
      && candidate.form === element.form,
  );
  const selected = group.find((candidate) => candidate.checked);
  return element === (selected ?? group[0]);
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const available = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) => getTabIndex(element) >= 0 && isAvailable(element),
  );
  return available
    .filter((element) => isRadioTabStop(element, available))
    .toSorted((left, right) => {
      const leftIndex = getTabIndex(left);
      const rightIndex = getTabIndex(right);
      const leftOrder = leftIndex > 0 ? leftIndex : Number.POSITIVE_INFINITY;
      const rightOrder = rightIndex > 0 ? rightIndex : Number.POSITIVE_INFINITY;
      return leftOrder === rightOrder ? 0 : leftOrder - rightOrder;
    });
}

/**
 * Traps keyboard focus within a container element.
 *
 * @remarks
 * Renders a `<div>` and cycles `Tab` and `Shift+Tab` navigation through its focusable
 * visible, enabled, non-inert tabbable descendants. An empty scope uses the container
 * as its programmatic focus fallback. Focus restoration targets the original connected,
 * available focus owner on unmount, not on option changes.
 *
 * This is a local Tab controller, not a modal manager: it does not inert siblings,
 * dismiss on Escape, intercept pointer focus, or control portaled descendants.
 * Base UI dialog-style primitives already own modal focus; do not add a competing
 * FocusScope trap around or inside their popups. Consumer `onKeyDown` cancellation
 * takes precedence over containment.
 *
 * @example
 * ```tsx
 * <FocusScope contain autoFocus>
 *   <input placeholder='First' />
 *   <input placeholder='Second' />
 *   <button type='submit'>Submit</button>
 * </FocusScope>
 * ```
 */
const FocusScope = React.forwardRef<HTMLDivElement, FocusScopeProps>(
  (
    {contain = true, restoreFocus = true, autoFocus = false, children, className, onKeyDown, ...props}: Readonly<FocusScopeProps>,
    ref,
  ): React.ReactElement => {
    const containerRef = React.useRef<HTMLDivElement | null>(null);
    const restoreFocusRef = React.useRef(restoreFocus);

    React.useEffect(() => {
      restoreFocusRef.current = restoreFocus;
    }, [restoreFocus]);

    React.useEffect(() => {
      const previousFocus = containerRef.current?.ownerDocument.activeElement;
      return () => {
        if (restoreFocusRef.current && previousFocus instanceof HTMLElement && isAvailable(previousFocus)) {
          previousFocus.focus();
        }
      };
    }, []);

    React.useEffect(() => {
      const container = containerRef.current;
      if (autoFocus && container && isAvailable(container)) {
        (getFocusableElements(container)[0] ?? container).focus();
      }
    }, [autoFocus]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
      onKeyDown?.(event);
      if (!contain || event.key !== "Tab" || event.defaultPrevented) return;

      const container = event.currentTarget;
      const focusable = getFocusableElements(container);
      const [first] = focusable;
      const last = focusable.at(-1);
      const active = container.ownerDocument.activeElement;
      if (!first || !last) {
        event.preventDefault();
        container.focus();
      } else if (
        active === container
        || !(active instanceof HTMLElement)
        || !focusable.includes(active)
        || (event.shiftKey ? active === first : active === last)
      ) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      }
    };

    return useRender({
      defaultTagName: "div",
      ref: [containerRef, ref],
      props: {
        ...props,
        className: cn(styles.scope, className),
        role: props.role ?? "group",
        tabIndex: props.tabIndex ?? -1,
        onKeyDown: handleKeyDown,
        children,
      },
    });
  },
);
FocusScope.displayName = "FocusScope";

export {FocusScope};
export type {FocusScopeProps};
