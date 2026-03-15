import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {usePrefersContrast} from "./usePrefersContrast";

type MediaQueryChangeEvent = Pick<MediaQueryListEvent, "matches">;
type MediaQueryListener = (event: MediaQueryChangeEvent) => void;

describe("usePrefersContrast", () => {
  let listeners: MediaQueryListener[];
  let addEventListener: ReturnType<typeof vi.fn>;
  let removeEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    listeners = [];
    addEventListener = vi.fn((_event: string, handler: MediaQueryListener) => {
      listeners.push(handler);
    });
    removeEventListener = vi.fn();

    Object.defineProperty(globalThis.window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener,
        removeEventListener,
      })),
    });
  });

  it("returns false when prefers-contrast is not 'more'", () => {
    const {result} = renderHook(() => usePrefersContrast());

    expect(result.current).toBe(false);
  });

  it("returns true when user prefers high contrast", () => {
    vi.spyOn(globalThis.window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(prefers-contrast: more)",
      addEventListener,
      removeEventListener,
    } as MediaQueryList);

    const {result} = renderHook(() => usePrefersContrast());

    expect(result.current).toBe(true);
  });

  it("updates when the user preference changes", () => {
    const {result} = renderHook(() => usePrefersContrast());

    act(() => {
      listeners.forEach((listener) => {
        listener({matches: true});
      });
    });

    expect(result.current).toBe(true);
  });

  it("removes the listener on unmount", () => {
    const {unmount} = renderHook(() => usePrefersContrast());
    const listener = addEventListener.mock.calls[0]?.[1];

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("change", listener);
  });
});
