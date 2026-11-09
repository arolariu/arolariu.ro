"use client";

import {useRender} from "@base-ui/react/use-render";
import * as React from "react";

import {isFocusAvailable, isFocusSubtreeAvailable, readFocusStyle, type FocusStyleCache} from "@/lib/_focus-availability";
import {cn} from "@/lib/utilities";

import styles from "./focus-scope.module.css";

/**
 * Represents the configurable props for the {@link FocusScope} component.
 */
interface FocusScopeProps extends Readonly<React.ComponentPropsWithRef<"div">> {
  /**
   * Whether `Tab` and `Shift+Tab` wrap at the scope's edges instead of leaving it.
   *
   * @remarks
   * Containment has no built-in exit. Whenever this is `true`, the consumer must
   * provide a keyboard exit, such as an `Escape` handler or a reachable close or done
   * control that moves focus out of the scope or unmounts it, and must announce that
   * exit, for example with visible instructions referenced by `aria-describedby`.
   * Without one, a contained scope is a keyboard trap (WCAG 2.1.2 No Keyboard Trap).
   *
   * @default true
   */
  readonly contain?: boolean;
  /**
   * Whether to restore focus to the previously focused element on unmount.
   *
   * @default true
   */
  readonly restoreFocus?: boolean;
  /**
   * Whether to auto-focus the first focusable element on mount.
   *
   * @default false
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

/**
 * Memoized reads for one synchronous controller pass: a Tab keydown or the mount autofocus. A pass reads the DOM and
 * mutates nothing before its final `focus()` call, so each element's computed style, tab index and tabbability and each
 * native radio group are resolved at most once per pass; candidates share their ancestors' computed styles. A pass is
 * never reused across events, so every keydown observes the current DOM and styles.
 */
interface FocusPass {
  readonly styles: FocusStyleCache;
  readonly tabIndices: Map<HTMLElement, number>;
  readonly tabbable: Map<HTMLElement, boolean>;
  readonly radioInputs: Map<Document | DocumentFragment, readonly HTMLInputElement[]>;
  readonly radioGroups: Map<HTMLInputElement, readonly HTMLInputElement[]>;
}

function createFocusPass(): FocusPass {
  return {styles: new Map(), tabIndices: new Map(), tabbable: new Map(), radioInputs: new Map(), radioGroups: new Map()};
}

function memoize<Key, Value extends boolean | number>(cache: Map<Key, Value>, key: Key, read: () => Value): Value {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const value = read();
  cache.set(key, value);
  return value;
}

// Natively focusable `aria-disabled` controls (Base UI `focusableWhenDisabled`, disabled
// toolbar roving stops) stay in native sequential order, so they remain scope tab stops.
function isAvailable(element: HTMLElement, styles?: FocusStyleCache): boolean {
  return isFocusAvailable(element, true, styles);
}

function getActiveElement(owner: HTMLElement): Element | null {
  const Shadow = owner.ownerDocument.defaultView?.ShadowRoot ?? ShadowRoot;
  const root = owner.getRootNode();
  let active = (root instanceof Shadow ? root.activeElement : null) ?? owner.ownerDocument.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

function readTabIndex(element: HTMLElement): number {
  if (element.hasAttribute("tabindex")) return element.tabIndex;
  if (element.isContentEditable && !element.parentElement?.isContentEditable) return 0;
  const Details = element.ownerDocument.defaultView?.HTMLDetailsElement ?? HTMLDetailsElement;
  if (element.tagName === "SUMMARY" && element.parentElement instanceof Details) {
    const firstSummary = [...element.parentElement.children].find((child) => child.tagName === "SUMMARY");
    if (firstSummary === element) return 0;
  }
  return element.tabIndex;
}

function getTabIndex(element: HTMLElement, pass: FocusPass): number {
  return memoize(pass.tabIndices, element, () => readTabIndex(element));
}

function isRadioGroupRoot(root: Node): root is Document | DocumentFragment {
  return root.nodeType === Node.DOCUMENT_NODE || root.nodeType === Node.DOCUMENT_FRAGMENT_NODE;
}

function getRadioGroup(element: HTMLElement, pass: FocusPass): readonly HTMLInputElement[] | null {
  const Input = element.ownerDocument.defaultView?.HTMLInputElement ?? HTMLInputElement;
  if (!(element instanceof Input) || element.type !== "radio" || !element.name) return null;
  const cached = pass.radioGroups.get(element);
  if (cached) return cached;
  const root = element.getRootNode();
  if (!isRadioGroupRoot(root)) return [];
  let radios = pass.radioInputs.get(root);
  if (!radios) {
    radios = [...root.querySelectorAll<HTMLInputElement>("input")].filter((candidate) => candidate.type === "radio");
    pass.radioInputs.set(root, radios);
  }
  const group = radios.filter((candidate) => candidate.name === element.name && candidate.form === element.form);
  // Membership is symmetric (same tree, name and form owner), so every member shares this resolution.
  for (const member of group) pass.radioGroups.set(member, group);
  return group;
}

/** A native group's single sequential stop: its checked radio, else its first eligible member in controller order. */
function getRadioStop(group: readonly HTMLInputElement[], candidates: readonly HTMLElement[]): HTMLElement | undefined {
  const selected = group.find((candidate) => candidate.checked);
  if (selected) return selected;
  const members = new Set<HTMLElement>(group);
  return candidates.find((candidate) => members.has(candidate));
}

function readTabbable(element: HTMLElement, pass: FocusPass): boolean {
  if (!element.matches(FOCUSABLE_SELECTOR) || getTabIndex(element, pass) < 0 || !isAvailable(element, pass.styles)) return false;
  const Slot = element.ownerDocument.defaultView?.HTMLSlotElement ?? HTMLSlotElement;
  // A contents slot remains an ordering boundary, but has no self focus box.
  // Explicitly box-rendered slots retain their configured tabindex target.
  return !(element instanceof Slot && readFocusStyle(element, pass.styles)?.display === "contents");
}

function isTabbableElement(element: HTMLElement, pass: FocusPass): boolean {
  return memoize(pass.tabbable, element, () => readTabbable(element, pass));
}

function getSlotChildren(slot: HTMLSlotElement | null): Element[] {
  if (!slot) return [];
  const assigned = slot.assignedNodes();
  // Keep intermediate slot owners intact. Any assignment, including text,
  // suppresses fallback; fallback is used only when nothing was assigned.
  return assigned.length === 0 ? [...slot.children] : assigned.filter((node): node is Element => node.nodeType === Node.ELEMENT_NODE);
}

function getScopeCandidates(elements: readonly Element[], pass: FocusPass): HTMLElement[] {
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
      // A tabbable owner is non-negative and available, so its subtree needs no second walk.
      if (
        !isTabbableElement(element, pass)
        && ((element.hasAttribute("tabindex") && getTabIndex(element, pass) < 0) || !isFocusSubtreeAvailable(element, true, pass.styles))
      ) {
        return;
      }
      const contents = shadow ? [...shadow.children] : getSlotChildren(slot);
      entries.push({element, contents: getScopeCandidates(contents, pass)});
    } else {
      if (isTabbableElement(element, pass)) entries.push({element, contents: []});
      [...element.children].forEach((child) => visit(child));
    }
  };
  elements.forEach((element) => visit(element));
  const ordered = entries.toSorted((left, right) => {
    const leftIndex = getTabIndex(left.element, pass);
    const rightIndex = getTabIndex(right.element, pass);
    const leftOrder = leftIndex > 0 ? leftIndex : Number.POSITIVE_INFINITY;
    const rightOrder = rightIndex > 0 ? rightIndex : Number.POSITIVE_INFINITY;
    return leftOrder === rightOrder ? 0 : leftOrder - rightOrder;
  });
  return ordered.flatMap(({element, contents}) =>
    isTabbableElement(element, pass) && !element.shadowRoot?.delegatesFocus ? [element, ...contents] : contents,
  );
}

