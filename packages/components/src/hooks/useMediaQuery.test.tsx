import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import {useMediaQuery} from "./useMediaQuery";

describe("useMediaQuery", () => {
  let listeners: Array<(event: {matches: boolean}) => void>;
  let currentMatches: boolean;

  beforeEach(() => {
    listeners = [];
    currentMatches = false;

    Object.defineProperty(globalThis.window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: currentMatches,
        media: query,
        addEventListener: vi.fn((_event: string, handler: (event: {matches: boolean}) => void) => {
          listeners.push(handler);
        }),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it("returns false initially for non-matching query", () => {
    currentMatches = false;

    const {result} = renderHook(() => useMediaQuery("(min-width: 1024px)"));

    expect(result.current).toBe(false);
  });

  it("returns true when media query matches", () => {
    currentMatches = true;

    const {result} = renderHook(() => useMediaQuery("(min-width: 1024px)"));

    expect(result.current).toBe(true);
  });

  it("updates when media query match changes", () => {
    currentMatches = false;

    const {result} = renderHook(() => useMediaQuery("(min-width: 1024px)"));

    expect(result.current).toBe(false);

    act(() => {
      for (const listener of listeners) {
        listener({matches: true});
      }
    });

    expect(result.current).toBe(true);
  });
});
