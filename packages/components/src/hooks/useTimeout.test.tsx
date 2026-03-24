import {renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useTimeout} from "./useTimeout";

describe("useTimeout", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("calls the callback after the specified delay", () => {
    const callback = vi.fn();
    renderHook(() => useTimeout(callback, 1000));

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not call the callback before the delay", () => {
    const callback = vi.fn();
    renderHook(() => useTimeout(callback, 1000));

    vi.advanceTimersByTime(500);

    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not call the callback when delay is null", () => {
    const callback = vi.fn();
    renderHook(() => useTimeout(callback, null));

    vi.advanceTimersByTime(10000);

    expect(callback).not.toHaveBeenCalled();
  });

  it("clears timeout on unmount", () => {
    const callback = vi.fn();
    const {unmount} = renderHook(() => useTimeout(callback, 1000));

    unmount();

    vi.advanceTimersByTime(1000);

    expect(callback).not.toHaveBeenCalled();
  });

  it("resets timeout when delay changes", () => {
    const callback = vi.fn();
    const {rerender} = renderHook(({delay}) => useTimeout(callback, delay), {
      initialProps: {delay: 1000},
    });

    vi.advanceTimersByTime(500);

    rerender({delay: 2000});

    vi.advanceTimersByTime(1500);
    expect(callback).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls the latest callback version", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    const {rerender} = renderHook(({cb}) => useTimeout(cb, 1000), {
      initialProps: {cb: callback1},
    });

    rerender({cb: callback2});

    vi.advanceTimersByTime(1000);

    expect(callback1).not.toHaveBeenCalled();
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it("can be disabled and re-enabled by setting delay to null", () => {
    const callback = vi.fn();
    const {rerender} = renderHook(({delay}) => useTimeout(callback, delay), {
      initialProps: {delay: 1000 as number | null},
    });

    rerender({delay: null});

    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();

    rerender({delay: 500});

    vi.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("handles zero delay", () => {
    const callback = vi.fn();
    renderHook(() => useTimeout(callback, 0));

    vi.advanceTimersByTime(0);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("only calls callback once per timeout", () => {
    const callback = vi.fn();
    renderHook(() => useTimeout(callback, 1000));

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("works with multiple instances", () => {
    const callback1 = vi.fn();
    const callback2 = vi.fn();

    renderHook(() => useTimeout(callback1, 500));
    renderHook(() => useTimeout(callback2, 1000));

    vi.advanceTimersByTime(500);
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(callback2).toHaveBeenCalledTimes(1);
  });
});
