import {renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {useId} from "./useId";

describe("useId", () => {
  it("generates a unique ID", () => {
    const {result} = renderHook(() => useId());

    expect(result.current).toBeTruthy();
    expect(typeof result.current).toBe("string");
  });

  it("generates different IDs for different hook instances", () => {
    const {result: result1} = renderHook(() => useId());
    const {result: result2} = renderHook(() => useId());

    expect(result1.current).not.toBe(result2.current);
  });

  it("generates stable ID across re-renders", () => {
    const {result, rerender} = renderHook(() => useId());

    const initialId = result.current;
    rerender();

    expect(result.current).toBe(initialId);
  });

  it("prepends prefix when provided", () => {
    const {result} = renderHook(() => useId("test-prefix"));

    expect(result.current).toMatch(/^test-prefix-/);
  });

  it("works without prefix", () => {
    const {result} = renderHook(() => useId());

    expect(result.current).toBeTruthy();
    expect(result.current).not.toContain("undefined");
  });

  it("generates unique IDs with the same prefix", () => {
    const {result: result1} = renderHook(() => useId("prefix"));
    const {result: result2} = renderHook(() => useId("prefix"));

    expect(result1.current).toMatch(/^prefix-/);
    expect(result2.current).toMatch(/^prefix-/);
    expect(result1.current).not.toBe(result2.current);
  });

  it("prefix remains stable across re-renders", () => {
    const {result, rerender} = renderHook(() => useId("stable"));

    const initialId = result.current;
    expect(initialId).toMatch(/^stable-/);

    rerender();

    expect(result.current).toBe(initialId);
  });

  it("handles empty string prefix", () => {
    const {result} = renderHook(() => useId(""));

    // With empty prefix, React's useId generates something like ":r1:"
    // Our hook returns "-:r1:"
    expect(result.current).toBeTruthy();
    expect(result.current.length).toBeGreaterThan(1);
  });

  it("handles special characters in prefix", () => {
    const {result} = renderHook(() => useId("my_field-123"));

    expect(result.current).toMatch(/^my_field-123-/);
  });

  it("generates IDs suitable for HTML id attributes", () => {
    const {result} = renderHook(() => useId("form-field"));

    // Should not contain spaces or invalid characters
    expect(result.current).not.toMatch(/\s/);
    expect(result.current).toBeTruthy();
  });
});
