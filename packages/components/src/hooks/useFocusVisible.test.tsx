import {act, fireEvent, render, renderHook} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {useFocusVisible} from "./useFocusVisible";

describe("useFocusVisible", () => {
  it("returns isFocusVisible as false initially", () => {
    const {result} = renderHook(() => useFocusVisible());

    expect(result.current.isFocusVisible).toBe(false);
  });

  it("returns focusProps with onFocus and onBlur", () => {
    const {result} = renderHook(() => useFocusVisible());

    expect(typeof result.current.focusProps.onFocus).toBe("function");
    expect(typeof result.current.focusProps.onBlur).toBe("function");
  });

  it("returns true after keyboard navigation", () => {
    const {result} = renderHook(() => useFocusVisible());

    // Simulate keyboard interaction
    act(() => {
      const keydownEvent = new KeyboardEvent("keydown", {key: "Tab"});
      document.dispatchEvent(keydownEvent);
    });

    // Simulate focus event
    act(() => {
      const focusEvent = {currentTarget: document.createElement("button")} as React.FocusEvent;
      result.current.focusProps.onFocus(focusEvent);
    });

    expect(result.current.isFocusVisible).toBe(true);
  });

  it("returns false after pointer interaction", () => {
    const {result} = renderHook(() => useFocusVisible());

    // Simulate pointer interaction
    act(() => {
      const pointerdownEvent = new PointerEvent("pointerdown");
      document.dispatchEvent(pointerdownEvent);
    });

    // Simulate focus event
    act(() => {
      const focusEvent = {currentTarget: document.createElement("button")} as React.FocusEvent;
      result.current.focusProps.onFocus(focusEvent);
    });

    expect(result.current.isFocusVisible).toBe(false);
  });

  it("onBlur resets isFocusVisible to false", () => {
    const {result} = renderHook(() => useFocusVisible());

    // First set to true via keyboard navigation
    act(() => {
      const keydownEvent = new KeyboardEvent("keydown", {key: "Tab"});
      document.dispatchEvent(keydownEvent);
    });

    act(() => {
      const focusEvent = {currentTarget: document.createElement("button")} as React.FocusEvent;
      result.current.focusProps.onFocus(focusEvent);
    });

    expect(result.current.isFocusVisible).toBe(true);

    // Then blur
    act(() => {
      result.current.focusProps.onBlur();
    });

    expect(result.current.isFocusVisible).toBe(false);
  });

  it("works in a real component scenario", () => {
    function TestComponent(): React.JSX.Element {
      const {isFocusVisible, focusProps} = useFocusVisible();

      return (
        <button
          data-testid='test-button'
          data-focus-visible={isFocusVisible}
          {...focusProps}>
          Test
        </button>
      );
    }

    const {getByTestId} = render(<TestComponent />);
    const button = getByTestId("test-button");

    // Initial state
    expect(button.dataset.focusVisible).toBe("false");

    // Keyboard then focus
    act(() => {
      const keydownEvent = new KeyboardEvent("keydown", {key: "Tab"});
      document.dispatchEvent(keydownEvent);
    });

    fireEvent.focus(button);
    expect(button.dataset.focusVisible).toBe("true");

    // Blur
    fireEvent.blur(button);
    expect(button.dataset.focusVisible).toBe("false");

    // Pointer then focus
    act(() => {
      const pointerdownEvent = new PointerEvent("pointerdown");
      document.dispatchEvent(pointerdownEvent);
    });

    fireEvent.focus(button);
    expect(button.dataset.focusVisible).toBe("false");
  });
});
