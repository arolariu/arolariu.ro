import {renderHook} from "@testing-library/react";
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
});