function getFocusableElements(eligible: readonly HTMLElement[], pass: FocusPass): HTMLElement[] {
  const stops = new Map<readonly HTMLInputElement[], HTMLElement | undefined>();
  return eligible.filter((element) => {
    const group = getRadioGroup(element, pass);
    if (!group) return true;
    if (!stops.has(group)) stops.set(group, getRadioStop(group, eligible));
    return element === stops.get(group);
  });
}

function resolveActiveTarget(
  active: Element | null,
  eligible: readonly HTMLElement[],
  candidates: readonly HTMLElement[],
  pass: FocusPass,
): HTMLElement | undefined {
  const Html = active?.ownerDocument.defaultView?.HTMLElement ?? HTMLElement;
  // Membership comes from the same shadow/slot-aware traversal as ordering,
  // before radio normalization removes eligible unchecked aliases.
  if (!(active instanceof Html) || !eligible.includes(active)) return undefined;
  if (candidates.includes(active)) return active;
  // Eligible members were proven tabbable earlier in this pass, so this guard reads the memo.
  if (!isTabbableElement(active, pass)) return undefined;
  const group = getRadioGroup(active, pass);
  if (!group || group.some((candidate) => candidate.checked)) return undefined;
  const members = new Set<HTMLElement>(group);
  return candidates.find((candidate) => members.has(candidate));
}

