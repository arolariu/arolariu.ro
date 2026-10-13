import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import {motionValue} from "motion/react";
import {act, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {HighlightText} from "./highlight-text";

let reduced = true;
let media: MediaQueryList;
let observed: ViewBoundary[] = [];
class ViewBoundary implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds = [0];
  readonly disconnect = vi.fn();
  readonly unobserve = vi.fn();
  target: Element | null = null;
  private readonly callback: IntersectionObserverCallback;
  readonly options: IntersectionObserverInit | undefined;
  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback;
    this.options = options;
    observed.push(this);
  }
  observe(target: Element): void {
    this.target = target;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  enter(isIntersecting: boolean): void {
    if (!this.target) throw new Error("Missing observed element");
    const rect = this.target.getBoundingClientRect();
    this.callback(
      [
        {
          target: this.target,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          boundingClientRect: rect,
          intersectionRect: rect,
          rootBounds: null,
          time: 0,
        },
      ],
      this,
    );
  }
}
beforeEach(() => {
  observed = [];
  reduced = true;
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  vi.stubGlobal("IntersectionObserver", ViewBoundary);
  vi.stubGlobal("EventTarget", DOMEventTarget);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HighlightText", () => {
  it("replays a real highlight sweep after leaving and re-entering with inViewOnce=false", async () => {
    reduced = false;
    const ref = React.createRef<HTMLSpanElement>();
    const updates: string[] = [];
    render(
      <HighlightText
        ref={ref}
        text='Replay'
        inView
        inViewOnce={false}
        transition={{duration: 0.15}}
        onUpdate={(latest): void => {
          if (typeof latest["backgroundSize"] === "string") updates.push(latest["backgroundSize"]);
        }}
      />,
    );
    await act(async () => {
      for (const observer of observed) if (observer.target) observer.enter(true);
    });
    await waitFor(() => expect(ref.current).toHaveStyle({backgroundSize: "100% 100%"}));
    await act(async () => {
      for (const observer of observed) if (observer.target) observer.enter(false);
    });
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 30);
    });
    updates.length = 0;
    await act(async () => {
      for (const observer of observed) if (observer.target) observer.enter(true);
    });
    await waitFor(() =>
      expect(
        updates.some((value) => {
          const percentage = Number.parseFloat(value);
          return percentage > 0 && percentage < 100;
        }),
      ).toBe(true),
    );
    await waitFor(() => expect(ref.current).toHaveStyle({backgroundSize: "100% 100%"}));
  });
  it("preserves a live MotionValue child alongside the text prop", async () => {
    const count = motionValue(1);
    render(<HighlightText text='Count: '>{count}</HighlightText>);
    expect(screen.getByText("1")).toBeInTheDocument();
    act(() => {
      count.set(2);
    });
    await waitFor(() => expect(screen.getByText("2")).toBeInTheDocument());
  });
  it("renders the completed highlight under reduced motion without hiding text or changing span semantics", async () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(
      <HighlightText
        ref={ref}
        inView
        text='Highlighted'
      />,
    );
    expect(ref.current?.tagName).toBe("SPAN");
    await waitFor(() => expect(ref.current).toHaveStyle({backgroundSize: "100% 100%"}));
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    expect(screen.getByText("Highlighted")).toBeInTheDocument();
  });

  it("uses the real viewport observer and reveals the actual background when entering view", async () => {
    reduced = false;
    const ref = React.createRef<HTMLSpanElement>();
    const {unmount} = render(
      <HighlightText
        ref={ref}
        inView
        inViewMargin='-20% 0px'
        text='Deferred'
        transition={{duration: 0}}
      />,
    );
    expect(ref.current).toHaveStyle({backgroundSize: "0% 100%"});
    expect(observed.some((observer) => observer.options?.rootMargin === "-20% 0px")).toBe(true);
    await act(async () => {
      for (const observer of observed) if (observer.target) observer.enter(true);
    });
    await waitFor(() => expect(ref.current).toHaveStyle({backgroundSize: "100% 100%"}));
    unmount();
    expect(observed.every((observer) => observer.disconnect.mock.calls.length === 1)).toBe(true);
    expect(ref.current).toBeNull();
  });

  it("responds to a live preference change and preserves additional caller children", async () => {
    reduced = false;
    const ref = React.createRef<HTMLSpanElement>();
    render(
      <HighlightText
        ref={ref}
        inView
        text='Text'>
        <img
          alt='Inline icon'
          src='icon.png'
        />
      </HighlightText>,
    );
    expect(screen.getByRole("img", {name: "Inline icon"})).toBeInTheDocument();
    act(() => {
      reduced = true;
      media.dispatchEvent(new Event("change"));
    });
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    await waitFor(() => expect(ref.current).toHaveStyle({backgroundSize: "100% 100%"}));
  });
});
