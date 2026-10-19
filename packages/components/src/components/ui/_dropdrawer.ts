"use client";

import type {Menu as BaseMenu} from "@base-ui/react/menu";
import {useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject} from "react";

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

/** Mobile panels stay mounted; preventing their unmount is already guaranteed by that owner. */
export function requestSubmenuChange(entry: MobileSubmenuEntry, open: boolean, event: MouseEvent): boolean {
  const details: BaseMenu.SubmenuRoot.ChangeEventDetails = {
    reason: open ? "trigger-press" : "close-press",
    event,
    trigger: entry.triggerRef.current ?? undefined,
    isCanceled: false,
    isPropagationAllowed: false,
    cancel() {
      this.isCanceled = true;
    },
    allowPropagation() {
      this.isPropagationAllowed = true;
    },
    preventUnmountOnClose() {
      // Local panels are retained until the enclosing Drawer unmounts.
    },
  };
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
