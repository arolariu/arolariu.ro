import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {useIsMobile} from "./useIsMobile";

describe("useIsMobile", () => {
  beforeEach(() => {
    vi.stubGlobal("innerWidth", 1024);
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(), // Deprecated
        removeListener: vi.fn(), // Deprecated
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
  });

  it("should return false initially on desktop", () => {
    vi.stubGlobal("innerWidth", 1024);
    const {result} = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("should return true initially on mobile", () => {
    vi.stubGlobal("innerWidth", 500);
    const {result} = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("should update when window is resized", () => {
    let changeHandler: () => void = () => {};
    const addEventListener = vi.fn((event: string, handler: () => void) => {
      if (event === "change") changeHandler = handler;
    });

    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );

    const {result} = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    // Simulate resize
    vi.stubGlobal("innerWidth", 500);
    act(() => {
      changeHandler();
    });

    expect(result.current).toBe(true);

    // Simulate resize back to desktop
    vi.stubGlobal("innerWidth", 1024);
    act(() => {
      changeHandler();
    });

    expect(result.current).toBe(false);
  });

  it("should cleanup event listener on unmount", () => {
    const removeEventListener = vi.fn();
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener,
        dispatchEvent: vi.fn(),
      })),
    );

    const {unmount} = renderHook(() => useIsMobile());
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
