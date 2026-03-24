import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useDebounce} from "./useDebounce";

describe("useDebounce", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns initial value immediately", () => {
    const {result} = renderHook(() => useDebounce("initial", 500));

    expect(result.current).toBe("initial");
  });

  it("updates value after delay", () => {
    const {result, rerender} = renderHook(({value}) => useDebounce(value, 500), {
      initialProps: {value: "initial"},
    });

    expect(result.current).toBe("initial");

    rerender({value: "updated"});

    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(500);
    });

    expect(result.current).toBe("updated");
  });

  it("does not update value before delay", () => {
    const {result, rerender} = renderHook(({value}) => useDebounce(value, 1000), {
      initialProps: {value: "initial"},
    });

    rerender({value: "updated"});

    vi.advanceTimersByTime(500);

    expect(result.current).toBe("initial");
  });

  it("resets debounce timer on rapid value changes", () => {
    const {result, rerender} = renderHook(({value}) => useDebounce(value, 500), {
      initialProps: {value: "initial"},
    });

    rerender({value: "update1"});
    act(() => {
      vi.advanceTimersByTime(300);
    });

    rerender({value: "update2"});
    act(() => {
      vi.advanceTimersByTime(300);
    });

    rerender({value: "update3"});
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Value should still be "initial" because timer keeps resetting
    expect(result.current).toBe("initial");

    act(() => {
      vi.advanceTimersByTime(200);
    });

    // Now the timer completes and we get the last value
    expect(result.current).toBe("update3");
  });

  it("works with different value types", () => {
    const {result: numberResult, rerender: numberRerender} = renderHook(({value}) => useDebounce(value, 500), {
      initialProps: {value: 0},
    });

    numberRerender({value: 42});
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(numberResult.current).toBe(42);

    const {result: boolResult, rerender: boolRerender} = renderHook(({value}) => useDebounce(value, 500), {
      initialProps: {value: false},
    });

    boolRerender({value: true});
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(boolResult.current).toBe(true);

    const {result: objResult, rerender: objRerender} = renderHook(({value}) => useDebounce(value, 500), {
      initialProps: {value: {id: 1}},
    });

    objRerender({value: {id: 2}});
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(objResult.current).toEqual({id: 2});
  });

  it("clears timeout on unmount", () => {
    const {result, rerender, unmount} = renderHook(({value}) => useDebounce(value, 500), {
      initialProps: {value: "initial"},
    });

    rerender({value: "updated"});
    unmount();

    vi.advanceTimersByTime(500);

    // Value should not update after unmount
    expect(result.current).toBe("initial");
  });

  it("updates when delay changes", () => {
    const {result, rerender} = renderHook(({value, delay}) => useDebounce(value, delay), {
      initialProps: {value: "initial", delay: 1000},
    });

    rerender({value: "updated", delay: 1000});
    act(() => {
      vi.advanceTimersByTime(500);
    });

    rerender({value: "updated", delay: 100});
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current).toBe("updated");
  });

  it("handles zero delay", () => {
    const {result, rerender} = renderHook(({value}) => useDebounce(value, 0), {
      initialProps: {value: "initial"},
    });

    rerender({value: "updated"});
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toBe("updated");
  });

  it("handles multiple rapid updates correctly", () => {
    const {result, rerender} = renderHook(({value}) => useDebounce(value, 500), {
      initialProps: {value: 0},
    });

    act(() => {
      for (let i = 1; i <= 10; i++) {
        rerender({value: i});
        vi.advanceTimersByTime(100);
      }
    });

    // Should still be initial value
    expect(result.current).toBe(0);

    // Wait for debounce to complete
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Should have the last value
    expect(result.current).toBe(10);
  });

  it("works with null and undefined values", () => {
    const {result, rerender} = renderHook(({value}) => useDebounce(value, 500), {
      initialProps: {value: "initial" as string | null | undefined},
    });

    rerender({value: null});
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(null);

    rerender({value: undefined});
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe(undefined);

    rerender({value: "restored"});
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current).toBe("restored");
  });
});
