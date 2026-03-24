import {renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {usePrevious} from "./usePrevious";

describe("usePrevious", () => {
  it("returns undefined on initial render", () => {
    const {result} = renderHook(() => usePrevious("initial"));

    expect(result.current).toBeUndefined();
  });

  it("returns the previous value after re-render", () => {
    const {result, rerender} = renderHook(({value}) => usePrevious(value), {
      initialProps: {value: "first"},
    });

    expect(result.current).toBeUndefined();

    rerender({value: "second"});

    expect(result.current).toBe("first");
  });

  it("tracks multiple value changes", () => {
    const {result, rerender} = renderHook(({value}) => usePrevious(value), {
      initialProps: {value: 1},
    });

    expect(result.current).toBeUndefined();

    rerender({value: 2});
    expect(result.current).toBe(1);

    rerender({value: 3});
    expect(result.current).toBe(2);

    rerender({value: 4});
    expect(result.current).toBe(3);
  });

  it("works with different value types", () => {
    const {result: numberResult, rerender: numberRerender} = renderHook(({value}) => usePrevious(value), {
      initialProps: {value: 42},
    });
    numberRerender({value: 100});
    expect(numberResult.current).toBe(42);

    const {result: stringResult, rerender: stringRerender} = renderHook(({value}) => usePrevious(value), {
      initialProps: {value: "hello"},
    });
    stringRerender({value: "world"});
    expect(stringResult.current).toBe("hello");

    const {result: boolResult, rerender: boolRerender} = renderHook(({value}) => usePrevious(value), {
      initialProps: {value: true},
    });
    boolRerender({value: false});
    expect(boolResult.current).toBe(true);
  });

  it("works with object values", () => {
    const obj1 = {id: 1, name: "first"};
    const obj2 = {id: 2, name: "second"};

    const {result, rerender} = renderHook(({value}) => usePrevious(value), {
      initialProps: {value: obj1},
    });

    expect(result.current).toBeUndefined();

    rerender({value: obj2});

    expect(result.current).toBe(obj1);
    expect(result.current).toEqual({id: 1, name: "first"});
  });

  it("works with array values", () => {
    const arr1 = [1, 2, 3];
    const arr2 = [4, 5, 6];

    const {result, rerender} = renderHook(({value}) => usePrevious(value), {
      initialProps: {value: arr1},
    });

    expect(result.current).toBeUndefined();

    rerender({value: arr2});

    expect(result.current).toBe(arr1);
    expect(result.current).toEqual([1, 2, 3]);
  });

  it("handles null and undefined values", () => {
    const {result, rerender} = renderHook(({value}) => usePrevious(value), {
      initialProps: {value: null as string | null},
    });

    expect(result.current).toBeUndefined();

    rerender({value: "value"});
    expect(result.current).toBe(null);

    rerender({value: null});
    expect(result.current).toBe("value");
  });

  it("does not update previous value if current value does not change", () => {
    const {result, rerender} = renderHook(({value}) => usePrevious(value), {
      initialProps: {value: "same"},
    });

    expect(result.current).toBeUndefined();

    rerender({value: "same"});
    expect(result.current).toBe("same");

    // Re-render again with the same value
    rerender({value: "same"});
    expect(result.current).toBe("same");
  });

  it("can track rapidly changing values", () => {
    const {result, rerender} = renderHook(({value}) => usePrevious(value), {
      initialProps: {value: 0},
    });

    for (let i = 1; i <= 10; i++) {
      rerender({value: i});
      expect(result.current).toBe(i - 1);
    }
  });
});
