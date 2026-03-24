import {act, renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {useControllableState} from "./useControllableState";

describe("useControllableState", () => {
  it("returns the default value when uncontrolled", () => {
    const {result} = renderHook(() =>
      useControllableState({
        defaultValue: "initial",
      }),
    );

    expect(result.current[0]).toBe("initial");
  });

  it("uses controlled value when provided", () => {
    const {result} = renderHook(() =>
      useControllableState({
        controlled: "controlled-value",
        defaultValue: "default-value",
      }),
    );

    expect(result.current[0]).toBe("controlled-value");
  });

  it("updates internal state when uncontrolled", () => {
    const {result} = renderHook(() =>
      useControllableState({
        defaultValue: "initial",
      }),
    );

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");
  });

  it("calls onChange when value changes in controlled mode", () => {
    const onChange = vi.fn();
    const {result} = renderHook(() =>
      useControllableState({
        controlled: "controlled",
        defaultValue: "default",
        onChange,
      }),
    );

    act(() => {
      result.current[1]("new-value");
    });

    expect(onChange).toHaveBeenCalledWith("new-value");
  });

  it("calls onChange when value changes in uncontrolled mode", () => {
    const onChange = vi.fn();
    const {result} = renderHook(() =>
      useControllableState({
        defaultValue: "default",
        onChange,
      }),
    );

    act(() => {
      result.current[1]("new-value");
    });

    expect(onChange).toHaveBeenCalledWith("new-value");
    expect(result.current[0]).toBe("new-value");
  });

  it("supports functional updates in uncontrolled mode", () => {
    const {result} = renderHook(() =>
      useControllableState({
        defaultValue: 5,
      }),
    );

    act(() => {
      result.current[1]((prev) => prev + 10);
    });

    expect(result.current[0]).toBe(15);
  });

  it("supports functional updates in controlled mode", () => {
    const onChange = vi.fn();
    const {result} = renderHook(() =>
      useControllableState({
        controlled: 10,
        defaultValue: 0,
        onChange,
      }),
    );

    act(() => {
      result.current[1]((prev) => prev * 2);
    });

    expect(onChange).toHaveBeenCalledWith(20);
  });

  it("does not update internal state when controlled", () => {
    const {result, rerender} = renderHook(
      ({controlled}) =>
        useControllableState({
          controlled,
          defaultValue: "default",
        }),
      {initialProps: {controlled: "controlled-1"}},
    );

    expect(result.current[0]).toBe("controlled-1");

    rerender({controlled: "controlled-2"});

    expect(result.current[0]).toBe("controlled-2");
  });
});
