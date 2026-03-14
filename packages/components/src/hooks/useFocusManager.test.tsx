import {act, renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {useFocusManager} from "./useFocusManager";

describe("useFocusManager", () => {
  it("returns focus management functions", () => {
    const ref = {current: document.createElement("div")};
    const {result} = renderHook(() => useFocusManager(ref));

    expect(typeof result.current.focusFirst).toBe("function");
    expect(typeof result.current.focusLast).toBe("function");
    expect(typeof result.current.focusNext).toBe("function");
    expect(typeof result.current.focusPrevious).toBe("function");
  });

  it("moves focus between focusable elements in the container", () => {
    const container = document.createElement("div");
    const first = document.createElement("button");
    const second = document.createElement("button");
    const third = document.createElement("button");

    first.type = "button";
    second.type = "button";
    third.type = "button";

    container.append(first, second, third);
    document.body.append(container);

    const ref = {current: container};
    const {result} = renderHook(() => useFocusManager(ref));

    act(() => {
      result.current.focusFirst();
    });
    expect(document.activeElement).toBe(first);

    act(() => {
      result.current.focusNext();
    });
    expect(document.activeElement).toBe(second);

    act(() => {
      result.current.focusLast();
    });
    expect(document.activeElement).toBe(third);

    act(() => {
      result.current.focusPrevious();
    });
    expect(document.activeElement).toBe(second);

    container.remove();
  });

  it("no-ops when the container ref is null", () => {
    const ref = {current: null as HTMLDivElement | null};
    const {result} = renderHook(() => useFocusManager(ref));

    expect(() => {
      act(() => {
        result.current.focusFirst();
        result.current.focusLast();
        result.current.focusNext();
        result.current.focusPrevious();
      });
    }).not.toThrow();
  });
});
