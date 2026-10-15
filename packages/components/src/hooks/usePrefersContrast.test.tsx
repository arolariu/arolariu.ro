import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {usePrefersContrast} from "./usePrefersContrast";

type MediaQueryChangeEvent = Pick<MediaQueryListEvent, "matches">;
type MediaQueryListener = (event: MediaQueryChangeEvent) => void;

describe("usePrefersContrast", () => {
  let listeners: MediaQueryListener[];
  let addEventListener: ReturnType<typeof vi.fn<(event: string, handler: EventListenerOrEventListenerObject) => void>>;
  let removeEventListener: ReturnType<typeof vi.fn<(event: string, handler: EventListenerOrEventListenerObject) => void>>;
  let matches: boolean;

  beforeEach(() => {
    listeners = [];
    matches = false;
    addEventListener = vi.fn((_event: string, handler: EventListenerOrEventListenerObject) => {
      listeners.push((event) => {
        const change = new MediaQueryListEvent("change", {matches: event.matches, media: "(prefers-contrast: more)"});
        if (typeof handler === "function") handler(change);
        else handler.handleEvent(change);
      });
    });
    removeEventListener = vi.fn<(event: string, handler: EventListenerOrEventListenerObject) => void>();

    Object.defineProperty(globalThis.window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string): MediaQueryList => ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => true),
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
    matches = true;

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
