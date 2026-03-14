import {renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {useReducedMotion} from "./useReducedMotion";

describe("useReducedMotion", () => {
  it("is exported as a function", () => {
    expect(typeof useReducedMotion).toBe("function");
  });

  it("can be called and returns a boolean or null", () => {
    const {result} = renderHook(() => useReducedMotion());

    // Should return boolean or null (null until Motion has resolved the preference)
    expect(typeof result.current === "boolean" || result.current === null).toBe(true);
  });

  it("returns consistently when called multiple times", () => {
    const {result, rerender} = renderHook(() => useReducedMotion());

    const firstValue = result.current;
    rerender();
    const secondValue = result.current;

    // Values should be consistent
    expect(secondValue).toBe(firstValue);
  });

  it("returns a value that can be used in conditional rendering", () => {
    const {result} = renderHook(() => useReducedMotion());

    // Should be usable in boolean context
    if (result.current === null) {
      expect(result.current).toBeNull();
    } else {
      expect(typeof result.current).toBe("boolean");
    }
  });

  it("hook instance remains stable across rerenders", () => {
    const {result, rerender} = renderHook(() => useReducedMotion());

    const firstResult = result.current;
    rerender();
    rerender();
    const secondResult = result.current;

    // Motion should return consistent values
    expect(secondResult).toBe(firstResult);
  });
});
