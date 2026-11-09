import {act, render, renderHook, screen} from "@testing-library/react";
import * as React from "react";
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

  it("notifies each committed uncontrolled change once under StrictMode", () => {
    const onChange = vi.fn();
    const {result} = renderHook(() => useControllableState({defaultValue: 0, onChange}), {
      wrapper: ({children}) => <React.StrictMode>{children}</React.StrictMode>,
    });

    act(() => result.current[1]((value) => value + 1));
    expect(onChange).toHaveBeenCalledExactlyOnceWith(1);
    act(() => {
      result.current[1]((value) => value + 1);
      result.current[1]((value) => value + 1);
    });
    expect(result.current[0]).toBe(3);
    expect(onChange.mock.calls).toEqual([[1], [3]]);
  });

  it("does not notify an uncontrolled update until its suspended render commits", async () => {
    const onChange = vi.fn();
    const pending = Promise.withResolvers<void>();
    const actions: {set?: (value: number) => void} = {};
    let ready = false;
    function SuspendedValue(): React.JSX.Element {
      const [value, setValue] = useControllableState({defaultValue: 0, onChange});
      actions.set = setValue;
      if (value === 1 && !ready) throw pending.promise;
      return <output>{value}</output>;
    }
    render(
      <React.Suspense fallback={<span>Waiting</span>}>
        <SuspendedValue />
      </React.Suspense>,
    );
    const set = actions.set;
    if (!set) throw new Error("The fixture did not mount");

    act(() => React.startTransition(() => set(1)));
    expect(screen.getByRole("status")).toHaveTextContent("0");
    expect(onChange).not.toHaveBeenCalled();
    await act(async () => {
      ready = true;
      pending.resolve();
    });
    expect(screen.getByRole("status")).toHaveTextContent("1");
    expect(onChange).toHaveBeenCalledExactlyOnceWith(1);
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
