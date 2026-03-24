import {renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {useInterval} from "./useInterval";

describe("useInterval", () => {
  it("is a function", () => {
    expect(typeof useInterval).toBe("function");
  });

  it("accepts callback and delay", () => {
    const callback = vi.fn();
    const {unmount} = renderHook(() => useInterval(callback, 100));
    unmount();
  });

  it("accepts null delay without error", () => {
    const callback = vi.fn();
    const {unmount} = renderHook(() => useInterval(callback, null));
    unmount();
    expect(callback).not.toHaveBeenCalled();
  });

  it("clears interval on unmount", async () => {
    const callback = vi.fn();
    const {unmount} = renderHook(() => useInterval(callback, 50));

    await new Promise((r) => setTimeout(r, 120));
    const callCount = callback.mock.calls.length;
    expect(callCount).toBeGreaterThan(0);

    unmount();

    await new Promise((r) => setTimeout(r, 120));
    expect(callback.mock.calls.length).toBe(callCount);
  });
});
