import {act, renderHook} from "@testing-library/react";
import {renderToString} from "react-dom/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useMediaQuery} from "./useMediaQuery";

type MediaQueryChangeEvent = Pick<MediaQueryListEvent, "matches">;
type MediaQueryListener = (event: MediaQueryChangeEvent) => void;
type MockedMediaQueryList = MediaQueryList & {
  listeners: MediaQueryListener[];
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
};

describe("useMediaQuery", () => {
  let mediaQueryLists: Map<string, MockedMediaQueryList>;
  let currentMatches: boolean;

  beforeEach(() => {
    mediaQueryLists = new Map<string, MockedMediaQueryList>();
    currentMatches = false;

    Object.defineProperty(globalThis.window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => {
        const existingMediaQueryList = mediaQueryLists.get(query);

        if (existingMediaQueryList) {
          return existingMediaQueryList;
        }

        const listeners: MediaQueryListener[] = [];
        const mediaQueryList = {
          matches: currentMatches,
          media: query,
          addEventListener: vi.fn((_event: string, handler: MediaQueryListener) => {
            listeners.push(handler);
          }),
          removeEventListener: vi.fn((_event: string, handler: MediaQueryListener) => {
            const listenerIndex = listeners.indexOf(handler);

            if (listenerIndex >= 0) {
              listeners.splice(listenerIndex, 1);
            }
          }),
          listeners,
        } as MockedMediaQueryList;

        mediaQueryLists.set(query, mediaQueryList);

        return mediaQueryList;
      }),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    vi.clearAllMocks();
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
    const mediaQueryList = mediaQueryLists.get("(min-width: 1024px)");

    expect(result.current).toBe(false);

    act(() => {
      mediaQueryList?.listeners.forEach((listener) => {
        listener({matches: true});
      });
    });

    expect(result.current).toBe(true);
  });

  it("removes event listener on unmount", () => {
    const removeEventListener = vi.fn();
    const addEventListener = vi.fn();

    vi.spyOn(globalThis.window, "matchMedia").mockReturnValue({
      matches: false,
      media: "(min-width: 768px)",
      addEventListener,
      removeEventListener,
    } as MediaQueryList);

    const {unmount} = renderHook(() => useMediaQuery("(min-width: 768px)"));

    unmount();

    expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("returns false during server rendering when window is unavailable", () => {
    function TestComponent(): React.JSX.Element {
      return <span>{String(useMediaQuery("(min-width: 768px)"))}</span>;
    }

    vi.stubGlobal("window", undefined);

    const markup = renderToString(<TestComponent />);

    expect(markup).toContain("false");
  });

  it("removes the old listener and subscribes again when the query changes", () => {
    const initialQuery = "(min-width: 768px)";
    const nextQuery = "(min-width: 1024px)";
    const {rerender} = renderHook(({query}) => useMediaQuery(query), {
      initialProps: {query: initialQuery},
    });

    const initialMediaQueryList = mediaQueryLists.get(initialQuery);
    const initialListener = initialMediaQueryList?.addEventListener.mock.calls[0]?.[1];

    rerender({query: nextQuery});

    const nextMediaQueryList = mediaQueryLists.get(nextQuery);

    expect(initialMediaQueryList?.removeEventListener).toHaveBeenCalledWith("change", initialListener);
    expect(nextMediaQueryList?.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
