import {renderHook} from "@testing-library/react";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {useEventCallback} from "./useEventCallback";

describe("useEventCallback", () => {
  it("returns a function", () => {
    const {result} = renderHook(() => useEventCallback(() => "test"));

    expect(typeof result.current).toBe("function");
  });

  it("calls the provided callback with correct arguments", () => {
    const callback = vi.fn((a: number, b: string) => a + b.length);
    const {result} = renderHook(() => useEventCallback(callback));

    const returnValue = result.current(5, "hello");

    expect(callback).toHaveBeenCalledWith(5, "hello");
    expect(returnValue).toBe(10);
  });

  it("maintains stable reference across re-renders", () => {
    const {result, rerender} = renderHook(({cb}) => useEventCallback(cb), {
      initialProps: {cb: () => "initial"},
    });

    const firstReference = result.current;

    rerender({cb: () => "updated"});

    expect(result.current).toBe(firstReference);
  });

  it("always calls the latest callback version", () => {
    const {result, rerender} = renderHook(({cb}) => useEventCallback(cb), {
      initialProps: {cb: () => "version-1"},
    });

    expect(result.current()).toBe("version-1");

    rerender({cb: () => "version-2"});

    expect(result.current()).toBe("version-2");
  });

  it("works with callbacks that have no arguments", () => {
    const callback = vi.fn(() => 42);
    const {result} = renderHook(() => useEventCallback(callback));

    const returnValue = result.current();

    expect(callback).toHaveBeenCalledWith();
    expect(returnValue).toBe(42);
  });

  it("works with callbacks that return void", () => {
    const callback = vi.fn((value: string) => {
      console.log(value);
    });
    const {result} = renderHook(() => useEventCallback(callback));

    result.current("test");

    expect(callback).toHaveBeenCalledWith("test");
  });

  it("preserves callback context and closure variables", () => {
    let externalValue = "initial";
    const callback = vi.fn(() => externalValue);
    const {result, rerender} = renderHook(() => useEventCallback(callback));

    expect(result.current()).toBe("initial");

    externalValue = "updated";
    rerender();

    expect(result.current()).toBe("updated");
  });

  it("can be safely used in dependency arrays", () => {
    const callback = vi.fn();
    const effectCallback = vi.fn();

    const {rerender} = renderHook(
      ({cb}) => {
        const stableCallback = useEventCallback(cb);
        React.useEffect(() => {
          effectCallback();
        }, [stableCallback]);
        return stableCallback;
      },
      {initialProps: {cb: callback}},
    );

    // Effect should run once on mount
    expect(effectCallback).toHaveBeenCalledTimes(1);

    // Update the callback
    rerender({cb: vi.fn()});

    // Effect should NOT run again because stableCallback identity didn't change
    expect(effectCallback).toHaveBeenCalledTimes(1);
  });
});
