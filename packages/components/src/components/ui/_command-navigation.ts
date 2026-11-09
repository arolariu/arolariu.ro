/**
 * Private keyboard-navigation helpers for Command; not a public subpath.
 *
 * @remarks
 * Directive-free and pure: they read the visual order Command derives from rendered ranks and filter scores (the order the
 * options are displayed in), never the DOM, and hold no hooks or state.
 */
import type * as React from "react";

/** A visible option in visual order, with its innermost registered group (`null` at the list root). */
export interface NavigableItem {
  readonly id: string;
  readonly groupId: string | null;
  readonly disabled: boolean;
}

/** A parsed Command keyboard request. */
export type NavigationRequest =
  | Readonly<{kind: "step"; direction: 1 | -1; group: boolean}>
  | Readonly<{kind: "endpoint"; direction: 1 | -1}>
  | Readonly<{kind: "activate"}>;

function vimNavigationRequest(key: string): NavigationRequest | null {
  if (key === "n" || key === "j") return {kind: "step", direction: 1, group: false};
  if (key === "p" || key === "k") return {kind: "step", direction: -1, group: false};
  return null;
}

/**
 * Parses a keydown that reached the Command root.
 *
 * @param event - The root keydown.
 * @param vimBindings - Whether Ctrl+n/j and Ctrl+p/k step.
 * @returns The request, or `null` for keys Command leaves alone (IME composition, Shift and unrelated modifiers).
 */
export function navigationRequest(event: React.KeyboardEvent<HTMLElement>, vimBindings: boolean): NavigationRequest | null {
  if (event.nativeEvent.isComposing || event.shiftKey) return null;
  if (event.ctrlKey) {
    if (!vimBindings || event.altKey || event.metaKey) return null;
    return vimNavigationRequest(event.key);
  }
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    const direction = event.key === "ArrowDown" ? 1 : -1;
    return event.metaKey ? {kind: "endpoint", direction} : {kind: "step", direction, group: event.altKey};
  }
  if (event.altKey || event.metaKey) return null;
  if (event.key === "Home") return {kind: "endpoint", direction: -1};
  if (event.key === "End") return {kind: "endpoint", direction: 1};
  return event.key === "Enter" ? {kind: "activate"} : null;
}

/** Consecutive options sharing an innermost group form one run; an ungrouped option is a run of its own. */
function runKeyAt(visible: readonly NavigableItem[], index: number): string | undefined {
  const item = visible[index];
  return item ? (item.groupId ?? item.id) : undefined;
}

/**
 * Alt+arrow target: the next run's first selectable option, or the previous run's (skipping runs with none). A run starts
 * wherever the innermost group changes, including where a nested group ends inside its parent, so jumps never reverse or cycle.
 */
function groupBoundaryTarget<T extends NavigableItem>(visible: readonly T[], index: number, direction: 1 | -1): T | undefined {
  const key = runKeyAt(visible, index);
  if (direction > 0) {
    let boundary = index + 1;
    while (boundary < visible.length && runKeyAt(visible, boundary) === key) boundary += 1;
    return visible.slice(boundary).find((item) => !item.disabled);
  }
  let end = index;
  while (end > 0 && runKeyAt(visible, end - 1) === key) end -= 1;
  while (end > 0) {
    const previousKey = runKeyAt(visible, end - 1);
    let start = end - 1;
    while (start > 0 && runKeyAt(visible, start - 1) === previousKey) start -= 1;
    const target = visible.slice(start, end).find((item) => !item.disabled);
    if (target) return target;
    end = start;
  }
  return undefined;
}

/**
 * Resolves the option an arrow or Vim step moves to, in visual order.
 *
 * @remarks
 * Plain steps move between selectable options. Group steps (Alt+arrows) move to a group boundary, see
 * `groupBoundaryTarget`. Without an active option, every step starts at the first selectable option.
 *
 * @param visible - Visible options, disabled ones included, in visual order.
 * @param activeId - The active option's id, or `null`.
 * @param request - The step request.
 * @param loop - Whether a step past either end wraps to the other end.
 * @returns The target option, or `undefined` to keep the current selection.
 */
export function stepTarget<T extends NavigableItem>(
  visible: readonly T[],
  activeId: string | null,
  request: Extract<NavigationRequest, {kind: "step"}>,
  loop: boolean,
): T | undefined {
  const selectable = visible.filter((item) => !item.disabled);
  const index = visible.findIndex((item) => item.id === activeId);
  const target =
    index === -1
      ? selectable[0]
      : request.group
        ? groupBoundaryTarget(visible, index, request.direction)
        : selectable[selectable.findIndex((item) => item.id === activeId) + request.direction];
  if (target) return target;
  return loop ? (request.direction > 0 ? selectable[0] : selectable.at(-1)) : undefined;
}

/**
 * Whether an event comes from a native control nested in a Command part, which keeps its own keys and clicks.
 *
 * @param target - The event target.
 * @returns `true` for a button, link or form field other than CommandInput.
 */
export function isNestedControl(target: EventTarget): boolean {
  if (!(target instanceof Element)) return false;
  const control = target.closest("button, a, input, textarea, select");
  return control !== null && control.getAttribute("data-slot") !== "command-input";
}
