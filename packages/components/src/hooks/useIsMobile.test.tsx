import {act, renderHook, waitFor} from "@testing-library/react";
import {renderToString} from "react-dom/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useIsMobile} from "./useIsMobile";

type MatchMediaListener = (event: MediaQueryListEvent) => void;

const ORIGINAL_INNER_WIDTH = globalThis.window.innerWidth;
const ORIGINAL_MATCH_MEDIA = globalThis.window.matchMedia;

let mediaQueryChangeListener: MatchMediaListener | null = null;
let addEventListenerSpy = vi.fn();
let removeEventListenerSpy = vi.fn();

/**
 * Updates the viewport width and emits the browser events used by the hook.
 *
 * @param width - The viewport width to apply.
 * @returns Nothing.
 */
function resizeViewport(width: number): void {
  Object.defineProperty(globalThis.window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });

  globalThis.window.dispatchEvent(new Event("resize"));

  if (mediaQueryChangeListener) {
    mediaQueryChangeListener({
      matches: width < 768,
    } as MediaQueryListEvent);
  }
}

beforeEach(() => {
  mediaQueryChangeListener = null;
  addEventListenerSpy = vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
    if (event === "change" && typeof listener === "function") {
      mediaQueryChangeListener = listener as MatchMediaListener;
    }
  });
  removeEventListenerSpy = vi.fn((event: string, listener: EventListenerOrEventListenerObject) => {
    if (event === "change" && listener === mediaQueryChangeListener) {
      mediaQueryChangeListener = null;
    }
  });

  Object.defineProperty(globalThis.window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string): MediaQueryList => {
      return {
        matches: globalThis.window.innerWidth < 768,
        media: query,
        onchange: null,
        addEventListener: addEventListenerSpy,
        removeEventListener: removeEventListenerSpy,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  });
});

afterEach(() => {
  Object.defineProperty(globalThis.window, "innerWidth", {
    configurable: true,
    writable: true,
    value: ORIGINAL_INNER_WIDTH,
  });

  Object.defineProperty(globalThis.window, "matchMedia", {
    configurable: true,
    writable: true,
    value: ORIGINAL_MATCH_MEDIA,
  });

  mediaQueryChangeListener = null;
  vi.clearAllMocks();
});

describe("useIsMobile", () => {
  it("returns false initially for SSR safety", () => {
    function TestComponent(): React.JSX.Element {
      const isMobile = useIsMobile();

      return <span>{String(isMobile)}</span>;
    }

    expect(renderToString(<TestComponent />)).toContain("false");
  });

  it("returns true when window width is below 768", async () => {
    // Arrange
    resizeViewport(767);

    // Act
    const {result} = renderHook(() => useIsMobile());

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("returns false when window width is at least 768", async () => {
    // Arrange
    resizeViewport(768);

    // Act
    const {result} = renderHook(() => useIsMobile());

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it("responds to window resize events", async () => {
    // Arrange
    resizeViewport(1024);
    const {result} = renderHook(() => useIsMobile());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    // Act
    act(() => {
      resizeViewport(640);
    });

    // Assert
    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("cleans up the media query event listener on unmount", async () => {
    // Arrange
    const {unmount} = renderHook(() => useIsMobile());

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
    });

    // Act
    act(() => {
      unmount();
    });

    // Assert
    expect(removeEventListenerSpy).toHaveBeenCalledTimes(1);
    expect(removeEventListenerSpy).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
