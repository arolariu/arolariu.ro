/**
 * Returns a $state-backed accessor that updates every 60 seconds.
 * Callers use it as a reactive dependency inside $derived.by so
 * relative-time displays ("3 min ago") re-render on each tick without
 * each consumer managing its own timer.
 *
 * Usage:
 *   const nowTick = useMinuteTick();
 *   const label = $derived.by(() => formatRelativeTime(iso, nowTick()));
 *
 * Uses `$effect` (not `onMount`) so the hook can be exercised directly
 * from an `$effect.root` scope in unit tests, matching the pattern
 * established by useCountTween. The effect body is client-only, so it's
 * SSR-safe.
 *
 * @returns `() => number` — accessor returning the last tick's `Date.now()` value.
 *
 * Side effects: schedules a `setInterval(..., 60_000)`, cleaned up via the
 * `$effect` teardown return when the scope (component or effect.root) is destroyed.
 */
export function useMinuteTick(): () => number {
  let nowTick = $state(Date.now());
  $effect(() => {
    const id = setInterval(() => { nowTick = Date.now(); }, 60_000);
    return () => clearInterval(id);
  });
  return () => nowTick;
}
