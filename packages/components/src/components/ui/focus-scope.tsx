"use client";

import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {isFocusAvailable as isAvailable, isFocusSubtreeAvailable} from "@/lib/_focus-availability";
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
  const Shadow = owner.ownerDocument.defaultView?.ShadowRoot ?? ShadowRoot;
  const root = owner.getRootNode();
  let active = (root instanceof Shadow ? root.activeElement : null) ?? owner.ownerDocument.activeElement;
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

function isTabbableElement(element: HTMLElement): boolean {
  if (!element.matches(FOCUSABLE_SELECTOR) || getTabIndex(element) < 0 || !isAvailable(element)) return false;
  const view = element.ownerDocument.defaultView;
  const Slot = view?.HTMLSlotElement ?? HTMLSlotElement;
  // A contents slot remains an ordering boundary, but has no self focus box.
  // Explicitly box-rendered slots retain their configured tabindex target.
  return !(element instanceof Slot && view?.getComputedStyle(element).display === "contents");
}

function getSlotChildren(slot: HTMLSlotElement | null): Element[] {
  if (!slot) return [];
  const assigned = slot.assignedNodes();
  // Keep intermediate slot owners intact. Any assignment, including text,
  // suppresses fallback; fallback is used only when nothing was assigned.
  return assigned.length === 0 ? [...slot.children] : assigned.filter((node): node is Element => node.nodeType === Node.ELEMENT_NODE);
}

function getScopeCandidates(elements: readonly Element[]): HTMLElement[] {
  const entries: {element: HTMLElement; contents: HTMLElement[]}[] = [];
  const visit = (element: Element): void => {
    const Html = element.ownerDocument.defaultView?.HTMLElement ?? HTMLElement;
    if (!(element instanceof Html)) {
      [...element.children].forEach((child) => visit(child));
      return;
    }
    const shadow = element.shadowRoot;
    const Slot = element.ownerDocument.defaultView?.HTMLSlotElement ?? HTMLSlotElement;
    const Shadow = element.ownerDocument.defaultView?.ShadowRoot ?? ShadowRoot;
    const slot = element instanceof Slot && element.getRootNode() instanceof Shadow ? element : null;
    if (shadow || slot) {
      // A shadow/slot scope stays at its owner's position. A negative owner
      // removes its entire scope from sequential navigation, not just itself.
      if ((element.hasAttribute("tabindex") && getTabIndex(element) < 0) || !isFocusSubtreeAvailable(element)) return;
      const contents = shadow ? [...shadow.children] : getSlotChildren(slot);
      entries.push({element, contents: getScopeCandidates(contents)});
    } else {
      if (isTabbableElement(element)) entries.push({element, contents: []});
      [...element.children].forEach((child) => visit(child));
    }
  };
  elements.forEach((element) => visit(element));
  const ordered = entries.toSorted((left, right) => {
    const leftIndex = getTabIndex(left.element);
    const rightIndex = getTabIndex(right.element);
    const leftOrder = leftIndex > 0 ? leftIndex : Number.POSITIVE_INFINITY;
    const rightOrder = rightIndex > 0 ? rightIndex : Number.POSITIVE_INFINITY;
    return leftOrder === rightOrder ? 0 : leftOrder - rightOrder;
  });
  return ordered.flatMap(({element, contents}) =>
    isTabbableElement(element) && !element.shadowRoot?.delegatesFocus ? [element, ...contents] : contents,
  );
}

function getFocusableElements(eligible: readonly HTMLElement[]): HTMLElement[] {
  return eligible.filter((element) => isRadioTabStop(element, eligible));
}

function resolveActiveTarget(
  active: Element | null,
  eligible: readonly HTMLElement[],
  candidates: readonly HTMLElement[],
): HTMLElement | undefined {
  const Html = active?.ownerDocument.defaultView?.HTMLElement ?? HTMLElement;
  // Membership comes from the same shadow/slot-aware traversal as ordering,
  // before radio normalization removes eligible unchecked aliases.
  if (!(active instanceof Html) || !eligible.includes(active)) return undefined;
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
 * Open shadow roots and assigned slots are expanded at their owner's position,
 * with positive tab indices ordered within each scope rather than across trees.
 * Projected focus is read from the owner document when the owning shadow tree
 * has no active element; membership uses that same eligible candidate collection.
 * Native interior traversal is preserved; wrapping uses the actual exposed edges.
 * Closed descendant shadow roots remain opaque: only their exposed host is known.
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
  ref = null,
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
      const eligible = getScopeCandidates([...container.children]);
      (getFocusableElements(eligible)[0] ?? container).focus();
    }
  }, [autoFocus]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (!contain || event.key !== "Tab" || event.defaultPrevented || ownedTabEvents.has(event.nativeEvent)) return;
    ownedTabEvents.add(event.nativeEvent);

    const container = event.currentTarget;
    const eligible = getScopeCandidates([...container.children]);
    const focusable = getFocusableElements(eligible);
    const [first] = focusable;
    const last = focusable.at(-1);
    const activeElement = getActiveElement(container);
    const active = resolveActiveTarget(activeElement, eligible, focusable);
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
      ...props,
    },
  });
};
FocusScope.displayName = "FocusScope";

export {FocusScope};
export type {FocusScopeProps};
