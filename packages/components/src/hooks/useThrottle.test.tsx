import {renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useThrottle} from "./useThrottle";

describe("useThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls callback immediately on first invocation", () => {
    const callback = vi.fn();
    const {result} = renderHook(() => useThrottle(callback, 1000));

    result.current();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("ignores subsequent calls within the delay period", () => {
    const callback = vi.fn();
    const {result} = renderHook(() => useThrottle(callback, 1000));

    result.current();
    result.current();
    result.current();

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("allows callback after delay period", () => {
    const callback = vi.fn();
    const {result} = renderHook(() => useThrottle(callback, 1000));

    result.current();
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);

    result.current();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("passes arguments to the callback", () => {
    const callback = vi.fn();
    const {result} = renderHook(() => useThrottle(callback, 1000));

    result.current("arg1", 42, true);

    expect(callback).toHaveBeenCalledWith("arg1", 42, true);
  });

  it("schedules trailing call when invoked during throttle period", () => {
    const callback = vi.fn();
    const {result} = renderHook(() => useThrottle(callback, 1000));

    result.current("first");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith("first");

    vi.advanceTimersByTime(500);
    result.current("second");

    // Still only 1 call so far
    expect(callback).toHaveBeenCalledTimes(1);

    // Advance remaining time
    vi.advanceTimersByTime(500);

    // Trailing call should execute
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith("second");
  });

  it("cancels previous trailing call when new call comes in", () => {
    const callback = vi.fn();
    const {result} = renderHook(() => useThrottle(callback, 1000));

    result.current("first");
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(300);
    result.current("second");

    vi.advanceTimersByTime(300);
    result.current("third");

    // Only initial call so far
    expect(callback).toHaveBeenCalledTimes(1);

    // Complete the delay
    vi.advanceTimersByTime(700);

    // Should have trailing call with latest args
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith("third");
  });

  it("cleans up timeout on unmount", () => {
    const callback = vi.fn();
    const {result, unmount} = renderHook(() => useThrottle(callback, 1000));

    result.current();
    vi.advanceTimersByTime(500);
    result.current();

    unmount();

    vi.advanceTimersByTime(500);

    // Should not call the trailing callback after unmount
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("updates when delay changes", () => {
    const callback = vi.fn();
    const {result, rerender} = renderHook(({delay}) => useThrottle(callback, delay), {
      initialProps: {delay: 1000},
    });

    result.current();
    expect(callback).toHaveBeenCalledTimes(1);

    rerender({delay: 500});

    vi.advanceTimersByTime(500);

    result.current();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it("handles zero delay", () => {
    const callback = vi.fn();
    const {result} = renderHook(() => useThrottle(callback, 0));

    result.current();
    result.current();
    result.current();

    vi.advanceTimersByTime(0);

    // With zero delay, all calls should go through
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("works with high-frequency calls", () => {
    const callback = vi.fn();
    const {result} = renderHook(() => useThrottle(callback, 100));

    // Simulate 50 rapid calls
    for (let i = 0; i < 50; i++) {
      result.current(i);
      vi.advanceTimersByTime(10);
    }

    // Should have throttled most calls
    expect(callback.mock.calls.length).toBeLessThan(50);
    expect(callback.mock.calls.length).toBeGreaterThan(0);
  });

  it("calls the latest callback version", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const {result, rerender} = renderHook(({cb}) => useThrottle(cb, 1000), {
      initialProps: {cb: callback1},
    });

    rerender({cb: callback2});

    result.current();

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it("maintains throttle state across callback changes", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const {result, rerender} = renderHook(({cb}) => useThrottle(cb, 1000), {
      initialProps: {cb: callback1},
    });

    result.current();
    expect(callback1).toHaveBeenCalledTimes(1);

    // Change callback mid-throttle
    rerender({cb: callback2});

    // Try to call again immediately
    result.current();

    // Should still be throttled
    expect(callback2).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    result.current();
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});
