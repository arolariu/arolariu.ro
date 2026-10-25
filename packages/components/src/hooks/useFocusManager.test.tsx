import {act, renderHook} from "@testing-library/react";
import {afterEach, describe, expect, it} from "vitest";

import {useFocusManager} from "./useFocusManager";

afterEach(() => {
  document.body.innerHTML = "";
});

/** Appends a container built from labels: `X` is a focusable `aria-disabled` button, `N` a `tabindex="-1"` div, others buttons. */
function createContainer(labels: readonly string[]): HTMLDivElement {
  const container = document.createElement("div");
  for (const label of labels) {
    const element = document.createElement(label === "N" ? "div" : "button");
    element.textContent = label;
    if (label === "X") element.setAttribute("aria-disabled", "true");
    if (label === "N") element.tabIndex = -1;
    container.append(element);
  }
  document.body.append(container);
  return container;
}

describe("useFocusManager", () => {
  it.each(["hidden", "inert", "display", "visibility", "fieldset", "details", "aria-disabled", "hidden-input"])(
    "skips unavailable %s candidates without changing DOM order",
    (kind) => {
      const container = document.createElement("div");
      const unavailable = document.createElement(kind === "hidden-input" ? "input" : "button");
      const wrapper = document.createElement(kind === "fieldset" ? "fieldset" : kind === "details" ? "details" : "div");
      if (kind === "hidden" || kind === "inert") wrapper.setAttribute(kind, "");
      if (kind === "display") wrapper.style.display = "none";
      if (kind === "visibility") wrapper.style.visibility = "hidden";
      if (kind === "fieldset") wrapper.setAttribute("disabled", "");
      if (kind === "aria-disabled") unavailable.setAttribute("aria-disabled", "true");
      if (kind === "hidden-input") unavailable.setAttribute("type", "hidden");
      const first = document.createElement("button");
      const last = document.createElement("button");
      first.tabIndex = 3;
      wrapper.append(unavailable);
      container.append(wrapper, first, last);
      document.body.append(container);
      const {result} = renderHook(() => useFocusManager({current: container}));

      act(() => result.current.focusFirst());
      expect(document.activeElement).toBe(first);
      act(() => result.current.focusNext());
      expect(document.activeElement).toBe(last);
      act(() => result.current.focusNext());
      expect(document.activeElement).toBe(first);
      act(() => result.current.focusPrevious());
      expect(document.activeElement).toBe(last);
    },
  );

  it.each([
    ["X", "a b X c d", "focusNext", "c"],
    ["X", "a b X c d", "focusPrevious", "b"],
    ["X", "X a b", "focusNext", "a"],
    ["X", "X a b", "focusPrevious", "b"],
    ["X", "a b X", "focusNext", "a"],
    ["X", "a b X", "focusPrevious", "b"],
    ["N", "a N b", "focusNext", "b"],
    ["N", "a N b", "focusPrevious", "a"],
  ] as const)(
    "moves from focused non-candidate %s in [%s] with %s to %s by DOM order, wrapping at the ends",
    (from, layout, move, expected) => {
      const container = createContainer(layout.split(" "));
      const start = [...container.children].find((element) => element.textContent === from) as HTMLElement;
      const {result} = renderHook(() => useFocusManager({current: container}));

      act(() => start.focus());
      act(() => result.current[move]());

      expect(document.activeElement?.textContent).toBe(expected);
    },
  );

  it("moves from a focused non-candidate wrapper into its first candidate or to the candidate before it", () => {
    const container = createContainer(["a"]);
    const wrapper = document.createElement("div");
    wrapper.tabIndex = -1;
    wrapper.append(...["b", "c"].map((label) => Object.assign(document.createElement("button"), {textContent: label})));
    container.append(wrapper, Object.assign(document.createElement("button"), {textContent: "d"}));
    const {result} = renderHook(() => useFocusManager({current: container}));

    act(() => wrapper.focus());
    act(() => result.current.focusNext());
    expect(document.activeElement?.textContent).toBe("b");

    act(() => wrapper.focus());
    act(() => result.current.focusPrevious());
    expect(document.activeElement?.textContent).toBe("a");
  });

  it("moves from a non-candidate nested in a candidate back to that candidate or on to the next one", () => {
    const container = createContainer(["a"]);
    const parent = document.createElement("div");
    parent.tabIndex = 0;
    const nested = Object.assign(document.createElement("button"), {textContent: "X"});
    nested.setAttribute("aria-disabled", "true");
    parent.append(nested);
    container.append(parent, Object.assign(document.createElement("button"), {textContent: "d"}));
    const {result} = renderHook(() => useFocusManager({current: container}));

    act(() => nested.focus());
    act(() => result.current.focusPrevious());
    expect(document.activeElement).toBe(parent);

    act(() => nested.focus());
    act(() => result.current.focusNext());
    expect(document.activeElement?.textContent).toBe("d");
  });

  it("moves to the first or last candidate when focus is outside the container or on nothing", () => {
    const before = document.createElement("button");
    const after = document.createElement("button");
    document.body.append(before);
    const container = createContainer(["a", "b", "c"]);
    document.body.append(after);
    const {result} = renderHook(() => useFocusManager({current: container}));
    const starts: readonly (() => void)[] = [
      () => before.focus(),
      () => after.focus(),
      () => (document.activeElement as HTMLElement).blur(),
    ];

    for (const focusStart of starts) {
      act(focusStart);
      act(() => result.current.focusNext());
      expect(document.activeElement?.textContent).toBe("a");

      act(focusStart);
      act(() => result.current.focusPrevious());
      expect(document.activeElement?.textContent).toBe("c");
    }
  });

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
