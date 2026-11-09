"use client";

/**
 * Private registry, rendered-order and visual-order hooks for Command; not a public subpath.
 *
 * @remarks
 * Rendered order is the consumer's order, read from the hidden position anchors. Visual order is the displayed order:
 * rendered order, or descending filter score with rendered-order ties while filtering. Keyboard navigation follows it.
 */
import * as React from "react";

import {affectsRenderedOrder, isAnchorInOrder, measureRenderedOrder, sameRanks} from "./_command-order";

/** A registered option. */
export interface RegisteredItem {
  readonly disabled: boolean;
  readonly forceMount: boolean;
  readonly hidden: boolean;
  readonly groupId: string | null;
  readonly id: string;
  readonly keywords: readonly string[];
  readonly ref: React.RefObject<HTMLDivElement | null>;
  readonly value: string;
}

/** A registered group. */
export interface RegisteredGroup {
  readonly id: string;
  readonly parentId: string | null;
  readonly ref: React.RefObject<HTMLDivElement | null>;
}

/** Registered options and groups keyed by id; `revision` counts accepted changes. */
export interface Registry {
  readonly items: ReadonlyMap<string, RegisteredItem>;
  readonly groups: ReadonlyMap<string, RegisteredGroup>;
  readonly revision: number;
}

/** Case-insensitive substring match of the search against the value and keywords: `1` or `0`. */
export function defaultCommandFilter(value: string, search: string, keywords: readonly string[] = []): number {
  const haystack = [value, ...keywords].join(" ").trim().toLowerCase();
  return haystack.includes(search.trim().toLowerCase()) ? 1 : 0;
}

/**
 * Owns Command's option/group registry.
 *
 * @returns The registry and stable, idempotent register/unregister callbacks; re-registering identical metadata is a no-op.
 */
export function useCommandRegistry(): Readonly<{
  registry: Registry;
  registerItem: (item: RegisteredItem) => void;
  unregisterItem: (id: string) => void;
  registerGroup: (group: RegisteredGroup) => void;
  unregisterGroup: (id: string) => void;
}> {
  const [registry, setRegistry] = React.useState<Registry>(() => ({items: new Map(), groups: new Map(), revision: 0}));
  const registerItem = React.useCallback((item: RegisteredItem): void => {
    setRegistry((current) => {
      const existing = current.items.get(item.id);
      if (
        existing
        && existing.disabled === item.disabled
        && existing.forceMount === item.forceMount
        && existing.hidden === item.hidden
        && existing.groupId === item.groupId
        && existing.ref === item.ref
        && existing.value === item.value
        && existing.keywords.length === item.keywords.length
        && existing.keywords.every((keyword, index) => keyword === item.keywords[index])
      )
        return current;
      const items = new Map(current.items);
      items.set(item.id, {...item, keywords: [...item.keywords]});
      return {...current, items, revision: current.revision + 1};
    });
  }, []);
  const unregisterItem = React.useCallback((id: string): void => {
    setRegistry((current) => {
      if (!current.items.has(id)) return current;
      const items = new Map(current.items);
      items.delete(id);
      return {...current, items, revision: current.revision + 1};
    });
  }, []);
  const registerGroup = React.useCallback((group: RegisteredGroup): void => {
    setRegistry((current) => {
      const existing = current.groups.get(group.id);
      if (existing?.ref === group.ref && existing.parentId === group.parentId) return current;
      const groups = new Map(current.groups);
      groups.set(group.id, group);
      return {...current, groups, revision: current.revision + 1};
    });
  }, []);
  const unregisterGroup = React.useCallback((id: string): void => {
    setRegistry((current) => {
      if (!current.groups.has(id)) return current;
      const groups = new Map(current.groups);
      groups.delete(id);
      return {...current, groups, revision: current.revision + 1};
    });
  }, []);
  return {registry, registerItem, unregisterItem, registerGroup, unregisterGroup};
}

/** Rendered-order state shared by Command, CommandList and the position anchors. */
export interface RenderedOrder {
  readonly listRef: React.RefObject<HTMLDivElement | null>;
  /** Sibling-relative rendered rank of each anchored id, measured after commit; placement moves never change it. */
  readonly natural: ReadonlyMap<string, number>;
  readonly measureOrder: () => void;
  /** O(1) local check per committed anchor; only an out-of-order or unmeasured anchor pays for a full measure. */
  readonly verifyOrder: (anchor: Element | null) => void;
  /** Observes the list for moves that re-render no Command part; returns the disconnecting cleanup. */
  readonly observeOrder: (list: HTMLElement) => () => void;
  /** Drops the observer's records of Command's own placement moves so they never feed back into it. */
  readonly drainObservedMoves: () => void;
  /** The latest reconciliation, which the observer runs. */
  readonly reconcileRef: React.RefObject<() => void>;
}

/**
 * Owns the rendered order read from the position anchors and the list's MutationObserver.
 *
 * @remarks
 * The observer delivers in a microtask after a commit that moved anchors without re-rendering a Command part; it corrects
 * DOM placement there, and the new ranks reach keyboard order in the commit that this schedules. Records that move no
 * anchor (content, text or attribute changes inside an option) are ignored.
 *
 * @returns The rendered-order state and callbacks.
 */
