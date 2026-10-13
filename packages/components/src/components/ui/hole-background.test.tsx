import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import {renderToString} from "react-dom/server";
import {act, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {HoleBackground} from "./hole-background";

let box = new DOMRect(10, 20, 200, 100);
let reduced = true;
let media: MediaQueryList;
let observers: ResizeBoundary[] = [];
let views: ViewBoundary[] = [];
let frames = new Map<number, FrameRequestCallback>();
let nextId = 0;
const context = {
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  ellipse: vi.fn(),
  clip: vi.fn(),
  drawImage: vi.fn(),
  scale: vi.fn(),
  isPointInPath: vi.fn(() => false),
  isPointInStroke: vi.fn(() => false),
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
} satisfies Partial<CanvasRenderingContext2D>;
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
class PathBoundary {
  readonly ellipse = vi.fn();
  readonly rect = vi.fn();
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
  box = new DOMRect(10, 20, 200, 100);
  reduced = true;
  observers = [];
  views = [];
  frames = new Map();
  nextId = 0;
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockImplementation(() => box);
  Object.defineProperty(window, "devicePixelRatio", {configurable: true, value: 2});
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {configurable: true, value: () => context});
  vi.stubGlobal("Path2D", PathBoundary);
  vi.stubGlobal("ResizeObserver", ResizeBoundary);
  vi.stubGlobal("IntersectionObserver", ViewBoundary);
  vi.stubGlobal("EventTarget", DOMEventTarget);
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
    const id = ++nextId;
    frames.set(id, callback);
    return id;
  });
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) => {
    frames.delete(id);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HoleBackground", () => {
  it("cancels native offscreen frames and freezes the drawn tunnel", () => {
    reduced = false;
    const ref = React.createRef<HTMLCanvasElement>();
    render(<HoleBackground ref={ref} />);
    const stale = [...frames.values()].find((callback) => callback.name === "animate");
    expect(stale).toBeDefined();
    act(() => {
      views[0]?.visibility(true);
      views[0]?.visibility(false);
    });
    expect(ref.current?.parentElement).toHaveAttribute("data-motion", "paused");
    const draws = context.ellipse.mock.calls.length;
    act(() => {
      stale?.(16);
    });
    expect(context.ellipse).toHaveBeenCalledTimes(draws);
    act(() => {
      views[0]?.visibility(true);
    });
    expect(ref.current?.parentElement).toHaveAttribute("data-motion", "running");
  });
  it("paints a static tunnel with element geometry and DPR without scheduling native RAF", () => {
    const ref = React.createRef<HTMLCanvasElement>();
    render(
      <HoleBackground
        ref={ref}
        strokeColor='#123456'
        numberOfDiscs={10}
      />,
    );
    expect(ref.current).toHaveAttribute("width", "400");
    expect(ref.current).toHaveAttribute("height", "200");
    expect(ref.current).toHaveAttribute("aria-hidden", "true");
    expect(context.scale).toHaveBeenCalledWith(2, 2);
    expect(context.ellipse).toHaveBeenCalledWith(100, 45, 150, 70, 0, 0, Math.PI * 2);
    expect(context.drawImage).toHaveBeenCalled();
    expect(context.fill).toHaveBeenCalledTimes(100);
    expect(frames.size).toBe(0);
  });

  it("responds to element-only resize and retains canvas props, root class and foreground content", () => {
    const ref = React.createRef<HTMLCanvasElement>();
    const {unmount} = render(
      <HoleBackground
        ref={ref}
        className='custom'
        title='Canvas'>
        <img
          alt='Foreground'
          src='image.png'
        />
      </HoleBackground>,
    );
    expect(ref.current?.parentElement).toHaveClass("custom");
    expect(ref.current).toHaveAttribute("title", "Canvas");
    expect(screen.getByRole("img", {name: "Foreground"})).toBeInTheDocument();
    expect(observers[0]?.observe).toHaveBeenCalledWith(ref.current);
    act(() => {
      box = new DOMRect(10, 20, 300, 150);
      observers[0]?.resize();
    });
    expect(ref.current).toHaveAttribute("width", "600");
    expect(context.ellipse).toHaveBeenCalledWith(150, 67.5, 225, 105, 0, 0, Math.PI * 2);
    unmount();
    expect(observers[0]?.disconnect).toHaveBeenCalledOnce();
    expect(ref.current).toBeNull();
  });

  it("does not regenerate random particles/default arrays on unrelated rerenders", () => {
    const {rerender} = render(<HoleBackground title='first' />);
    const clears = context.clearRect.mock.calls.length;
    const random = vi.spyOn(Math, "random");
    random.mockClear();
    rerender(<HoleBackground title='second' />);
    expect(context.clearRect).toHaveBeenCalledTimes(clears);
    expect(random).not.toHaveBeenCalled();
  });

  it("cancels motion on live preference changes and guards stale frame/resize callbacks", () => {
    reduced = false;
    const ref = React.createRef<HTMLCanvasElement>();
    const {unmount} = render(<HoleBackground ref={ref} />);
    const staleFrame = [...frames.values()].find((callback) => callback.name === "animate");
    const resize = observers[0];
    act(() => {
      reduced = true;
      media.dispatchEvent(new Event("change"));
    });
    const clears = context.clearRect.mock.calls.length;
    act(() => {
      staleFrame?.(32);
    });
    expect(context.clearRect).toHaveBeenCalledTimes(clears);
    expect(ref.current?.parentElement).toHaveAttribute("data-motion", "paused");
    act(() => {
      reduced = false;
      media.dispatchEvent(new Event("change"));
    });
    expect(ref.current?.parentElement).toHaveAttribute("data-motion", "running");
    unmount();
    const afterUnmount = context.clearRect.mock.calls.length;
    act(() => {
      resize?.resize();
      staleFrame?.(48);
    });
    expect(context.clearRect).toHaveBeenCalledTimes(afterUnmount);
    expect(frames.size).toBeLessThanOrEqual(1);
  });

  it("bounds dense disc/line geometry while preserving drawn tunnel discs", () => {
    render(
      <HoleBackground
        numberOfDiscs={10000}
        numberOfLines={2}
      />,
    );
    expect(context.ellipse.mock.calls.length).toBeLessThanOrEqual(53);
    expect(context.ellipse.mock.calls.length).toBeGreaterThan(1);
  });
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])("rejects invalid disc count %s", (numberOfDiscs) => {
    expect(() => renderToString(<HoleBackground numberOfDiscs={numberOfDiscs} />)).toThrow(/count/u);
  });
  it("rejects invalid particle channels, empty geometry and missing 2D contexts", () => {
    expect(() => render(<HoleBackground particleRGBColor={[255, Number.NaN, 0]} />)).toThrow(/RGB/u);
    box = new DOMRect(0, 0, 0, 0);
    expect(() => render(<HoleBackground />)).toThrow(/geometry/u);
    box = new DOMRect(0, 0, 200, 100);
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {configurable: true, value: () => null});
    expect(() => render(<HoleBackground />)).toThrow(/2D/u);
  });
});
