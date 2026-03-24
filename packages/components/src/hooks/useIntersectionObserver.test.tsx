import {act, renderHook} from "@testing-library/react";
import * as React from "react";
import {renderToString} from "react-dom/server";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {useIntersectionObserver} from "./useIntersectionObserver";

type MockIntersectionObserverCallback = (entries: IntersectionObserverEntry[]) => void;

describe("useIntersectionObserver", () => {
  let mockIntersectionObserver: {
    observe: ReturnType<typeof vi.fn>;
    unobserve: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    callback: MockIntersectionObserverCallback | null;
  };

  beforeEach(() => {
    mockIntersectionObserver = {
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      callback: null,
    };

    globalThis.IntersectionObserver = vi.fn(function (callback: MockIntersectionObserverCallback) {
      mockIntersectionObserver.callback = callback;

      return mockIntersectionObserver;
    }) as typeof IntersectionObserver;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it("returns null initially", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {result} = renderHook(() => useIntersectionObserver(ref));

    expect(result.current).toBe(null);
  });

  it("observes the element when ref is provided", () => {
    const element = document.createElement("div");
    const ref = {current: element};

    renderHook(() => useIntersectionObserver(ref));

    expect(globalThis.IntersectionObserver).toHaveBeenCalled();
    expect(mockIntersectionObserver.observe).toHaveBeenCalledWith(element);
  });

  it("returns IntersectionObserverEntry when element is intersecting", () => {
    const element = document.createElement("div");
    const ref = {current: element};
    const {result} = renderHook(() => useIntersectionObserver(ref));

    const mockEntry: Partial<IntersectionObserverEntry> = {
      isIntersecting: true,
      intersectionRatio: 0.5,
      target: element,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now(),
    };

    act(() => {
      if (mockIntersectionObserver.callback) {
        mockIntersectionObserver.callback([mockEntry as IntersectionObserverEntry]);
      }
    });

    expect(result.current?.isIntersecting).toBe(true);
    expect(result.current?.intersectionRatio).toBe(0.5);
  });

  it("returns IntersectionObserverEntry when element is not intersecting", () => {
    const element = document.createElement("div");
    const ref = {current: element};
    const {result} = renderHook(() => useIntersectionObserver(ref));

    const mockEntry: Partial<IntersectionObserverEntry> = {
      isIntersecting: false,
      intersectionRatio: 0,
      target: element,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now(),
    };

    act(() => {
      if (mockIntersectionObserver.callback) {
        mockIntersectionObserver.callback([mockEntry as IntersectionObserverEntry]);
      }
    });

    expect(result.current?.isIntersecting).toBe(false);
    expect(result.current?.intersectionRatio).toBe(0);
  });

  it("disconnects observer on unmount", () => {
    const element = document.createElement("div");
    const ref = {current: element};
    const {unmount} = renderHook(() => useIntersectionObserver(ref));

    unmount();

    expect(mockIntersectionObserver.disconnect).toHaveBeenCalled();
  });

  it("passes options to IntersectionObserver", () => {
    const element = document.createElement("div");
    const ref = {current: element};
    const options: IntersectionObserverInit = {
      threshold: 0.5,
      rootMargin: "10px",
    };

    renderHook(() => useIntersectionObserver(ref, options));

    expect(globalThis.IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), options);
  });

  it("handles multiple threshold values", () => {
    const element = document.createElement("div");
    const ref = {current: element};
    const options: IntersectionObserverInit = {
      threshold: [0, 0.25, 0.5, 0.75, 1],
    };

    renderHook(() => useIntersectionObserver(ref, options));

    expect(globalThis.IntersectionObserver).toHaveBeenCalledWith(expect.any(Function), options);
  });

  it("does not observe when ref is null", () => {
    const ref = {current: null};

    renderHook(() => useIntersectionObserver(ref));

    expect(mockIntersectionObserver.observe).not.toHaveBeenCalled();
  });

  it("returns null during SSR when IntersectionObserver is unavailable", () => {
    const originalIntersectionObserver = globalThis.IntersectionObserver;

    // @ts-expect-error - Simulating SSR environment
    delete globalThis.IntersectionObserver;

    function TestComponent(): React.JSX.Element {
      const ref = React.createRef<HTMLDivElement>();
      const entry = useIntersectionObserver(ref);

      return <span>{String(entry === null)}</span>;
    }

    const markup = renderToString(<TestComponent />);

    expect(markup).toContain("true");

    globalThis.IntersectionObserver = originalIntersectionObserver;
  });

  it("updates entry when intersection state changes", () => {
    const element = document.createElement("div");
    const ref = {current: element};
    const {result} = renderHook(() => useIntersectionObserver(ref));

    // First update: not intersecting
    const firstEntry: Partial<IntersectionObserverEntry> = {
      isIntersecting: false,
      intersectionRatio: 0,
      target: element,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now(),
    };

    act(() => {
      if (mockIntersectionObserver.callback) {
        mockIntersectionObserver.callback([firstEntry as IntersectionObserverEntry]);
      }
    });

    expect(result.current?.isIntersecting).toBe(false);

    // Second update: intersecting
    const secondEntry: Partial<IntersectionObserverEntry> = {
      isIntersecting: true,
      intersectionRatio: 1,
      target: element,
      boundingClientRect: {} as DOMRectReadOnly,
      intersectionRect: {} as DOMRectReadOnly,
      rootBounds: {} as DOMRectReadOnly,
      time: Date.now(),
    };

    act(() => {
      if (mockIntersectionObserver.callback) {
        mockIntersectionObserver.callback([secondEntry as IntersectionObserverEntry]);
      }
    });

    expect(result.current?.isIntersecting).toBe(true);
    expect(result.current?.intersectionRatio).toBe(1);
  });

  it("recreates observer when options change", () => {
    const element = document.createElement("div");
    const ref = {current: element};
    const {rerender} = renderHook(({opts}) => useIntersectionObserver(ref, opts), {
      initialProps: {opts: {threshold: 0.5}},
    });

    expect(mockIntersectionObserver.disconnect).not.toHaveBeenCalled();

    rerender({opts: {threshold: 0.8}});

    expect(mockIntersectionObserver.disconnect).toHaveBeenCalled();
  });
});