/**
 * Traps keyboard focus within a container element.
 *
 * @remarks
 * Renders a `<div>` and cycles `Tab` and `Shift+Tab` navigation through its focusable
 * visible, natively enabled, non-inert tabbable descendants. Natively focusable
 * `aria-disabled` controls, such as Base UI `focusableWhenDisabled` buttons and disabled
 * toolbar items that remain roving tab stops, stay tab stops: navigation continues past
 * them, wrapping includes them, `autoFocus` can enter them and focus can be restored to them.
 * An empty scope uses the container as its programmatic focus fallback. Focus restoration
 * targets the original connected, available focus owner on unmount, not on option changes.
 * A hidden, scope-owned entry marker captures that owner during commit before descendant
 * native `autoFocus` runs; connected Strict Mode effect replay is not treated as an exit.
 * Element checks use the constructors of the element's own window, so a scope rendered
 * into a same-origin iframe document filters closed `<details>` and disabled `<fieldset>`
 * content and restores focus like a scope in the parent document.
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
 * Containment (`contain`, on by default) has no built-in exit. Whenever it is enabled,
 * the consumer must provide a keyboard exit, such as an `Escape` handler or a reachable
 * close or done control that moves focus out of the scope or unmounts it, and must
 * announce that exit, for example with visible instructions referenced by
 * `aria-describedby`. Without one, the scope is a keyboard trap (WCAG 2.1.2).
 *
 * This is a local Tab controller, not a modal manager: it does not inert siblings,
 * dismiss on Escape, intercept pointer focus, or control portaled descendants.
 * Base UI dialog-style primitives already own modal focus; do not add a competing
 * FocusScope trap around or inside their popups. Consumer `onKeyDown` cancellation
 * takes precedence over containment.
 *
 * @example
 * ```tsx
 * // Escape or Done unmounts the scope; `restoreFocus` then returns focus to the opener.
 * function InlineEditor({onDone}: Readonly<{onDone: () => void}>): React.JSX.Element {
 *   const exitHintId = React.useId();
 *   return (
 *     <FocusScope
 *       contain
 *       autoFocus
 *       aria-label='Inline editor'
 *       aria-describedby={exitHintId}
 *       onKeyDown={(event) => {
 *         if (event.key === "Escape") onDone();
 *       }}>
 *       <p id={exitHintId}>Press Escape or choose Done to leave the editor.</p>
 *       <input aria-label='Title' />
 *       <button type='button' onClick={onDone}>Done</button>
 *     </FocusScope>
 *   );
 * }
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
      const Html = previousFocus?.ownerDocument.defaultView?.HTMLElement ?? HTMLElement;
      if (!container?.isConnected && restoreFocusRef.current && previousFocus instanceof Html && isAvailable(previousFocus)) {
        previousFocus.focus();
      }
    };
  }, []);

  React.useEffect(() => {
    const container = containerRef.current;
    if (autoFocus && container) {
      // The container check and every candidate share one pass, so common ancestors are read once.
      const pass = createFocusPass();
      if (isAvailable(container, pass.styles)) {
        const eligible = getScopeCandidates([...container.children], pass);
        (getFocusableElements(eligible, pass)[0] ?? container).focus();
      }
    }
  }, [autoFocus]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (!contain || event.key !== "Tab" || event.defaultPrevented || ownedTabEvents.has(event.nativeEvent)) return;
    ownedTabEvents.add(event.nativeEvent);

    const container = event.currentTarget;
    const pass = createFocusPass();
    const eligible = getScopeCandidates([...container.children], pass);
    const focusable = getFocusableElements(eligible, pass);
    const [first] = focusable;
    const last = focusable.at(-1);
    const activeElement = getActiveElement(container);
    const active = resolveActiveTarget(activeElement, eligible, focusable, pass);
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
