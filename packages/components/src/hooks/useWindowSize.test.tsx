import {act, renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";
import {useWindowSize} from "./useWindowSize";

describe("useWindowSize", () => {
  it("should return initial window size on mount", () => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);

    const {result} = renderHook(() => useWindowSize());

    expect(result.current.windowSize).toEqual({width: 1024, height: 768});
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(true);
  });

  it("should return mobile state when width is below breakpoint", () => {
    vi.stubGlobal("innerWidth", 500);
    vi.stubGlobal("innerHeight", 800);

    const {result} = renderHook(() => useWindowSize());

    expect(result.current.windowSize).toEqual({width: 500, height: 800});
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it("should update window size on resize", () => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal("innerHeight", 768);

    const {result} = renderHook(() => useWindowSize());

    expect(result.current.windowSize.width).toBe(1024);

    // Simulate resize
    vi.stubGlobal("innerWidth", 500);
    vi.stubGlobal("innerHeight", 800);

    act(() => {
      globalThis.dispatchEvent(new Event("resize"));
    });

    expect(result.current.windowSize).toEqual({width: 500, height: 800});
    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it("should cleanup event listener on unmount", () => {
    const removeEventListenerSpy = vi.spyOn(globalThis, "removeEventListener");
    const {unmount} = renderHook(() => useWindowSize());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
