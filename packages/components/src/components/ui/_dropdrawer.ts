"use client";

import type {Menu as BaseMenu} from "@base-ui/react/menu";
import type {ComponentRenderFn, HTMLProps} from "@base-ui/react/types";
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
  type RefObject,
  type SyntheticEvent,
} from "react";

import {useIsMobile} from "@/hooks/useIsMobile";

/** Root state shared by every responsive part. */
export interface RootContextValue {
  readonly isMobile: boolean;
  readonly open: boolean;
  readonly disabled: boolean;
  readonly mobileTitle: string;
  readonly backLabel: string;
}
export const RootContext = createContext<RootContextValue | null>(null);
/** Reads the enclosing DropDrawer root state. */
export function useRoot(): RootContextValue {
  const value = useContext(RootContext);
  if (!value) throw new Error("DropDrawer components must be rendered within DropDrawer.");
  return value;
}
/** A live mobile submenu: its actual trigger and panel nodes and its latest submenu props. */
export interface SubmenuRegistration {
  readonly id: string;
  readonly parentId: string | null;
  readonly triggerRef: RefObject<HTMLElement | null>;
  readonly panelRef: RefObject<HTMLElement | null>;
  readonly optionsRef: RefObject<Readonly<BaseMenu.SubmenuRoot.Props>>;
}
/** The local mobile navigation owner published by the mobile DropDrawerContent. */
export interface NavigationContextValue {
  readonly activeId: string | null;
  readonly path: readonly string[];
  readonly panelHost: HTMLDivElement | null;
  readonly register: (entry: SubmenuRegistration) => () => void;
  readonly navigate: (id: string, event: MouseEvent) => void;
  readonly synchronize: (id: string, open: boolean) => void;
  readonly panelAvailabilityChanged: (id: string) => void;
  readonly setPanelTitle: (id: string, title: string | undefined) => void;
}
export const NavigationContext = createContext<NavigationContextValue | null>(null);
/** The enclosing DropDrawerSub registration and its panel/trigger coordination. */
export type SubmenuContextValue = SubmenuRegistration & {
  readonly disabled: boolean;
  readonly panelId: string;
  readonly setPanelId: (id: string) => void;
  readonly setTriggerText: (text: string) => void;
};
export const SubContext = createContext<SubmenuContextValue | null>(null);
/** Reads the mobile navigation owner; mobile submenu panels require mobile DropDrawerContent. */
export function useNavigation(): NavigationContextValue {
  const value = useContext(NavigationContext);
  if (!value) throw new Error("Mobile DropDrawer submenus must be rendered within DropDrawerContent.");
  return value;
}
/** Reads the enclosing DropDrawerSub. */
export function useSubmenu(): SubmenuContextValue {
  const value = useContext(SubContext);
  if (!value) throw new Error("DropDrawerSubTrigger and DropDrawerSubContent require DropDrawerSub.");
  return value;
}

/**
 * Resolves which SDK owner renders a DropDrawer.
 *
 * @param presentation - `"menu"` and `"drawer"` force an owner; `"responsive"` (or omitted) follows `useIsMobile`'s
 *   `(max-width: 767px)` query, which reports `false` during server rendering and hydration.
 * @returns `true` when the mobile Drawer owns the DropDrawer, `false` for the desktop Menu.
 */
export function useDrawerPresentation(presentation: "responsive" | "menu" | "drawer" | undefined): boolean {
  const narrowViewport = useIsMobile();
  if (presentation === "menu") return false;
  return presentation === "drawer" || narrowViewport;
}

