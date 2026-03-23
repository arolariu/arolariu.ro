import {act, renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import {useFocusManager} from "./useFocusManager";

afterEach(() => {
  document.body.innerHTML = "";
});

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
  });

  it("wraps to the first element when focusNext is called on the last element", () => {
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
      result.current.focusLast();
      result.current.focusNext();
    });

    expect(document.activeElement).toBe(first);
  });

  it("wraps to the last element when focusPrevious is called on the first element", () => {
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
      result.current.focusPrevious();
    });

    expect(document.activeElement).toBe(third);
  });

  it("skips disabled elements and elements with tabindex -1", () => {
    const container = document.createElement("div");
    const disabledButton = document.createElement("button");
    const firstFocusable = document.createElement("button");
    const skippedButton = document.createElement("button");
    const lastFocusable = document.createElement("button");

    disabledButton.type = "button";
    disabledButton.disabled = true;
    firstFocusable.type = "button";
    skippedButton.type = "button";
    skippedButton.setAttribute("tabindex", "-1");
    lastFocusable.type = "button";

    container.append(disabledButton, firstFocusable, skippedButton, lastFocusable);
    document.body.append(container);

    const ref = {current: container};
    const {result} = renderHook(() => useFocusManager(ref));

    act(() => {
      result.current.focusFirst();
    });

    expect(document.activeElement).toBe(firstFocusable);

    act(() => {
      result.current.focusNext();
    });

    expect(document.activeElement).toBe(lastFocusable);

    act(() => {
      result.current.focusPrevious();
    });

    expect(document.activeElement).toBe(firstFocusable);
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
