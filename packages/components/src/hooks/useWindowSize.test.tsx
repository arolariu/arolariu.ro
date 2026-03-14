import {act, renderHook, waitFor} from "@testing-library/react";
import {renderToString} from "react-dom/server";
import {afterEach, describe, expect, it, vi} from "vitest";

import {useWindowSize} from "./useWindowSize";

const ORIGINAL_INNER_WIDTH = globalThis.window.innerWidth;
const ORIGINAL_INNER_HEIGHT = globalThis.window.innerHeight;

/**
 * Applies a new viewport size and emits the resize event used by the hook.
 *
 * @param width - The viewport width.
 * @param height - The viewport height.
 * @returns Nothing.
 */
function resizeViewport(width: number, height: number): void {
  Object.defineProperty(globalThis.window, "innerWidth", {
    configurable: true,
    writable: true,
    value: width,
  });

  Object.defineProperty(globalThis.window, "innerHeight", {
    configurable: true,
    writable: true,
    value: height,
  });

  globalThis.window.dispatchEvent(new Event("resize"));
}

afterEach(() => {
  Object.defineProperty(globalThis.window, "innerWidth", {
    configurable: true,
    writable: true,
    value: ORIGINAL_INNER_WIDTH,
  });

  Object.defineProperty(globalThis.window, "innerHeight", {
    configurable: true,
    writable: true,
    value: ORIGINAL_INNER_HEIGHT,
  });

  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useWindowSize", () => {
  it("returns null dimensions initially", () => {
    function TestComponent(): React.JSX.Element {
      const windowSizeState = useWindowSize();

      return <pre>{JSON.stringify(windowSizeState)}</pre>;
    }

    const serverMarkup = renderToString(<TestComponent />);

    expect(serverMarkup).toContain("&quot;width&quot;:null");
    expect(serverMarkup).toContain("&quot;height&quot;:null");
  });

  it("returns the current width and height after mount", async () => {
    // Arrange
    resizeViewport(1280, 720);

    // Act
    const {result} = renderHook(() => useWindowSize());

    // Assert
    await waitFor(() => {
      expect(result.current.windowSize).toStrictEqual({
        width: 1280,
        height: 720,
      });
    });
  });

  it("isMobile is true when width is below 768", async () => {
    // Arrange
    resizeViewport(640, 900);

    // Act
    const {result} = renderHook(() => useWindowSize());

    // Assert
    await waitFor(() => {
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });
  });

  it("isDesktop is true when width is at least 768", async () => {
    // Arrange
    resizeViewport(1024, 768);

    // Act
    const {result} = renderHook(() => useWindowSize());

    // Assert
    await waitFor(() => {
      expect(result.current.isMobile).toBe(false);
      expect(result.current.isDesktop).toBe(true);
    });
  });

  it("updates on window resize", async () => {
    // Arrange
    resizeViewport(900, 700);
    const {result} = renderHook(() => useWindowSize());

    await waitFor(() => {
      expect(result.current.windowSize).toStrictEqual({
        width: 900,
        height: 700,
      });
    });

    // Act
    act(() => {
      resizeViewport(700, 500);
    });

    // Assert
    await waitFor(() => {
      expect(result.current.windowSize).toStrictEqual({
        width: 700,
        height: 500,
      });
      expect(result.current.isMobile).toBe(true);
      expect(result.current.isDesktop).toBe(false);
    });
  });

  it("cleans up event listener on unmount", async () => {
    // Arrange
    const addEventListenerSpy = vi.spyOn(globalThis.window, "addEventListener");
    const removeEventListenerSpy = vi.spyOn(globalThis.window, "removeEventListener");
    const {unmount} = renderHook(() => useWindowSize());

    await waitFor(() => {
      expect(addEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
    });

    // Act
    act(() => {
      unmount();
    });

    // Assert
    expect(removeEventListenerSpy).toHaveBeenCalledWith("resize", expect.any(Function));
  });
});