export function useRenderedOrder(): RenderedOrder {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const observerRef = React.useRef<MutationObserver | null>(null);
  const reconcileRef = React.useRef<() => void>(() => undefined);
  const naturalRef = React.useRef<ReadonlyMap<string, number>>(new Map());
  const [natural, setNatural] = React.useState<ReadonlyMap<string, number>>(() => new Map());
  const measureOrder = React.useCallback((): void => {
    const ranks = listRef.current ? measureRenderedOrder(listRef.current) : new Map<string, number>();
    if (sameRanks(ranks, naturalRef.current)) return;
    naturalRef.current = ranks;
    setNatural(ranks);
  }, []);
  const verifyOrder = React.useCallback(
    (anchor: Element | null): void => {
      if (anchor && listRef.current?.contains(anchor) && !isAnchorInOrder(anchor, naturalRef.current)) measureOrder();
    },
    [measureOrder],
  );
  const observeOrder = React.useCallback((list: HTMLElement): (() => void) => {
    const observer = new MutationObserver((records) => {
      if (affectsRenderedOrder(records)) reconcileRef.current();
    });
    observer.observe(list, {childList: true, subtree: true});
    observerRef.current = observer;
    return () => {
      observer.disconnect();
      if (observerRef.current === observer) observerRef.current = null;
    };
  }, []);
  const drainObservedMoves = React.useCallback((): void => {
    observerRef.current?.takeRecords();
  }, []);
  return {listRef, natural, measureOrder, verifyOrder, observeOrder, drainObservedMoves, reconcileRef};
}

/** A registered option with its filter score and visibility. */
export interface RankedItem {
  readonly item: RegisteredItem;
  readonly score: number;
  readonly visible: boolean;
}

/** Options in visual order, with group scores and an O(1) visibility lookup. */
export interface VisualOrder {
  readonly rankedItems: readonly RankedItem[];
  /** Best visible descendant score and rendered rank of each group that has a visible descendant. */
  readonly groupRanks: ReadonlyMap<string, Readonly<{score: number; order: number}>>;
  readonly visibleItems: readonly RegisteredItem[];
  readonly visibleIds: ReadonlySet<string>;
}

/**
 * Derives visual order: rendered order, or while filtering descending score with rendered-order ties, each group ranked by
 * its best visible descendant and kept together with its subtree like the DOM.
 *
 * @param options - Registry, rendered ranks, filter, search and whether filtering applies.
 * @returns The ranked options, group ranks, visible options in visual order and their ids.
 */
export function useVisualOrder({
  registry,
  natural,
  filter,
  search,
  isFiltering,
}: Readonly<{
  registry: Registry;
  natural: ReadonlyMap<string, number>;
  filter: (value: string, search: string, keywords?: string[]) => number;
  search: string;
  isFiltering: boolean;
}>): VisualOrder {
  const rankedItems = React.useMemo(
    () =>
      [...registry.items.values()].map((item) => {
        const result = isFiltering ? filter(item.value, search, [...item.keywords]) : 1;
        const score = Number.isFinite(result) && result > 0 ? result : 0;
        return {item, score, visible: !item.hidden && (item.forceMount || !isFiltering || score > 0)};
      }),
    [filter, isFiltering, registry.items, search],
  );
  const groupRanks = React.useMemo(() => {
    const ranks = new Map<string, {score: number; order: number}>();
    for (const {item, score, visible} of rankedItems) {
      let groupId = visible ? item.groupId : null;
      const visited = new Set<string>();
      while (groupId && !visited.has(groupId)) {
        visited.add(groupId);
        const existing = ranks.get(groupId);
        ranks.set(groupId, {
          score: Math.max(existing?.score ?? 0, score),
          order: natural.get(groupId) ?? Number.MAX_SAFE_INTEGER,
        });
        groupId = registry.groups.get(groupId)?.parentId ?? null;
      }
    }
    return ranks;
  }, [natural, rankedItems, registry.groups]);
  const visibleItems = React.useMemo(() => {
    const paths = rankedItems
      .filter(({visible}) => visible)
      .map(({item, score}) => {
        const path = [{id: item.id, score, order: natural.get(item.id) ?? Number.MAX_SAFE_INTEGER}];
        let {groupId} = item;
        const visited = new Set<string>();
        while (groupId && !visited.has(groupId)) {
          visited.add(groupId);
          const rank = groupRanks.get(groupId);
          if (!rank) break;
          path.unshift({id: groupId, ...rank});
          groupId = registry.groups.get(groupId)?.parentId ?? null;
        }
        return {item, path};
      });
    return paths
      .toSorted((a, b) => {
        // Compare the first diverging siblings, keeping each ancestor's subtree together like the DOM.
        for (let index = 0; index < Math.min(a.path.length, b.path.length); index++) {
          const first = a.path[index];
          const second = b.path[index];
          if (first && second && first.id !== second.id)
            return (isFiltering ? second.score - first.score : 0) || first.order - second.order;
        }
        return 0;
      })
      .map(({item}) => item);
  }, [groupRanks, isFiltering, natural, rankedItems, registry.groups]);
  // One Set per visual order keeps each option's visibility lookup O(1) instead of a scan per option.
  const visibleIds = React.useMemo(() => new Set(visibleItems.map((item) => item.id)), [visibleItems]);
  return {rankedItems, groupRanks, visibleItems, visibleIds};
}