type RenderProp<State> = ReactElement | ComponentRenderFn<HTMLProps, State>;
/** Resolves an element render slot through React's public normalization; render functions have no element. */
export function elementOf<State>(render: RenderProp<State> | undefined): ReactElement<{children?: ReactNode; id?: string}> | undefined {
  if (render === undefined || typeof render === "function") return undefined;
  // eslint-disable-next-line react-x/no-children-to-array -- only mounted render owners resolve opaque slots through public React normalization.
  const [element] = Children.toArray(render);
  return isValidElement<{children?: ReactNode; id?: string}>(element) ? element : undefined;
}
/** Explicit children win; otherwise an element render slot supplies its own children. */
export function contentOf<State>(children: ReactNode, render: RenderProp<State> | undefined): ReactNode {
  return children === undefined ? elementOf(render)?.props.children : children;
}
/** Supplies compound children to an element render slot; render functions are returned unchanged. */
export function withChildren<State>(render: RenderProp<State> | undefined, children: ReactNode): RenderProp<State> | undefined {
  const element = elementOf(render);
  // eslint-disable-next-line react-x/no-clone-element -- only supply compound children; SDK retains render state, handlers and refs.
  return element ? cloneElement(element, {children}) : render;
}
/** Cancels the DOM default and, for Base UI events, the SDK's own handler. */
export function cancelActivation(event: SyntheticEvent): void {
  event.preventDefault();
  if ("preventBaseUIHandler" in event && typeof event.preventBaseUIHandler === "function") event.preventBaseUIHandler();
}
/** Whether a caller handler cancelled the DOM default or the Base UI handler. */
export function isActivationCancelled(event: SyntheticEvent): boolean {
  return (
    event.defaultPrevented
    || event.nativeEvent.defaultPrevented
    || ("baseUIHandlerPrevented" in event && event.baseUIHandlerPrevented === true)
  );
}

/** The registration fields that local mobile submenu navigation reads. */
interface MobileSubmenuEntry {
  readonly id: string;
  readonly parentId: string | null;
  readonly triggerRef: RefObject<HTMLElement | null>;
  readonly panelRef: RefObject<HTMLElement | null>;
  readonly optionsRef: RefObject<Pick<BaseMenu.SubmenuRoot.Props, "open" | "onOpenChange">>;
}

/** Resolves the connected, open ancestor chain ending at `id`; `null` while any panel is absent or closed. */
export function getLivePath(id: string, entries: ReadonlyMap<string, MobileSubmenuEntry>): readonly string[] | null {
  const path: string[] = [];
  let entry = entries.get(id);
  while (entry) {
    if (!entry.panelRef.current?.isConnected || entry.optionsRef.current.open === false) return null;
    if (path.includes(entry.id)) throw new Error(`Duplicate DropDrawerSub id: ${entry.id}`);
    path.unshift(entry.id);
    if (entry.parentId === null) return path;
    entry = entries.get(entry.parentId);
  }
  return null;
}

/**
 * Creates mobile submenu change details like Base UI's own: `cancel()` and `allowPropagation()` are closures and the
 * `isCanceled`/`isPropagationAllowed` flags are getters, so destructured calls work and the flags reflect them.
 */
function createSubmenuChangeDetails(
  open: boolean,
  event: MouseEvent,
  trigger: Element | undefined,
): BaseMenu.SubmenuRoot.ChangeEventDetails {
  let canceled = false;
  let propagationAllowed = false;
  return {
    reason: open ? "trigger-press" : "close-press",
    event,
    trigger,
    cancel() {
      canceled = true;
    },
    allowPropagation() {
      propagationAllowed = true;
    },
    get isCanceled() {
      return canceled;
    },
    get isPropagationAllowed() {
      return propagationAllowed;
    },
    preventUnmountOnClose() {
      // Local panels are retained until the enclosing Drawer unmounts.
    },
  };
}

/** Mobile panels stay mounted; preventing their unmount is already guaranteed by that owner. */
export function requestSubmenuChange(entry: MobileSubmenuEntry, open: boolean, event: MouseEvent): boolean {
  const details = createSubmenuChangeDetails(open, event, entry.triggerRef.current ?? undefined);
  entry.optionsRef.current.onOpenChange?.(open, details);
  return !details.isCanceled && (entry.optionsRef.current.open === undefined || entry.optionsRef.current.open === open);
}

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

/** Visible trigger text for a mobile panel heading; `aria-hidden` and `hidden` decoration never names the panel. */
function readTriggerText(control: Element): string {
  const collect = (node: Node): string => {
    if (node.nodeType === node.TEXT_NODE) return node.nodeValue ?? "";
    if (node.nodeType !== node.ELEMENT_NODE) return "";
    const element = node as Element;
    if (element.getAttribute("aria-hidden") === "true" || element.hasAttribute("hidden")) return "";
    return Array.from(element.childNodes, collect).join("");
  };
  return Array.from(control.childNodes, collect).join("").replaceAll(/\s+/gu, " ").trim();
}

