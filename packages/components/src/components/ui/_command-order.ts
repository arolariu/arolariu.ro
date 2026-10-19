/**
 * Private DOM ordering helpers for Command; not a public subpath.
 *
 * @remarks
 * Every registered group/option renders a hidden, never-moved position anchor as its first DOM node. React places anchors
 * in the consumer's rendered order, so Command measures that order from them and pins registered nodes back to them.
 * Directive-free: these helpers hold no hooks or state.
 */

/** Attribute of the hidden, never-moved anchor rendered before each registered group/option; its value is the node id. */
export const ANCHOR = "data-command-anchor";
const ANCHOR_SELECTOR = "[data-command-anchor]";
/** A registered group node scopes the sibling-relative ranks of the anchors it contains. */
const GROUP_SELECTOR = "[data-command-group]";

/** A registered group/option node with its current filter score. */
export interface RankedNode {
  readonly node: HTMLDivElement;
  readonly score: number;
}

interface NativeTextSelection {
  readonly start: number;
  readonly end: number;
  readonly direction: "forward" | "backward" | "none";
}

/** The real focused descendant, and its native text selection, captured before registered nodes move. */
export interface NativeFocusSnapshot {
  readonly element: HTMLElement;
  readonly selection: NativeTextSelection | null;
}

function captureRegisteredFocus(entries: readonly RankedNode[]): NativeFocusSnapshot | null {
  const element = entries[0]?.node.ownerDocument.activeElement;
  if (!(element instanceof HTMLElement) || !entries.some(({node}) => node.contains(element))) return null;
  let selection: NativeTextSelection | null = null;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const {selectionStart: start, selectionEnd: end, selectionDirection: direction} = element;
    if (start !== null && end !== null) selection = {start, end, direction: direction === null ? "none" : direction};
  }
  return {element, selection};
}

/**
 * Restores a focused descendant captured before registered nodes moved, including its native text selection.
 *
 * @param snapshot - The captured focus, or `null` when focus was not inside a registered node.
 */
export function restoreRegisteredFocus(snapshot: NativeFocusSnapshot | null): void {
  if (!snapshot) return;
  const {element, selection} = snapshot;
  const owner = element.ownerDocument;
  const focused = owner.activeElement;
  if (!element.isConnected || element.closest("[hidden], [inert]") || focused === element) return;
  // A caller that deliberately focused another control during the move keeps ownership.
  if (focused && focused !== owner.body && focused !== owner.documentElement) return;
  element.focus({preventScroll: true});
  if (
    owner.activeElement === element
    && selection
    && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
    && element.selectionStart !== null
  ) {
    element.setSelectionRange(selection.start, selection.end, selection.direction);
  }
}

/**
 * Measures each anchored id's rendered rank among the anchors of its nearest registered group, or of the list.
 *
 * @remarks
 * Ranks are sibling-relative: placement moves whole nodes and never anchors, so it cannot change them, and they change
 * only when React commits a new rendered order or anchor set. Registered siblings share one scope, which is all the
 * keyboard-order comparison needs. One pass over the list subtree: O(n).
 *
 * @param list - The mounted CommandList element.
 * @returns The rendered rank of every anchored id.
 */
export function measureRenderedOrder(list: Element): Map<string, number> {
  const ranks = new Map<string, number>();
  const counts = new Map<Element, number>();
  for (const anchor of list.querySelectorAll(ANCHOR_SELECTOR)) {
    const group = anchor.parentElement?.closest(GROUP_SELECTOR);
    const scope = group && list.contains(group) ? group : list;
    const rank = counts.get(scope) ?? 0;
    counts.set(scope, rank + 1);
    ranks.set(anchor.getAttribute(ANCHOR) ?? "", rank);
  }
  return ranks;
}

/**
 * Compares two rank maps.
 *
 * @param first - A rank map.
 * @param second - Another rank map.
 * @returns Whether both hold the same ids with the same ranks.
 */
export function sameRanks(first: ReadonlyMap<string, number>, second: ReadonlyMap<string, number>): boolean {
  return first.size === second.size && [...first].every(([id, rank]) => second.get(id) === rank);
}

/**
 * Checks, in O(1) amortized, that an anchor is ranked and still follows its previous anchor sibling.
 *
 * @param anchor - A committed position anchor.
 * @param ranks - The last committed rendered ranks.
 * @returns Whether the committed ranks still describe this anchor's place.
 */
export function isAnchorInOrder(anchor: Element, ranks: ReadonlyMap<string, number>): boolean {
  let previous = anchor.previousElementSibling;
  while (previous && !previous.hasAttribute(ANCHOR)) previous = previous.previousElementSibling;
  const rank = ranks.get(anchor.getAttribute(ANCHOR) ?? "");
  const previousRank = previous ? ranks.get(previous.getAttribute(ANCHOR) ?? "") : -1;
  return rank !== undefined && previousRank !== undefined && previousRank < rank;
}

/** Registered entries placed directly in `parent`, in the rendered order of their React-placed, never-moved anchors. */
function anchoredEntries(parent: HTMLElement, entries: ReadonlyMap<string, RankedNode>): Array<readonly [Element, RankedNode]> {
  const slots: Array<readonly [Element, RankedNode]> = [];
  for (const anchor of parent.children) {
    const entry = anchor.hasAttribute(ANCHOR) ? entries.get(anchor.getAttribute(ANCHOR) ?? "") : undefined;
    if (entry?.node.parentElement === parent) slots.push([anchor, entry]);
  }
  return slots;
}

/**
 * Owns DOM placement of registered sibling groups/options.
 *
 * @remarks
 * A parent's i-th ranked node is pinned right after its i-th anchor, so filtering ranks by descending score with
 * rendered-order ties and unfiltered nodes return to their own anchors. Only misplaced nodes move; the real focused
 * descendant and its text selection are then restored through `restoreFocus`.
 *
 * @param entries - Registered nodes and scores keyed by id.
 * @param filtering - Whether search filtering ranks nodes by score.
 * @param restoreFocus - Restores the focus captured before any node moved.
 */
export function orderRegisteredNodes(
  entries: ReadonlyMap<string, RankedNode>,
  filtering: boolean,
  restoreFocus: (snapshot: NativeFocusSnapshot | null) => void,
): void {
  const parents = new Set<HTMLElement>();
  for (const {node} of entries.values()) if (node.parentElement) parents.add(node.parentElement);
  const moves: Array<readonly [Element, HTMLDivElement]> = [];
  for (const parent of parents) {
    const slots = anchoredEntries(parent, entries);
    const ranked = filtering ? slots.toSorted(([, a], [, b]) => b.score - a.score) : slots;
    for (const [index, [anchor]] of slots.entries()) {
      const node = ranked[index]?.[1].node;
      if (node && anchor.nextSibling !== node) moves.push([anchor, node]);
    }
  }
  if (moves.length === 0) return;
  const focused = captureRegisteredFocus([...entries.values()]);
  for (const [anchor, node] of moves) anchor.after(node);
  restoreFocus(focused);
}
