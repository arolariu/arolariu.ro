import {act, render, renderHook} from "@testing-library/react";
import * as React from "react";
import {afterEach, describe, expect, it, vi} from "vitest";

import {useAnnounce} from "./useAnnounce";

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
  document.body.innerHTML = "";
});

describe("useAnnounce", () => {
  it("returns an announce function", () => {
    const {result} = renderHook(() => useAnnounce());

    expect(typeof result.current).toBe("function");
  });

  it("creates live regions in the DOM", () => {
    const {unmount} = renderHook(() => useAnnounce());
    const polite = document.querySelector('[aria-live="polite"]');
    const assertive = document.querySelector('[aria-live="assertive"]');

    expect(polite).toBeInstanceOf(HTMLElement);
    expect(assertive).toBeInstanceOf(HTMLElement);

    unmount();
  });

  it("creates live regions with the expected accessibility attributes", () => {
    const {unmount} = renderHook(() => useAnnounce());
    const liveRegions = document.querySelectorAll<HTMLElement>("[aria-live]");

    expect(liveRegions).toHaveLength(2);

    for (const liveRegion of liveRegions) {
      expect(liveRegion).toHaveAttribute("role", "status");
      expect(liveRegion).toHaveAttribute("aria-atomic", "true");
    }

    unmount();
  });

  it("cleans up live regions on unmount", () => {
    const {unmount} = renderHook(() => useAnnounce());

    unmount();

    const remaining = document.querySelectorAll("[aria-live]");

    expect(remaining).toHaveLength(0);
  });

  it("appends one polite and one assertive region to document.body per hook instance", () => {
    const first = renderHook(() => useAnnounce());
    const second = renderHook(() => useAnnounce());
    const bodyRegions = () => [...document.body.children].filter((element) => element.hasAttribute("aria-live"));

    expect(bodyRegions().map((region) => region.getAttribute("aria-live"))).toEqual(["polite", "assertive", "polite", "assertive"]);

    first.unmount();
    expect(bodyRegions()).toHaveLength(2);

    second.unmount();
    expect(bodyRegions()).toHaveLength(0);
  });

  it("drops an announcement made before its regions exist, such as from a child's mount effect", () => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    });
    function Child({announce}: {readonly announce: ReturnType<typeof useAnnounce>}): null {
      React.useEffect(() => {
        announce("Loaded");
      }, [announce]);
      return null;
    }
    function Parent(): React.JSX.Element {
      const announce = useAnnounce();
      return <Child announce={announce} />;
    }

    render(<Parent />);

    expect(document.querySelector('[aria-live="polite"]')).toBeInstanceOf(HTMLElement);
    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent("");
  });

  it("announces messages in the matching live region", () => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    });

    const {result} = renderHook(() => useAnnounce());

    act(() => {
      result.current("Saved", "assertive");
    });

    expect(document.querySelector('[aria-live="assertive"]')).toHaveTextContent("Saved");
  });

  it("overwrites the previous message when announce is called twice quickly", () => {
    const animationFrameCallbacks: FrameRequestCallback[] = [];

    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback): number => {
      animationFrameCallbacks.push(callback);
      return animationFrameCallbacks.length;
    });

    const {result} = renderHook(() => useAnnounce());

    act(() => {
      result.current("Saved draft");
      result.current("Published article");
    });

    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent("");

    act(() => {
      animationFrameCallbacks.forEach((callback) => {
        callback(0);
      });
    });

    expect(document.querySelector('[aria-live="polite"]')).toHaveTextContent("Published article");
  });

  it("no-ops after unmount when live regions have been cleaned up", () => {
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    });

    const {result, unmount} = renderHook(() => useAnnounce());

    unmount();

    expect(() => {
      act(() => {
        result.current("Saved");
      });
    }).not.toThrow();
  });
});
