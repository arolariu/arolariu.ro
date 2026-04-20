import {describe, it, expect, vi, beforeEach, afterEach} from "vitest";
import {flushSync} from "svelte";
import {useMinuteTick} from "./useMinuteTick.svelte";

describe("useMinuteTick", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns a function", () => {
    const root = $effect.root(() => {
      const tick = useMinuteTick();
      flushSync();
      expect(typeof tick).toBe("function");
    });
    root();
  });

  it("initial value is close to Date.now()", () => {
    const root = $effect.root(() => {
      const before = Date.now();
      const tick = useMinuteTick();
      flushSync();
      const value = tick();
      // Value captured at hook creation — identical to Date.now() under fake timers.
      expect(value).toBeGreaterThanOrEqual(before);
      expect(value).toBeLessThanOrEqual(Date.now());
    });
    root();
  });

  it("advances the tick every 60 seconds", () => {
    const root = $effect.root(() => {
      const tick = useMinuteTick();
      flushSync();
      const initial = tick();

      // Advance 60 seconds → one interval fires.
      vi.advanceTimersByTime(60_000);
      flushSync();
      const afterOne = tick();
      expect(afterOne).toBeGreaterThan(initial);
      expect(afterOne - initial).toBeGreaterThanOrEqual(60_000);

      // Advance another 60s → tick advances again.
      vi.advanceTimersByTime(60_000);
      flushSync();
      const afterTwo = tick();
      expect(afterTwo).toBeGreaterThan(afterOne);
    });
    root();
  });

  it("clears the interval on scope teardown (no memory leak)", () => {
    const clearSpy = vi.spyOn(globalThis, "clearInterval");
    const root = $effect.root(() => {
      useMinuteTick();
      flushSync();
    });
    // Tear down the $effect.root — should trigger onMount's cleanup.
    root();
    expect(clearSpy).toHaveBeenCalled();
  });
});
