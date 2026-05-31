/**
 * Animated counter hook. Returns a `$state`-like accessor of a value that
 * tweens smoothly from its current displayed value to the current target
 * whenever the target changes. Used by the four SummaryStats cards to
 * "type" the final number rather than jumping to it.
 *
 * Uses `requestAnimationFrame` directly — the tween is cancellable
 * (calling back in with a new target during flight ramps from the
 * current frame value, not the stale "from") and respects
 * `prefers-reduced-motion` by snapping straight to the target.
 *
 * Usage:
 *   const uptime = $derived(computeOverallUptime(services));
 *   const displayUptime = useCountTween(() => uptime);
 *   // in markup: {displayUptime().toFixed(3)}%
 */

import {untrack} from "svelte";

export interface UseCountTweenOptions {
  /** Tween duration in ms. Default 400. */
  readonly durationMs?: number;
}

/**
 * @param target Reactive getter for the target number (read inside an `$effect`).
 * @param options Optional `{durationMs}` override (default 400ms).
 * @returns A `$state`-backed accessor (`() => number`) that lerps toward `target()`
 *          on each change, easing with `easeOutCubic`.
 *
 * Side effects: creates two `$effect`s — one drives the animation, one handles
 * `cancelAnimationFrame` teardown on scope exit.
 *
 * SSR-safe: `window`/`matchMedia` access is guarded; `$effect` bodies only run
 * client-side.
 *
 * Reduced motion: if `prefers-reduced-motion: reduce` is set at hook creation,
 * the display value snaps to the target without animation.
 */
export function useCountTween(target: () => number, options?: UseCountTweenOptions): () => number {
  const durationMs = options?.durationMs ?? 400;

  let display = $state(0);
  const animationFrame = {id: null as number | null};
  const browserWindow = globalThis.window as Window | undefined;

  const prefersReducedMotion =
    browserWindow !== undefined &&
    browserWindow.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  function cleanupAnimationFrame(): void {
    if (animationFrame.id !== null) globalThis.cancelAnimationFrame(animationFrame.id);
  }

  function animate(from: number, to: number): void {
    if (animationFrame.id !== null) {
      globalThis.cancelAnimationFrame(animationFrame.id);
      animationFrame.id = null;
    }
    if (from === to) {
      display = to;
      return;
    }
    const start = globalThis.performance.now();
    function step(now: number): void {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - progress) ** 3;
      display = from + (to - from) * eased;
      animationFrame.id = progress < 1 ? globalThis.requestAnimationFrame(step) : null;
    }
    animationFrame.id = globalThis.requestAnimationFrame(step);
  }

  $effect(() => {
    const to = target();
    untrack(() => {
      if (prefersReducedMotion) {
        display = to;
        return;
      }
      animate(display, to);
    });
  });

  // Cleanup in its own (setup-free) effect so it runs on scope teardown.
  // Without being re-established on every target change. Usable from
  // Component scope OR from `$effect.root` scope (so unit tests can
  // Exercise the hook with runes alone, no component harness).
  $effect(() => cleanupAnimationFrame);

  return () => display;
}
