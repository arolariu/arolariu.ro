import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {AtRule, parse} from "postcss";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {FireworksBackground} from "./fireworks-background";

let box = new DOMRect(100, 50, 200, 100);
let reduced = false;
let media: MediaQueryList;
let observers: ResizeBoundary[] = [];
let views: ViewBoundary[] = [];
let frames = new Map<number, FrameRequestCallback>();
let timers = new Map<number, () => void>();
let timerNames = new Map<number, string>();
let nextId = 0;
const context = {
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  globalAlpha: 1,
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 1,
  lineCap: "round",
} satisfies Partial<CanvasRenderingContext2D>;
class ViewBoundary implements IntersectionObserver {
  readonly root: IntersectionObserver["root"] = null;
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
function frame(): void {
  const pending = [...frames.values()];
  frames.clear();
  act(() => {
    for (const callback of pending) callback(16);
  });
}
/** Fires the visual-effect policy's five-second `settleMotion` timer (automatic motion settles without `loop`). */
function settle(): void {
  const id = [...timerNames].find(([, name]) => name === "settleMotion")?.[0];
  const callback = id === undefined ? undefined : timers.get(id);
  if (id === undefined || !callback) throw new Error("Missing automatic-motion settle timer");
  timers.delete(id);
  act(() => {
    callback();
  });
}
/** Runs scheduled frames until the loop idles (bounded); reports the frame count and the final frame's arc draws. */
function runUntilIdle(): {readonly rendered: number; readonly finalArcs: number} {
  let rendered = 0;
  let finalArcs = 0;
  while (frames.size > 0 && rendered < 1000) {
    const arcs = context.arc.mock.calls.length;
    frame();
    finalArcs = context.arc.mock.calls.length - arcs;
    rendered += 1;
  }
  return {rendered, finalArcs};
}
beforeEach(() => {
  box = new DOMRect(100, 50, 200, 100);
  reduced = false;
  observers = [];
  views = [];
  frames = new Map();
  timers = new Map();
  timerNames = new Map();
  nextId = 0;
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => box);
  Object.defineProperty(window, "devicePixelRatio", {configurable: true, value: 2});
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {configurable: true, value: vi.fn(() => context)});
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
  vi.stubGlobal("setTimeout", (handler: TimerHandler): number => {
    if (typeof handler !== "function") throw new TypeError("Expected a timer callback");
    const id = ++nextId;
    timers.set(id, (): void => {
      handler();
    });
    timerNames.set(id, handler.name);
    return id;
  });
  vi.spyOn(window, "clearTimeout").mockImplementation((id) => {
    if (typeof id === "number") timers.delete(id);
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FireworksBackground", () => {
  it("uses an equivalent native keyboard launch and ignores decorative container clicks", () => {
    const {container} = render(
      <FireworksBackground
        population={0}
        fireworkSpeed={4}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
    });
    context.moveTo.mockClear();
    const root = container.firstElementChild;
    if (!root) throw new Error("Missing fireworks root");
    fireEvent.click(root);
    frame();
    expect(context.moveTo).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Launch fireworks"}), {detail: 0});
    frame();
    expect(context.moveTo).toHaveBeenCalledWith(200, 196);
  });

  it("rejects sparse palettes rather than painting a success-shaped random/default color", () => {
    expect(() => render(<FireworksBackground color={Array<string>(2)} />)).toThrow(/palette/u);
  });
  it("stops offscreen/document-hidden work and resumes when visible", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <FireworksBackground
        ref={ref}
        loop
        motionPaused={false}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
      views[0]?.visibility(false);
    });
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    expect(timers.size).toBe(0);
    const clears = context.clearRect.mock.calls.length;
    frame();
    expect(context.clearRect).toHaveBeenCalledTimes(clears);
    act(() => {
      views[0]?.visibility(true);
    });
    expect(ref.current).toHaveAttribute("data-motion", "running");
    expect(timers.size).toBe(1);
    const hidden = vi.spyOn(document, "visibilityState", "get");
    act(() => {
      hidden.mockReturnValue("hidden");
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    expect(timers.size).toBe(0);
  });
  it("maps offset/scaled clicks into the element-sized DPR backing bitmap", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <FireworksBackground
        ref={ref}
        population={0}
        color='#123456'
        fireworkSpeed={4}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
    });
    const canvas = ref.current?.querySelector("canvas");
    expect(canvas).toHaveAttribute("width", "400");
    expect(canvas).toHaveAttribute("height", "200");
    if (!ref.current) throw new Error("Missing fireworks root");
    context.moveTo.mockClear();
    fireEvent.click(screen.getByRole("button", {name: "Launch fireworks"}), {clientX: 150, clientY: 70, detail: 1});
    frame();
    expect(context.moveTo).toHaveBeenCalledWith(100, 196);
    expect(context.strokeStyle).toBe("#123456");
  });

  it("maps click target height as well as launch x when the canvas is offset and scaled", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <FireworksBackground
        ref={ref}
        population={0}
        fireworkSpeed={150}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
    });
    if (!ref.current) throw new Error("Missing root");
    context.arc.mockClear();
    fireEvent.click(screen.getByRole("button", {name: "Launch fireworks"}), {clientX: 150, clientY: 70, detail: 1});
    frame();
    expect(context.arc).not.toHaveBeenCalled();
    expect(context.moveTo.mock.calls[0]?.[0]).toBeCloseTo(100);
    expect(context.moveTo.mock.calls[0]?.[1]).toBe(50);
    frame();
    expect(context.arc).toHaveBeenCalled();
  });

  it("rebuilds on element resize, preserves children/canvas props, and forwards the div ref", () => {
    reduced = true;
    const ref = React.createRef<HTMLDivElement>();
    const {unmount} = render(
      <FireworksBackground
        ref={ref}
        className='custom'
        canvasProps={{className: "custom-canvas", title: "Canvas"}}>
        <img
          alt='Foreground'
          src='image.png'
        />
      </FireworksBackground>,
    );
    expect(ref.current).toHaveClass("custom");
    expect(screen.getByRole("img", {name: "Foreground"})).toBeInTheDocument();
    const canvas = ref.current?.querySelector("canvas");
    expect(canvas).toHaveClass("custom-canvas");
    expect(canvas).toHaveAttribute("aria-hidden", "true");
    expect(observers[0]?.observe).toHaveBeenCalledWith(canvas);
    act(() => {
      box = new DOMRect(100, 50, 300, 150);
      observers[0]?.resize();
    });
    expect(canvas).toHaveAttribute("width", "600");
    expect(canvas).toHaveAttribute("height", "300");
    expect(context.arc).toHaveBeenCalled();
    unmount();
    expect(observers[0]?.disconnect).toHaveBeenCalledOnce();
    expect(ref.current).toBeNull();
  });

  it("does not restart default physics on an unrelated rerender", () => {
    const {rerender} = render(<FireworksBackground title='first' />);
    act(() => {
      views[0]?.visibility(true);
    });
    const clears = context.clearRect.mock.calls.length;
    const launches = timers.size;
    rerender(<FireworksBackground title='second' />);
    expect(context.clearRect).toHaveBeenCalledTimes(clears);
    expect(timers.size).toBe(launches);
  });

  it("bounds click-created trails and paints real explosion particles", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {rerender} = render(
      <FireworksBackground
        ref={ref}
        population={0}
        fireworkSpeed={4}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
    });
    if (!ref.current) throw new Error("Missing root");
    for (let i = 0; i < 100; i += 1)
      fireEvent.click(screen.getByRole("button", {name: "Launch fireworks"}), {clientX: 150, clientY: 70, detail: 1});
    context.stroke.mockClear();
    frame();
    expect(context.stroke.mock.calls.length).toBeLessThanOrEqual(16);
    expect(context.stroke.mock.calls.length).toBeGreaterThan(0);
    rerender(
      <FireworksBackground
        ref={ref}
        population={0}
        fireworkSpeed={200}
        color='#abcdef'
      />,
    );
    fireEvent.click(screen.getByRole("button", {name: "Launch fireworks"}), {clientX: 150, clientY: 70, detail: 1});
    context.arc.mockClear();
    frame();
    expect(context.arc.mock.calls.length).toBeGreaterThanOrEqual(50);
    expect(context.arc.mock.calls.length).toBeLessThanOrEqual(150);
    expect(context.fillStyle).toBe("#abcdef");
    expect(context.globalAlpha).toBeLessThan(1);
  });

  it("pauses timers/RAF on a live preference change and guards stale work after cleanup", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {unmount} = render(
      <FireworksBackground
        ref={ref}
        loop
        motionPaused={false}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
    });
    expect(timers.size).toBe(1);
    const staleFrame = [...frames.values()][0];
    const staleLaunch = [...timers.values()][0];
    act(() => {
      reduced = true;
      media.dispatchEvent(new Event("change"));
    });
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    expect(timers.size).toBe(0);
    const clears = context.clearRect.mock.calls.length;
    const arcs = context.arc.mock.calls.length;
    act(() => {
      staleFrame?.(32);
      staleLaunch?.();
    });
    expect(context.clearRect).toHaveBeenCalledTimes(clears);
    expect(context.arc).toHaveBeenCalledTimes(arcs);
    expect(timers.size).toBe(0);
    act(() => {
      reduced = false;
      media.dispatchEvent(new Event("change"));
    });
    expect(timers.size).toBe(1);
    unmount();
    expect(timers.size).toBe(0);
    expect(frames.size).toBe(0);
  });

  it("keeps user launches available after automatic motion settles: frames run until the launch finishes, then idle", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <FireworksBackground
        ref={ref}
        fireworkSpeed={4}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
    });
    expect(ref.current).toHaveAttribute("data-motion", "running");
    settle();
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    expect(timers.size).toBe(0);
    expect(frames.size).toBe(0);
    const launch = screen.getByRole("button", {name: "Launch fireworks"});
    expect(launch).toBeEnabled();
    expect(launch).not.toHaveAttribute("aria-disabled");
    const now = vi.spyOn(performance, "now").mockReturnValue(10_000);
    context.moveTo.mockClear();
    fireEvent.click(launch, {clientX: 150, clientY: 70, detail: 1});
    expect(frames.size).toBe(1);
    const first = runUntilIdle();
    expect(context.moveTo).toHaveBeenCalledWith(100, 196);
    expect(first.rendered).toBeGreaterThan(40);
    expect(frames.size).toBe(0);
    expect(first.finalArcs).toBe(24);
    expect(timers.size).toBe(0);
    now.mockReturnValue(12_000);
    fireEvent.click(launch, {detail: 0});
    expect(frames.size).toBe(1);
    expect(runUntilIdle().rendered).toBeGreaterThan(40);
    expect(frames.size).toBe(0);
    expect(timers.size).toBe(0);
    expect(ref.current).toHaveAttribute("data-motion", "paused");
  });

  it("keeps population={0} click-only keyboard launches working after automatic motion settles", () => {
    render(
      <FireworksBackground
        population={0}
        fireworkSpeed={4}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
    });
    settle();
    context.moveTo.mockClear();
    fireEvent.click(screen.getByRole("button", {name: "Launch fireworks"}), {detail: 0});
    frame();
    expect(context.moveTo).toHaveBeenCalledWith(200, 196);
    runUntilIdle();
    expect(frames.size).toBe(0);
    expect(timers.size).toBe(0);
  });

  it("marks the launch control aria-disabled under motionPaused, reduced motion or a hidden document without moving focus", () => {
    const {rerender} = render(
      <FireworksBackground
        population={0}
        fireworkSpeed={4}
        loop
        motionPaused={false}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
    });
    const launch = screen.getByRole("button", {name: "Launch fireworks"});
    act(() => {
      launch.focus();
    });
    expect(launch).not.toHaveAttribute("aria-disabled");
    rerender(
      <FireworksBackground
        population={0}
        fireworkSpeed={4}
        loop
        motionPaused
      />,
    );
    expect(launch).toHaveAttribute("aria-disabled", "true");
    expect(launch).toBeEnabled();
    expect(launch).toHaveFocus();
    context.moveTo.mockClear();
    fireEvent.click(launch, {detail: 0});
    fireEvent.click(launch, {clientX: 150, clientY: 70, detail: 1});
    expect(frames.size).toBe(0);
    rerender(
      <FireworksBackground
        population={0}
        fireworkSpeed={4}
        loop
        motionPaused={false}
      />,
    );
    expect(launch).not.toHaveAttribute("aria-disabled");
    act(() => {
      reduced = true;
      media.dispatchEvent(new Event("change"));
    });
    expect(launch).toHaveAttribute("aria-disabled", "true");
    expect(launch).toHaveFocus();
    fireEvent.click(launch, {detail: 0});
    expect(frames.size).toBe(0);
    act(() => {
      reduced = false;
      media.dispatchEvent(new Event("change"));
    });
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(launch).toHaveAttribute("aria-disabled", "true");
    expect(launch).toHaveFocus();
    fireEvent.click(launch, {detail: 0});
    expect(frames.size).toBe(0);
    visibility.mockReturnValue("visible");
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(launch).not.toHaveAttribute("aria-disabled");
    fireEvent.click(launch, {detail: 0});
    frame();
    expect(context.moveTo).toHaveBeenCalledOnce();
    expect(context.moveTo).toHaveBeenCalledWith(200, 196);
  });

  it("gives the aria-disabled launch control visible disabled styling, including in forced colors", () => {
    const stylesheet = parse(readFileSync(join(import.meta.dirname, "fireworks-background.module.css"), "utf8"));
    const disabledDeclarations = (scope: string): Map<string, string> => {
      const declarations = new Map<string, string>();
      stylesheet.walkRules('.launch[aria-disabled="true"]', (rule) => {
        if ((rule.parent instanceof AtRule ? rule.parent.params : "root") !== scope) return;
        rule.walkDecls((declaration) => {
          declarations.set(declaration.prop, declaration.value);
        });
      });
      return declarations;
    };
    const base = disabledDeclarations("root");
    expect(base.get("opacity")).toBe("0.5");
    expect(base.get("cursor")).toBe("not-allowed");
    const forced = disabledDeclarations("(forced-colors: active)");
    expect(forced.get("color")).toBe("GrayText");
    expect(forced.get("border-color")).toBe("GrayText");
    expect(forced.get("opacity")).toBe("1");
  });

  it.each([
    {width: 0, height: 0},
    {width: -10, height: 50},
    {width: Number.NaN, height: 100},
    {width: 200, height: Number.POSITIVE_INFINITY},
  ])("mounts a box-less $width × $height canvas without throwing or drawing, then paints when measurable", ({width, height}) => {
    reduced = true;
    box = new DOMRect(100, 50, width, height);
    const ref = React.createRef<HTMLDivElement>();
    render(<FireworksBackground ref={ref} />);
    const canvas = ref.current?.querySelector("canvas");
    expect(canvas).not.toHaveAttribute("width");
    expect(context.clearRect).not.toHaveBeenCalled();
    expect(context.arc).not.toHaveBeenCalled();
    act(() => {
      box = new DOMRect(100, 50, 200, 100);
      observers.at(-1)?.resize();
    });
    expect(canvas).toHaveAttribute("width", "400");
    expect(canvas).toHaveAttribute("height", "200");
    expect(context.arc).toHaveBeenCalled();
  });

  it("idles launches and frames when a window or observer resize reports a lost box, then resumes on the next positive observation", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <FireworksBackground
        ref={ref}
        loop
        motionPaused={false}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
    });
    expect(timers.size).toBe(1);
    expect(frames.size).toBe(1);
    const canvas = ref.current?.querySelector("canvas");
    act(() => {
      box = new DOMRect(0, 0, 0, 0);
      globalThis.window.dispatchEvent(new Event("resize"));
    });
    expect(ref.current).toHaveAttribute("data-motion", "running");
    expect(timers.size).toBe(0);
    expect(frames.size).toBe(0);
    act(() => {
      observers.at(-1)?.resize();
    });
    expect(timers.size).toBe(0);
    expect(frames.size).toBe(0);
    expect(canvas).toHaveAttribute("width", "400");
    act(() => {
      box = new DOMRect(100, 50, 300, 150);
      observers.at(-1)?.resize();
    });
    expect(canvas).toHaveAttribute("width", "600");
    expect(canvas).toHaveAttribute("height", "300");
    expect(timers.size).toBe(1);
    expect(frames.size).toBe(1);
  });

  it("ignores launch presses on a box-less surface without throwing or spending the launch budget", () => {
    render(
      <FireworksBackground
        population={0}
        fireworkSpeed={4}
      />,
    );
    act(() => {
      views[0]?.visibility(true);
    });
    const launch = screen.getByRole("button", {name: "Launch fireworks"});
    context.moveTo.mockClear();
    box = new DOMRect(0, 0, 0, 0);
    fireEvent.click(launch, {clientX: 150, clientY: 70, detail: 1});
    act(() => {
      observers.at(-1)?.resize();
    });
    box = new DOMRect(100, 50, 200, 100);
    fireEvent.click(launch, {detail: 0});
    frame();
    expect(context.moveTo).not.toHaveBeenCalled();
    act(() => {
      observers.at(-1)?.resize();
    });
    fireEvent.click(launch, {clientX: 150, clientY: 70, detail: 1});
    frame();
    expect(context.moveTo).toHaveBeenCalledWith(100, 196);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])("falls back to a 1x backing bitmap for devicePixelRatio %s", (dpr) => {
    Object.defineProperty(window, "devicePixelRatio", {configurable: true, value: dpr});
    const ref = React.createRef<HTMLDivElement>();
    render(<FireworksBackground ref={ref} />);
    const canvas = ref.current?.querySelector("canvas");
    expect(canvas).toHaveAttribute("width", "200");
    expect(canvas).toHaveAttribute("height", "100");
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1])("rejects invalid population %s", (population) => {
    expect(() => render(<FireworksBackground population={population} />)).toThrow(/population/u);
  });
  it("rejects invalid ranges, an empty palette and a missing rendering context", () => {
    expect(() => render(<FireworksBackground fireworkSpeed={{min: 4, max: 2}} />)).toThrow(/range/u);
    expect(() => render(<FireworksBackground color={[]} />)).toThrow(/palette/u);
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: (): CanvasRenderingContext2D | null => null,
    });
    expect(() => render(<FireworksBackground />)).toThrow(/2D/u);
  });
});
