import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import userEvent from "@testing-library/user-event";
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {Scratcher} from "./scratcher";

let box = new DOMRect(100, 50, 200, 100);
let reduced = true;
let media: MediaQueryList;
let observers: ResizeBoundary[] = [];
let views: ViewBoundary[] = [];
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
let cleared = 0;
const composites: string[] = [];
const context = {
  globalCompositeOperation: "source-over",
  fillStyle: "",
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(() => {
    composites.push(context.globalCompositeOperation);
  }),
  createLinearGradient: vi.fn(() => ({addColorStop: vi.fn()})),
  getImageData: vi.fn((_x: number, _y: number, width: number, height: number) => {
    const pixels = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i += 1) pixels[i * 4 + 3] = i < cleared ? 0 : 255;
    return {data: pixels, width, height, colorSpace: "srgb"};
  }),
};
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
function canvas(): HTMLCanvasElement {
  const element = document.querySelector("canvas");
  if (!element) throw new Error("Missing scratcher canvas");
  return element;
}
function gesture(): void {
  fireEvent.pointerDown(canvas(), {clientX: 150, clientY: 70, pointerId: 1, button: 0});
  fireEvent.pointerMove(document, {clientX: 150, clientY: 70, pointerId: 1});
  fireEvent.pointerUp(document, {pointerId: 1});
}
beforeEach(() => {
  reduced = true;
  box = new DOMRect(100, 50, 200, 100);
  observers = [];
  views = [];
  cleared = 0;
  composites.length = 0;
  context.globalCompositeOperation = "source-over";
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockImplementation(() => box);
  vi.spyOn(HTMLDivElement.prototype, "getBoundingClientRect").mockImplementation(() => box);
  Object.defineProperty(window, "devicePixelRatio", {configurable: true, value: 2});
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {configurable: true, value: () => context});
  vi.stubGlobal("ResizeObserver", ResizeBoundary);
  vi.stubGlobal("IntersectionObserver", ViewBoundary);
  vi.stubGlobal("EventTarget", DOMEventTarget);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Scratcher", () => {
  it("resets bitmap/completion generations without replacing the root, caller input, value or focus", () => {
    const ref = React.createRef<HTMLDivElement>();
    const child = (
      <input
        aria-label='Consumer value'
        defaultValue='Initial'
      />
    );
    const {rerender} = render(
      <Scratcher
        ref={ref}
        width={200}
        height={100}>
        {child}
      </Scratcher>,
    );
    const root = ref.current;
    const input = screen.getByRole("textbox", {name: "Consumer value"});
    fireEvent.change(input, {target: {value: "Entered"}});
    input.focus();
    const paints = context.fillRect.mock.calls.length;
    rerender(
      <Scratcher
        ref={ref}
        width={201}
        height={100}>
        {child}
      </Scratcher>,
    );
    expect(ref.current).toBe(root);
    expect(screen.getByRole("textbox", {name: "Consumer value"})).toBe(input);
    expect(input).toHaveValue("Entered");
    expect(input).toHaveFocus();
    expect(context.fillRect.mock.calls.length).toBeGreaterThan(paints);
    rerender(
      <Scratcher
        ref={ref}
        width={201}
        height={100}
        gradientColors={["red", "green", "blue"]}>
        {child}
      </Scratcher>,
    );
    expect(ref.current).toBe(root);
    expect(input).toHaveValue("Entered");
    expect(input).toHaveFocus();
    expect(ref.current).toHaveAttribute("data-state", "covered");
  });
  it.each(["[Enter]", "[Space]"])("activates native reveal by actual keyboard %s", async (key) => {
    const user = userEvent.setup();
    const complete = vi.fn();
    render(
      <Scratcher
        width={200}
        height={100}
        onComplete={complete}>
        Content
      </Scratcher>,
    );
    await user.tab();
    expect(screen.getByRole("button", {name: "Reveal content"})).toHaveFocus();
    await user.keyboard(key);
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", {name: "Reveal content"})).toBeDisabled();
  });
  it("uses the latest completion callback without resetting the painted surface", async () => {
    const original = vi.fn();
    const latest = vi.fn();
    const {rerender} = render(
      <Scratcher
        width={200}
        height={100}
        onComplete={original}>
        Prize
      </Scratcher>,
    );
    const paints = context.fillRect.mock.calls.length;
    rerender(
      <Scratcher
        width={200}
        height={100}
        onComplete={latest}>
        Prize
      </Scratcher>,
    );
    fireEvent.click(screen.getByRole("button", {name: "Reveal content"}));
    await waitFor(() => expect(latest).toHaveBeenCalledOnce());
    expect(original).not.toHaveBeenCalled();
    expect(context.fillRect).toHaveBeenCalledTimes(paints);
  });
  it("ignores unmatched/cancelled pointers and disconnects document subscriptions", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const {unmount} = render(
      <Scratcher
        width={200}
        height={100}>
        Content
      </Scratcher>,
    );
    fireEvent.pointerDown(canvas(), {clientX: 150, clientY: 70, pointerId: 1, button: 0});
    const scratches = context.arc.mock.calls.length;
    fireEvent.pointerMove(document, {clientX: 180, clientY: 80, pointerId: 2});
    fireEvent.pointerCancel(document, {pointerId: 1});
    fireEvent.pointerMove(document, {clientX: 180, clientY: 80, pointerId: 1});
    fireEvent.pointerUp(document, {pointerId: 1});
    expect(context.arc).toHaveBeenCalledTimes(scratches);
    expect(context.getImageData).not.toHaveBeenCalled();
    unmount();
    expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("pointercancel", expect.any(Function));
  });
  it("maps offset pointer input into the DPR bitmap without a magic coordinate offset", () => {
    render(
      <Scratcher
        width={200}
        height={100}>
        Content
      </Scratcher>,
    );
    gesture();
    expect(canvas().width).toBe(400);
    expect(canvas().height).toBe(200);
    expect(context.arc).toHaveBeenCalledWith(100, 40, 60, 0, Math.PI * 2);
    expect(context.globalCompositeOperation).toBe("destination-out");
  });

  it("resets dimensions/gradient and source-over paints the newly cleared bitmap", () => {
    const {rerender} = render(
      <Scratcher
        width={200}
        height={100}>
        Content
      </Scratcher>,
    );
    gesture();
    expect(context.globalCompositeOperation).toBe("destination-out");
    const paints = context.fillRect.mock.calls.length;
    box = new DOMRect(100, 50, 300, 150);
    rerender(
      <Scratcher
        width={300}
        height={150}
        gradientColors={["red", "green", "blue"]}>
        Content
      </Scratcher>,
    );
    expect(canvas().width).toBe(600);
    expect(canvas().height).toBe(300);
    expect(context.fillRect.mock.calls.length).toBeGreaterThan(paints);
    expect(composites.every((composite) => composite === "source-over")).toBe(true);
    expect(context.globalCompositeOperation).toBe("source-over");
  });

  it("responds to element/DPR resize without repaints on unrelated rerenders", () => {
    const {rerender} = render(
      <Scratcher
        width={200}
        height={100}>
        First
      </Scratcher>,
    );
    const paints = context.fillRect.mock.calls.length;
    rerender(
      <Scratcher
        width={200}
        height={100}>
        Second
      </Scratcher>,
    );
    expect(context.fillRect).toHaveBeenCalledTimes(paints);
    act(() => {
      box = new DOMRect(100, 50, 300, 150);
      observers[0]?.resize();
    });
    expect(canvas().width).toBe(600);
    expect(canvas().height).toBe(300);
    expect(context.globalCompositeOperation).toBe("source-over");
  });

  it("computes completion from alpha pixels only after an owned scratch and fires once", async () => {
    const complete = vi.fn();
    render(
      <Scratcher
        width={200}
        height={100}
        onComplete={complete}>
        Prize
      </Scratcher>,
    );
    fireEvent.pointerUp(document, {pointerId: 1});
    expect(context.getImageData).not.toHaveBeenCalled();
    cleared = 39999;
    gesture();
    expect(complete).not.toHaveBeenCalled();
    cleared = 40000;
    gesture();
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", {name: "Reveal content"})).toBeDisabled();
    gesture();
    expect(complete).toHaveBeenCalledOnce();
  });

  it("offers native keyboard reveal with equivalent completion while children remain accessible", async () => {
    const complete = vi.fn();
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Scratcher
        ref={ref}
        width={200}
        height={100}
        onComplete={complete}>
        <img
          alt='Prize'
          src='prize.png'
        />
      </Scratcher>,
    );
    expect(screen.getByRole("img", {name: "Prize"})).toBeInTheDocument();
    const reveal = screen.getByRole("button", {name: "Reveal content"});
    reveal.focus();
    expect(reveal).toHaveFocus();
    fireEvent.click(reveal);
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(ref.current).toHaveAttribute("data-state", "complete");
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 400, 200);
  });

  it("resets completion on dimension changes and does not let stale animation completion notify after reset/unmount", async () => {
    reduced = false;
    const complete = vi.fn();
    const {rerender, unmount} = render(
      <Scratcher
        width={200}
        height={100}
        onComplete={complete}>
        Prize
      </Scratcher>,
    );
    act(() => {
      views[0]?.enter();
    });
    fireEvent.click(screen.getByRole("button", {name: "Reveal content"}));
    rerender(
      <Scratcher
        width={201}
        height={100}
        onComplete={complete}>
        New prize
      </Scratcher>,
    );
    expect(screen.getByRole("button", {name: "Reveal content"})).toBeEnabled();
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 600);
    });
    expect(complete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", {name: "Reveal content"}));
    unmount();
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, 600);
    });
    expect(complete).not.toHaveBeenCalled();
    expect(observers.every((observer) => observer.disconnect.mock.calls.length === 1)).toBe(true);
  });

  it("finishes pending feedback exactly once on preference change instead of leaving stale completion", async () => {
    reduced = false;
    const complete = vi.fn();
    render(
      <Scratcher
        width={200}
        height={100}
        onComplete={complete}>
        Prize
      </Scratcher>,
    );
    act(() => {
      views[0]?.enter();
    });
    fireEvent.click(screen.getByRole("button", {name: "Reveal content"}));
    act(() => {
      reduced = true;
      media.dispatchEvent(new Event("change"));
    });
    await waitFor(() => expect(complete).toHaveBeenCalledOnce());
    expect(screen.getByRole("button", {name: "Reveal content"})).toBeDisabled();
  });

  it("mounts box-less without throwing or painting, then paints on the next positive observation", () => {
    box = new DOMRect(0, 0, 0, 0);
    render(
      <Scratcher
        width={200}
        height={100}>
        Content
      </Scratcher>,
    );
    expect(context.fillRect).not.toHaveBeenCalled();
    act(() => {
      box = new DOMRect(100, 50, 200, 100);
      observers[0]?.resize();
    });
    expect(canvas().width).toBe(400);
    expect(canvas().height).toBe(200);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 400, 200);
  });

  it("keeps its scratched bitmap while box-less and repaints only when a later positive observation changes its size", () => {
    render(
      <Scratcher
        width={200}
        height={100}>
        Content
      </Scratcher>,
    );
    gesture();
    const paints = context.fillRect.mock.calls.length;
    act(() => {
      box = new DOMRect(0, 0, 0, 0);
      globalThis.window.dispatchEvent(new Event("resize"));
      observers[0]?.resize();
    });
    expect(canvas().width).toBe(400);
    act(() => {
      box = new DOMRect(100, 50, 200, 100);
      observers[0]?.resize();
    });
    expect(context.fillRect).toHaveBeenCalledTimes(paints);
    act(() => {
      box = new DOMRect(100, 50, 300, 150);
      observers[0]?.resize();
    });
    expect(canvas().width).toBe(600);
    expect(canvas().height).toBe(300);
    expect(context.fillRect.mock.calls.length).toBeGreaterThan(paints);
  });

  it("ignores pointer moves after the surface loses its box mid-gesture without throwing", () => {
    render(
      <Scratcher
        width={200}
        height={100}>
        Content
      </Scratcher>,
    );
    fireEvent.pointerDown(canvas(), {clientX: 150, clientY: 70, pointerId: 1, button: 0});
    expect(context.arc).toHaveBeenCalledOnce();
    box = new DOMRect(0, 0, 0, 0);
    fireEvent.pointerMove(document, {clientX: 160, clientY: 75, pointerId: 1});
    expect(context.arc).toHaveBeenCalledOnce();
    fireEvent.pointerUp(document, {pointerId: 1});
    expect(screen.getByRole("button", {name: "Reveal content"})).toBeEnabled();
  });

  it("ignores presses on a box-less surface without reporting an error, scratching or completing", () => {
    const complete = vi.fn();
    const errors: unknown[] = [];
    const capture = (event: ErrorEvent): void => {
      errors.push(event.error);
      event.preventDefault();
    };
    render(
      <Scratcher
        width={200}
        height={100}
        onComplete={complete}>
        Prize
      </Scratcher>,
    );
    box = new DOMRect(0, 0, 0, 0);
    cleared = 40000;
    globalThis.window.addEventListener("error", capture);
    try {
      fireEvent.pointerDown(canvas(), {clientX: 150, clientY: 70, pointerId: 1, button: 0});
    } finally {
      globalThis.window.removeEventListener("error", capture);
    }
    expect(errors).toEqual([]);
    fireEvent.pointerMove(document, {clientX: 160, clientY: 75, pointerId: 1});
    fireEvent.pointerUp(document, {pointerId: 1});
    expect(context.arc).not.toHaveBeenCalled();
    expect(context.getImageData).not.toHaveBeenCalled();
    expect(complete).not.toHaveBeenCalled();
    expect(screen.getByRole("button", {name: "Reveal content"})).toBeEnabled();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, 0, -1])("falls back to a 1x bitmap for devicePixelRatio %s", (dpr) => {
    Object.defineProperty(window, "devicePixelRatio", {configurable: true, value: dpr});
    render(
      <Scratcher
        width={200}
        height={100}>
        Content
      </Scratcher>,
    );
    expect(canvas().width).toBe(200);
    expect(canvas().height).toBe(100);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 200, 100);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid width %s", (width) => {
    expect(() =>
      render(
        <Scratcher
          width={width}
          height={100}>
          Content
        </Scratcher>,
      ),
    ).toThrow(/dimensions/u);
  });
  it("surfaces invalid thresholds, missing contexts and pixel-read failures", () => {
    expect(() =>
      render(
        <Scratcher
          width={200}
          height={100}
          minScratchPercentage={101}>
          Content
        </Scratcher>,
      ),
    ).toThrow(/percentage/u);
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: (): CanvasRenderingContext2D | null => null,
    });
    expect(() =>
      render(
        <Scratcher
          width={200}
          height={100}>
          Content
        </Scratcher>,
      ),
    ).toThrow(/2D/u);
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {configurable: true, value: () => context});
    render(
      <Scratcher
        width={200}
        height={100}>
        Content
      </Scratcher>,
    );
    context.getImageData.mockImplementationOnce(() => {
      throw new Error("pixel read failed");
    });
    expect(gesture).toThrow("pixel read failed");
  });
});
