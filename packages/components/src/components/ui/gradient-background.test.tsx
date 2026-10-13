import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import {act, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {GradientBackground} from "./gradient-background";

let reduced = true;
let media: MediaQueryList;
let views: ViewBoundary[] = [];
class ViewBoundary implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds = [0];
  readonly disconnect = vi.fn();
  readonly unobserve = vi.fn();
  private target: Element | null = null;
  private readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    views.push(this);
  }
  observe(target: Element): void {
    this.target = target;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  visibility(isIntersecting: boolean): void {
    if (!this.target) throw new Error("Missing observed target");
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
  views = [];
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

describe("GradientBackground", () => {
  it("pauses offscreen recurring Motion and cleans its platform subscriptions", () => {
    reduced = false;
    const ref = React.createRef<HTMLDivElement>();
    const {unmount} = render(<GradientBackground ref={ref} />);
    act(() => {
      views[0]?.visibility(true);
      views[0]?.visibility(false);
    });
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    act(() => {
      views[0]?.visibility(true);
    });
    expect(ref.current).toHaveAttribute("data-motion", "running");
    unmount();
    expect(views[0]?.disconnect).toHaveBeenCalledOnce();
  });
  it("preserves native content, caller style, event handlers and the root ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {unmount} = render(
      <GradientBackground
        ref={ref}
        className='custom'
        title='Background'
        style={{opacity: 0.5}}>
        <button type='button'>Content action</button>
      </GradientBackground>,
    );
    expect(ref.current).toHaveClass("custom");
    expect(ref.current).toHaveAttribute("title", "Background");
    expect(ref.current).toHaveStyle({opacity: "0.5"});
    expect(screen.getByRole("button", {name: "Content action"})).toBeEnabled();
    unmount();
    expect(ref.current).toBeNull();
  });

  it("renders a static gradient even if the caller requested repeating Motion", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <GradientBackground
        ref={ref}
        animate={{backgroundPosition: "100% 50%"}}
        transition={{repeat: Infinity}}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
    });
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    expect(ref.current).toHaveStyle({backgroundPosition: "0% 50%"});
    act(() => {
      reduced = false;
      media.dispatchEvent(new Event("change"));
    });
    expect(ref.current).toHaveAttribute("data-motion", "running");
    act(() => {
      reduced = true;
      media.dispatchEvent(new Event("change"));
    });
    expect(ref.current).toHaveAttribute("data-motion", "paused");
  });
});
