/**
 * Positioning state for an anchor-relative floating surface (e.g.
 * SegmentTooltip). Computes:
 *
 * - `top` — page-relative y above the anchor (for `transform: translateY(-100%)`)
 * - `left` — page-relative x at the centre of the anchor, clamped so the
 *    tooltip's right edge never crosses the viewport right edge
 * - `flipHoriz` — true when the clamp kicked in (caller can use this to
 *    shift the arrow pointer)
 *
 * Listens for scroll + resize so the floating surface tracks the anchor
 * while the page moves. Cleans up its own listeners on effect teardown.
 *
 * Exposed for unit testing: `computePopoverPosition` is the pure math used
 * inside the effect — takes an anchor rect, tooltip width, and viewport
 * geometry, returns the same `{top, left, flipHoriz}` shape.
 *
 * SegmentTooltip uses this hook (rather than going through `Popover.svelte`)
 * because its viewport-flip edge cases don't fit the generic Popover
 * contract. The hook keeps the bespoke math unit-testable.
 */

/** Resolved positioning state for a popover surface. */
export interface PopoverPosition {
  /** Page-relative y (document coords). Caller stacks via `translateY(-100%)`. */
  readonly top: number;
  /** Page-relative x at the tooltip's horizontal centre (after clamp). */
  readonly left: number;
  /** True when the right-edge clamp kicked in (caller can flip the arrow). */
  readonly flipHoriz: boolean;
}

/** Subset of `window` geometry the positioning math needs. Passed in for testability. */
export interface ViewportGeometry {
  readonly scrollX: number;
  readonly scrollY: number;
  readonly innerWidth: number;
}

/**
 * Pure positioning math. Given:
 *  - `anchorRect` — the anchor element's DOMRect
 *  - `tooltipWidth` — measured width of the tooltip (fallback 280 when
 *    the element hasn't mounted yet)
 *  - `viewport` — `scrollX`, `scrollY`, `innerWidth`
 *
 * Returns the `{top, left, flipHoriz}` state.
 *
 * `top` sits 8px above the anchor (caller stacks the tooltip above the
 * anchor with `transform: translate(-50%, -100%)`). `left` is page-relative
 * at the anchor's horizontal centre, clamped so the right edge of the
 * tooltip never crosses `viewport.innerWidth - 8`.
 */
export function computePopoverPosition(
  anchorRect: DOMRect | {readonly top: number; readonly left: number; readonly width: number},
  tooltipWidth: number,
  viewport: ViewportGeometry,
): PopoverPosition {
  const desiredLeft = anchorRect.left + anchorRect.width / 2 + viewport.scrollX;
  const viewportRight = viewport.scrollX + viewport.innerWidth - 8;
  const flipHoriz = desiredLeft + tooltipWidth / 2 > viewportRight;
  const clampedLeft = flipHoriz
    ? Math.min(desiredLeft, viewportRight - tooltipWidth / 2)
    : desiredLeft;
  return {
    top: anchorRect.top + viewport.scrollY - 8,
    left: clampedLeft,
    flipHoriz,
  };
}

/**
 * Reactive popover position hook. Tracks scroll+resize for as long as
 * `active()` returns true, recomputes the position, and exposes it as a
 * `$state`-style accessor.
 *
 * @param anchor        Getter for the anchor element (e.g. the hovered segment).
 * @param tooltipEl     Getter for the tooltip element (measured on recompute).
 * @param active        Getter for "is the tooltip visible right now" — when it
 *                      returns false, no listeners are registered.
 * @param fallbackWidth Width used when `tooltipEl()` is not yet bound (default 280).
 * @returns Accessor returning the latest `PopoverPosition`.
 *
 * Side effects: registers passive `scroll` + `resize` listeners on the window
 * while active; listeners are torn down automatically on scope teardown or
 * when `active()` flips to false (effect re-runs).
 */
export function usePopoverPosition(
  anchor: () => HTMLElement | null,
  tooltipEl: () => HTMLElement | null,
  active: () => boolean,
  fallbackWidth = 280,
): () => PopoverPosition {
  let position = $state<PopoverPosition>({top: 0, left: 0, flipHoriz: false});

  function recompute() {
    const el = anchor();
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const tipWidth = tooltipEl()?.offsetWidth ?? fallbackWidth;
    position = computePopoverPosition(rect, tipWidth, {
      scrollX: window.scrollX,
      scrollY: window.scrollY,
      innerWidth: window.innerWidth,
    });
  }

  $effect(() => {
    if (!active()) return;
    // Ensure the reactive deps track both the anchor and tooltipEl getter;
    // re-running when they change (element switched or re-bound) is part of
    // the hook's contract.
    anchor();
    tooltipEl();
    recompute();
    const opts: AddEventListenerOptions = {passive: true};
    window.addEventListener("scroll", recompute, opts);
    window.addEventListener("resize", recompute);
    return () => {
      window.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
    };
  });

  return () => position;
}