/**
 * Reports a mobile submenu trigger's text after every commit and after later descendant mutations, never during render.
 *
 * @param mobile - Whether the responsive owner is the mobile drawer.
 * @param controlRef - The rendered trigger control.
 * @param label - The trigger's declared text label, which takes precedence over its rendered text.
 * @param report - Stores the text with the owning submenu; equal values bail out.
 */
export function useTriggerText(
  mobile: boolean,
  controlRef: RefObject<HTMLElement | null>,
  label: string | undefined,
  report: (text: string) => void,
): void {
  useLayoutEffect(() => {
    const control = controlRef.current;
    if (!mobile || !control) return undefined;
    const declared = label?.trim();
    if (declared) {
      report(declared);
      return undefined;
    }
    const measure = (): void => report(readTriggerText(control));
    measure();
    const Observer = control.ownerDocument.defaultView?.MutationObserver;
    if (!Observer) return undefined;
    const observer = new Observer(measure);
    observer.observe(control, {
      attributeFilter: ["aria-hidden", "hidden"],
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  });
}

/**
 * Publishes a submenu's resolved panel title to the mobile navigation owner for as long as it is mounted.
 *
 * @param mobile - Whether the responsive owner is the mobile drawer.
 * @param id - The submenu identity.
 * @param title - The resolved title; an empty value lets the owner fall back to the root title.
 * @param publish - The navigation owner's title store, when rendered within mobile content.
 */
export function usePublishedPanelTitle(
  mobile: boolean,
  id: string,
  title: string,
  publish: ((id: string, title: string | undefined) => void) | undefined,
): void {
  useLayoutEffect(() => {
    if (!mobile || !publish) return undefined;
    publish(id, title);
    return () => publish(id, undefined);
  }, [id, mobile, publish, title]);
}

/**
 * Owns mobile panel titles as state, so the heading renders from state rather than refs or DOM reads.
 *
 * @returns The titles keyed by submenu id and a stable publisher whose state updater is pure.
 */
export function usePanelTitles(): readonly [ReadonlyMap<string, string>, (id: string, title: string | undefined) => void] {
  const [titles, setTitles] = useState<ReadonlyMap<string, string>>(() => new Map());
  const publish = useCallback((id: string, title: string | undefined): void => {
    setTitles((previous) => {
      if (previous.get(id) === title) return previous;
      const next = new Map(previous);
      if (title === undefined) next.delete(id);
      else next.set(id, title);
      return next;
    });
  }, []);
  return [titles, publish];
}

/**
 * Derives panel focus intent from each committed path transition, which keeps every path updater pure under Strict Mode
 * replay. Call it before the focus-recovery hook so this layout effect runs first in the same commit.
 *
 * @param open - Whether the root drawer is open; closed transitions record no intent.
 * @param path - The committed navigation path.
 * @param entriesRef - Live submenu registrations with their trigger refs.
 * @param pendingFocusRef - Receives the closed panel's trigger when returning, otherwise `"entry"`.
 */
export function usePathFocusIntent(
  open: boolean,
  path: readonly string[],
  entriesRef: RefObject<ReadonlyMap<string, Pick<MobileSubmenuEntry, "triggerRef">>>,
  pendingFocusRef: RefObject<"entry" | HTMLElement | null>,
): void {
  const committedPathRef = useRef(path);
  const committedTriggersRef = useRef<ReadonlyMap<string, HTMLElement | null>>(new Map());
  useLayoutEffect(() => {
    const previous = committedPathRef.current;
    const previousTriggers = committedTriggersRef.current;
    committedPathRef.current = path;
    committedTriggersRef.current = new Map(
      path.map((id): [string, HTMLElement | null] => [id, entriesRef.current.get(id)?.triggerRef.current ?? null]),
    );
    if (!open || previous === path) return;
    const returning = path.length < previous.length && path.every((id, index) => id === previous[index]);
    const closedId = returning ? previous[path.length] : undefined;
    // A re-identified submenu has left the registry; its last committed trigger still receives returning focus.
    pendingFocusRef.current =
      closedId === undefined
        ? "entry"
        : (entriesRef.current.get(closedId)?.triggerRef.current ?? previousTriggers.get(closedId) ?? "entry");
  }, [entriesRef, open, path, pendingFocusRef]);
}
