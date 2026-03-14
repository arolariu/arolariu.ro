import {act, renderHook} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {useAnnounce} from "./useAnnounce";

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

  it("cleans up live regions on unmount", () => {
    const {unmount} = renderHook(() => useAnnounce());

    unmount();

    const remaining = document.querySelectorAll("[aria-live]");

    expect(remaining).toHaveLength(0);
  });

  it("announces messages in the matching live region", () => {
    const requestAnimationFrameSpy = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback): number => {
        callback(0);
        return 0;
      });

    const {result} = renderHook(() => useAnnounce());

    act(() => {
      result.current("Saved", "assertive");
    });

    expect(document.querySelector('[aria-live="assertive"]')).toHaveTextContent("Saved");

    requestAnimationFrameSpy.mockRestore();
  });

  it("no-ops after unmount when live regions have been cleaned up", () => {
    const requestAnimationFrameSpy = vi
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback): number => {
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

    requestAnimationFrameSpy.mockRestore();
  });
});
