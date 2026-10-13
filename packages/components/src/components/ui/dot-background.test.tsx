import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import {act, render} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {DotBackground} from "./dot-background";

let box = new DOMRect(0, 0, 32, 16);
let reduced = true;
let media: MediaQueryList;
let observers: ResizeBoundary[] = [];
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
  enter(): void {
    if (!this.target) throw new Error("Missing observed target");
    const rect = this.target.getBoundingClientRect();
    this.callback(
      [
        {
          target: this.target,
          boundingClientRect: rect,
          intersectionRect: rect,
          rootBounds: null,
          isIntersecting: true,
          intersectionRatio: 1,
          time: 0,
        },
      ],
      this,
    );
  }
}
class ResizeBoundary implements ResizeObserver {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();
  private readonly callback: ResizeObserverCallback;
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    observers.push(this);
  }
  resize(): void {
    this.callback([], this);
  }
}

beforeEach(() => {
  observers = [];
  views = [];
  box = new DOMRect(0, 0, 32, 16);
  reduced = true;
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockImplementation(() => box);
  vi.stubGlobal("ResizeObserver", ResizeBoundary);
  vi.stubGlobal("IntersectionObserver", ViewBoundary);
  vi.stubGlobal("EventTarget", DOMEventTarget);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("DotBackground", () => {
  it("observes the element and regenerates the actual grid on element-only resizing", () => {
    const ref = React.createRef<SVGSVGElement>();
    const {unmount} = render(
      <DotBackground
        ref={ref}
        x={2}
        y={3}
        cx={4}
        cy={5}
        cr={2}
      />,
    );
    expect(ref.current?.querySelectorAll("circle")).toHaveLength(2);
    expect(ref.current?.querySelector("circle")).toHaveAttribute("cx", "6");
    expect(ref.current?.querySelector("circle")).toHaveAttribute("cy", "8");
    expect(observers[0]?.observe).toHaveBeenCalledWith(ref.current);
    act(() => {
      box = new DOMRect(0, 0, 48, 32);
      observers[0]?.resize();
    });
    expect(ref.current?.querySelectorAll("circle")).toHaveLength(6);
    unmount();
    expect(observers[0]?.disconnect).toHaveBeenCalledOnce();
    expect(ref.current).toBeNull();
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid spacing %s explicitly", (width) => {
    expect(() => render(<DotBackground width={width} />)).toThrow(/spacing/u);
  });

  it("rejects invalid dot geometry and bounds tiny-spacing grids", () => {
    expect(() => render(<DotBackground cr={Number.NaN} />)).toThrow(/radius/u);
    const {container} = render(
      <DotBackground
        width={0.25}
        height={0.25}
      />,
    );
    expect(container.querySelectorAll("circle").length).toBeLessThanOrEqual(4096);
    expect(container.querySelectorAll("circle").length).toBeGreaterThan(0);
  });

  it("rejects empty measured geometry instead of scheduling an empty animated grid", () => {
    box = new DOMRect(0, 0, 0, 0);
    expect(() => render(<DotBackground />)).toThrow(/geometry/u);
  });

  it("keeps even subnormal positive spacing bounded and non-empty", () => {
    const {container} = render(
      <DotBackground
        width={Number.MIN_VALUE}
        height={Number.MIN_VALUE}
      />,
    );
    expect(container.querySelectorAll("circle").length).toBeGreaterThan(0);
    expect(container.querySelectorAll("circle").length).toBeLessThanOrEqual(4096);
  });

  it("keeps static dots under reduced motion and stable instances/timing across rerenders", () => {
    const random = vi.spyOn(Math, "random");
    const ref = vi.fn<(element: SVGSVGElement | null) => void>();
    const {container, rerender} = render(
      <DotBackground
        glow
        ref={ref}
      />,
    );
    const svg = container.querySelector("svg");
    const dot = container.querySelector("circle");
    act(() => {
      views[0]?.enter();
    });
    expect(svg).toHaveAttribute("data-motion", "paused");
    expect(dot).toHaveStyle({opacity: "0.4"});
    random.mockClear();
    rerender(
      <DotBackground
        glow
        ref={ref}
        data-testid='rerender'
      />,
    );
    expect(container.querySelector("circle")).toBe(dot);
    expect(random).not.toHaveBeenCalled();
    act(() => {
      reduced = false;
      media.dispatchEvent(new Event("change"));
    });
    expect(svg).toHaveAttribute("data-motion", "running");
    act(() => {
      reduced = true;
      media.dispatchEvent(new Event("change"));
    });
    expect(svg).toHaveAttribute("data-motion", "paused");
  });
});
