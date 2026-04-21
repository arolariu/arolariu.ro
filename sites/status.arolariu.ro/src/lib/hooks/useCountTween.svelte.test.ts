import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {flushSync} from "svelte";
import {useCountTween} from "./useCountTween.svelte";

// The hook reads window.matchMedia at module init. We're not asserting on
// reduced-motion behavior here (jsdom default returns matches=false, which
// is what we want for "animate" mode); the hook's reduced-motion branch is
// a straight assignment anyway.

describe("useCountTween", () => {
  let rafCallbacks: Array<(now: number) => void>;
  let nowValue: number;

  beforeEach(() => {
    rafCallbacks = [];
    nowValue = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: (now: number) => void) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.stubGlobal("cancelAnimationFrame", (_id: number) => { /* noop for test */ });
    // performance.now may be missing or non-configurable on jsdom — stub a
    // whole performance object that the hook uses.
    vi.stubGlobal("performance", {now: () => nowValue});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function flushFrame(delta: number) {
    nowValue += delta;
    const cbs = rafCallbacks;
    rafCallbacks = [];
    for (const cb of cbs) cb(nowValue);
    flushSync();
  }

  it("starts at 0 and tweens towards the target", () => {
    const root = $effect.root(() => {
      let target = $state(0);
      const display = useCountTween(() => target);

      // Initial value — no animation yet.
      flushSync();
      expect(display()).toBe(0);

      // Bump target; effect schedules an RAF.
      target = 100;
      flushSync();
      expect(rafCallbacks.length).toBeGreaterThan(0);

      // Half-way through the 400ms default duration.
      flushFrame(200);
      // easeOutCubic at t=0.5: 1 - (1-0.5)^3 = 0.875
      expect(display()).toBeCloseTo(87.5, 0);

      // At the end, value snaps to the target.
      flushFrame(300);
      expect(display()).toBe(100);
    });
    root();
  });

  it("snaps to target when from === to (no animation scheduled)", () => {
    const root = $effect.root(() => {
      let target = $state(42);
      const display = useCountTween(() => target);

      flushSync();
      // from=0, to=42 — animation runs once; finish it.
      flushFrame(500);
      expect(display()).toBe(42);

      // Re-setting target to 42 is a no-op — from=to=42, no RAF scheduled.
      const rafsBefore = rafCallbacks.length;
      target = 42;
      flushSync();
      expect(rafCallbacks.length).toBe(rafsBefore);
      expect(display()).toBe(42);
    });
    root();
  });

  it("respects a custom durationMs option", () => {
    const root = $effect.root(() => {
      let target = $state(0);
      const display = useCountTween(() => target, {durationMs: 100});

      flushSync();
      target = 100;
      flushSync();

      // At t=50ms (half of 100ms), eased = 1 - 0.125 = 0.875 → display ≈ 87.5.
      flushFrame(50);
      expect(display()).toBeCloseTo(87.5, 0);

      flushFrame(60);
      expect(display()).toBe(100);
    });
    root();
  });
});
