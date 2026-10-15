"use client";

import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {isFocusAvailable as isAvailable} from "@/lib/_focus-availability";
import {cn} from "@/lib/utilities";

import styles from "./focus-scope.module.css";

/**
 * Represents the configurable props for the {@link FocusScope} component.
 */
interface FocusScopeProps extends Readonly<React.ComponentPropsWithRef<"div">> {
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

const ownedTabEvents = new WeakSet<KeyboardEvent>();

function getActiveElement(owner: HTMLElement): Element | null {
  const root = owner.getRootNode();
  let active = (root instanceof ShadowRoot ? root : owner.ownerDocument).activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
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

function isRadioGroupRoot(root: Node): root is Document | DocumentFragment {
  return root.nodeType === Node.DOCUMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}

function getRadioGroup(element: HTMLElement): readonly HTMLInputElement[] | null {
  const Input = element.ownerDocument.defaultView?.HTMLInputElement ?? HTMLInputElement;
  if (!(element instanceof Input) || element.type !== "radio" || !element.name) return null;
  const root = element.getRootNode();
  if (!isRadioGroupRoot(root)) return [];
  return [...root.querySelectorAll<HTMLInputElement>("input")].filter(
    (candidate) => candidate.type === "radio" && candidate.name === element.name && candidate.form === element.form,
  );
}

function isRadioTabStop(element: HTMLElement, candidates: readonly HTMLElement[]): boolean {
  const group = getRadioGroup(element);
  if (!group) return true;
  const selected = group.find((candidate) => candidate.checked);
  if (selected) return element === selected;
  const members = new Set<HTMLElement>(group);
  return element === candidates.find((candidate) => members.has(candidate));
}

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const available = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)].filter(
    (element) => getTabIndex(element) >= 0 && isAvailable(element),
  );
  const ordered = available.toSorted((left, right) => {
    const leftIndex = getTabIndex(left);
    const rightIndex = getTabIndex(right);
    const leftOrder = leftIndex > 0 ? leftIndex : Number.POSITIVE_INFINITY;
    const rightOrder = rightIndex > 0 ? rightIndex : Number.POSITIVE_INFINITY;
    return leftOrder === rightOrder ? 0 : leftOrder - rightOrder;
  });
  return ordered.filter((element) => isRadioTabStop(element, ordered));
}

function resolveActiveTarget(active: Element | null, container: HTMLElement, candidates: readonly HTMLElement[]): HTMLElement | undefined {
  const Html = active?.ownerDocument.defaultView?.HTMLElement ?? HTMLElement;
  if (!(active instanceof Html) || !container.contains(active)) return undefined;
  if (candidates.includes(active)) return active;
  if (getTabIndex(active) < 0 || !isAvailable(active)) return undefined;
  const group = getRadioGroup(active);
  if (!group || group.some((candidate) => candidate.checked)) return undefined;
  const members = new Set<HTMLElement>(group);
  return candidates.find((candidate) => members.has(candidate));
}

/**
 * Traps keyboard focus within a container element.
 *
 * @remarks
 * Renders a `<div>` and cycles `Tab` and `Shift+Tab` navigation through its focusable
 * visible, enabled, non-inert tabbable descendants. An empty scope uses the container
 * as its programmatic focus fallback. Focus restoration targets the original connected,
 * available focus owner on unmount, not on option changes.
 * A hidden, scope-owned entry marker captures that owner during commit before descendant
 * native `autoFocus` runs; connected Strict Mode effect replay is not treated as an exit.
 * Native radio groups are selected by name, form owner and tree before intersecting
 * their eligible targets with this scope, including checked peers outside the scope.
 * An unchecked group uses its first locally eligible target in controller order as a
 * single edge representative. A different eligible unchecked peer reached by native
 * navigation advances from that logical stop, so physical peer placement cannot escape
 * containment. Ordinary native traversal remains between representative targets.
 * This is a deliberate controller policy, not a claim about every browser's radio order.
 * The innermost contained scope owns a Tab event even when permitting native interior
 * navigation. Ancestor controllers defer, but consumer handlers still bubble and may
 * cancel that transition. Non-contained descendants do not claim keyboard ownership.
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
const FocusScope = ({
  ref,
  contain = true,
  restoreFocus = true,
  autoFocus = false,
  children,
  className,
  onKeyDown,
  ...props
}: Readonly<FocusScopeProps>): React.ReactElement => {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = React.useRef(restoreFocus);
  const entryFocusRef = React.useRef<Element | null>(null);
  const entryCapturedRef = React.useRef(false);
  const captureEntryFocus = React.useCallback((marker: HTMLSpanElement | null): void => {
    if (marker && !entryCapturedRef.current) {
      entryFocusRef.current = getActiveElement(marker);
      entryCapturedRef.current = true;
    }
  }, []);

  React.useEffect(() => {
    restoreFocusRef.current = restoreFocus;
  }, [restoreFocus]);

  React.useEffect(() => {
    const container = containerRef.current;
    return () => {
      const previousFocus = entryFocusRef.current;
      if (!container?.isConnected && restoreFocusRef.current && previousFocus instanceof HTMLElement && isAvailable(previousFocus)) {
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
    if (!contain || event.key !== "Tab" || event.defaultPrevented || ownedTabEvents.has(event.nativeEvent)) return;
    ownedTabEvents.add(event.nativeEvent);

    const container = event.currentTarget;
    const focusable = getFocusableElements(container);
    const [first] = focusable;
    const last = focusable.at(-1);
    const activeElement = getActiveElement(container);
    const active = resolveActiveTarget(activeElement, container, focusable);
    if (!first || !last) {
      event.preventDefault();
      container.focus();
    } else if (!active) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (active !== activeElement || (event.shiftKey ? active === first : active === last)) {
      event.preventDefault();
      const offset = event.shiftKey ? -1 : 1;
      const nextIndex = (focusable.indexOf(active) + offset + focusable.length) % focusable.length;
      focusable[nextIndex]?.focus();
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
      children: (
        <>
          <span
            hidden
            ref={captureEntryFocus}
          />
          {children}
        </>
      ),
    },
  });
};
FocusScope.displayName = "FocusScope";

export {FocusScope};
export type {FocusScopeProps};
