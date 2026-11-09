import {act, render, renderHook} from "@testing-library/react";
import {StrictMode} from "react";
import {renderToString} from "react-dom/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useMediaQuery} from "./useMediaQuery";

type MediaQueryChangeEvent = Pick<MediaQueryListEvent, "matches">;
type MediaQueryListener = (event: MediaQueryChangeEvent) => void;
type MockedMediaQueryList = MediaQueryList & {
  listeners: MediaQueryListener[];
  addEventListener: ReturnType<typeof vi.fn<(event: string, handler: EventListenerOrEventListenerObject) => void>>;
  removeEventListener: ReturnType<typeof vi.fn<(event: string, handler: EventListenerOrEventListenerObject) => void>>;
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
        const callbacks = new Map<EventListenerOrEventListenerObject, MediaQueryListener>();
        const mediaQueryList: MockedMediaQueryList = {
          matches: currentMatches,
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          dispatchEvent: vi.fn(() => true),
          addEventListener: vi.fn((_event: string, handler: EventListenerOrEventListenerObject) => {
            const notify: MediaQueryListener = (event) => {
              const change = new MediaQueryListEvent("change", {matches: event.matches, media: query});
              if (typeof handler === "function") handler(change);
              else handler.handleEvent(change);
            };
            callbacks.set(handler, notify);
            listeners.push(notify);
          }),
          removeEventListener: vi.fn((_event: string, handler: EventListenerOrEventListenerObject) => {
            const notify = callbacks.get(handler);
            const listenerIndex = notify ? listeners.indexOf(notify) : -1;

            if (listenerIndex >= 0) {
              listeners.splice(listenerIndex, 1);
            }
            callbacks.delete(handler);
          }),
          listeners,
        };

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
      if (mediaQueryList) {
        Object.defineProperty(mediaQueryList, "matches", {value: true});
      }
      mediaQueryList?.listeners.forEach((listener) => {
        listener({matches: true});
      });
    });

    expect(result.current).toBe(true);

    act(() => {
      if (mediaQueryList) {
        Object.defineProperty(mediaQueryList, "matches", {value: false});
      }
      mediaQueryList?.listeners.forEach((listener) => {
        listener({matches: false});
      });
    });

    expect(result.current).toBe(false);
  });

  it("rechecks the match when it changes between render and subscription", () => {
    // Arrange
    const query = "(min-width: 1024px)";
    globalThis.window.matchMedia(query);
    const mediaQueryList = mediaQueryLists.get(query);
    if (!mediaQueryList) throw new Error("The media query fixture did not initialize");
    Object.defineProperty(mediaQueryList, "matches", {get: vi.fn().mockReturnValueOnce(false).mockReturnValue(true)});

    // Act
    const {result} = renderHook(() => useMediaQuery(query));

    // Assert
    expect(result.current).toBe(true);
  });

  it("removes event listener on unmount", () => {
    const {unmount} = renderHook(() => useMediaQuery("(min-width: 768px)"));
    const mediaQueryList = mediaQueryLists.get("(min-width: 768px)");
    if (!mediaQueryList) throw new Error("The media query did not subscribe");
    const {addEventListener, removeEventListener} = mediaQueryList;
    const listener = addEventListener.mock.calls[0]?.[1];

    unmount();

    expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith("change", listener);
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
    const {result, rerender, unmount} = renderHook(({query}) => useMediaQuery(query), {
      initialProps: {query: initialQuery},
    });

    const initialMediaQueryList = mediaQueryLists.get(initialQuery);
    const initialListener = initialMediaQueryList?.addEventListener.mock.calls[0]?.[1];
    expect(result.current).toBe(false);

    currentMatches = true;
    rerender({query: nextQuery});

    const nextMediaQueryList = mediaQueryLists.get(nextQuery);

    expect(initialMediaQueryList?.removeEventListener).toHaveBeenCalledWith("change", initialListener);
    expect(initialMediaQueryList?.listeners).toHaveLength(0);
    expect(nextMediaQueryList?.addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
    expect(result.current).toBe(true);

    // A callback retained by the old external source cannot overwrite the new query.
    act(() => {
      const event = new MediaQueryListEvent("change", {matches: false, media: initialQuery});
      if (typeof initialListener === "function") initialListener(event);
      else initialListener?.handleEvent(event);
    });
    expect(result.current).toBe(true);

    unmount();
    expect(nextMediaQueryList?.listeners).toHaveLength(0);
  });

  it("preserves the server snapshot during hydration before showing a matching client query", () => {
    // Arrange
    const query = "(min-width: 1024px)";
    const renderedMatches: boolean[] = [];
    const onRecoverableError = vi.fn();
    function TestComponent(): React.JSX.Element {
      const matches = useMediaQuery(query);
      renderedMatches.push(matches);
      return <span>{String(matches)}</span>;
    }

    currentMatches = true;
    const browserWindow = globalThis.window;
    vi.stubGlobal("window", undefined);
    const markup = renderToString(<TestComponent />);
    expect(markup).toContain("false");
    expect(browserWindow.matchMedia).not.toHaveBeenCalled();
    vi.stubGlobal("window", browserWindow);

    const container = document.createElement("div");
    container.innerHTML = markup;
    renderedMatches.length = 0;

    // Act
    const {unmount} = render(<TestComponent />, {container, hydrate: true, onRecoverableError});

    // Assert
    expect(renderedMatches[0]).toBe(false);
    expect(renderedMatches.at(-1)).toBe(true);
    expect(container).toHaveTextContent("true");
    expect(onRecoverableError).not.toHaveBeenCalled();

    unmount();
    expect(mediaQueryLists.get(query)?.listeners).toHaveLength(0);
  });

  it("keeps one live listener through Strict Mode replay and same-query rerenders", () => {
    // Arrange
    const query = "(min-width: 1024px)";
    currentMatches = true;

    // Act
    const {result, rerender, unmount} = renderHook(() => useMediaQuery(query), {wrapper: StrictMode});
    const mediaQueryList = mediaQueryLists.get(query);
    rerender();

    // Assert
    expect(result.current).toBe(true);
    expect(mediaQueryList?.listeners).toHaveLength(1);

    // Act
    unmount();

    // Assert
    expect(mediaQueryList?.listeners).toHaveLength(0);
    for (const [, listener] of mediaQueryList?.addEventListener.mock.calls ?? []) {
      expect(mediaQueryList?.removeEventListener).toHaveBeenCalledWith("change", listener);
    }
  });
});
