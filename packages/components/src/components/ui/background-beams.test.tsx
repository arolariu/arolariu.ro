import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import {act, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {BackgroundBeams} from "./background-beams";

let reduced = true;
let media: MediaQueryList;
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

beforeEach(() => {
  reduced = true;
  views = [];
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 200, 100));
  vi.stubGlobal("IntersectionObserver", ViewBoundary);
  vi.stubGlobal("EventTarget", DOMEventTarget);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("BackgroundBeams", () => {
  it("preserves React callback-ref cleanup without unsafe forwarded-ref casts", () => {
    const cleanup = vi.fn();
    const callback: React.RefCallback<HTMLDivElement> = (): (() => void) => cleanup;
    const {unmount} = render(<BackgroundBeams ref={callback} />);
    unmount();
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it("scopes every SVG paint resource and preserves caller children and refs", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {container} = render(
      <>
        <BackgroundBeams
          ref={ref}
          className='custom'>
          Visible content
        </BackgroundBeams>
        <BackgroundBeams />
      </>,
    );
    expect(ref.current).toHaveClass("custom");
    expect(screen.getByText("Visible content")).toBeInTheDocument();
    const ids = [...container.querySelectorAll("svg [id]")].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("focusable", "false");
      for (const path of svg.querySelectorAll("path")) {
        const paint = path.getAttribute("stroke")?.match(/^url\(#(.+)\)$/u)?.[1];
        expect([...svg.querySelectorAll("[id]")].some((node) => node.id === paint)).toBe(true);
      }
    }
  });

  it("uses stable timings instead of rerandomizing each render", () => {
    const random = vi.spyOn(Math, "random");
    const {rerender, container} = render(<BackgroundBeams title='first' />);
    const gradient = container.querySelector("linearGradient");
    random.mockClear();
    rerender(<BackgroundBeams title='second' />);
    expect(random).not.toHaveBeenCalled();
    expect(container.querySelector("linearGradient")).toBe(gradient);
  });

  it("switches recurring Motion to static paint on live preference changes", () => {
    const ref = React.createRef<HTMLDivElement>();
    const {unmount} = render(<BackgroundBeams ref={ref} />);
    act(() => {
      views[0]?.enter();
    });
    expect(ref.current).toHaveAttribute("data-motion", "paused");
    expect(ref.current?.querySelector("linearGradient")).toHaveAttribute("x2", "95%");
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
    unmount();
    expect(ref.current).toBeNull();
  });
});
