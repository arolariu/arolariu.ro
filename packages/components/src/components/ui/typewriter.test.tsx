import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import {act, cleanup, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {TypewriterText, TypewriterTextSmooth} from "./typewriter";

let reduced = false;
let media: MediaQueryList;
let matchesDescriptor: PropertyDescriptor | undefined;
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
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    observed.push(this);
  }
  observe(target: Element): void {
    this.target = target;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  enter(): void {
    if (!this.target) throw new Error("Missing observed element");
    const rect = this.target.getBoundingClientRect();
    this.callback(
      [
        {
          target: this.target,
          isIntersecting: true,
          intersectionRatio: 1,
          boundingClientRect: rect,
          intersectionRect: rect,
          rootBounds: null,
          time: performance.now(),
        },
      ],
      this,
    );
  }
}
const animateDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
beforeEach(() => {
  reduced = false;
  observed = [];
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  matchesDescriptor = Object.getOwnPropertyDescriptor(media, "matches");
  Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  vi.stubGlobal("IntersectionObserver", ViewBoundary);
  vi.stubGlobal("EventTarget", DOMEventTarget);
  Object.defineProperty(Element.prototype, "animate", {configurable: true, value: undefined});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (matchesDescriptor) Object.defineProperty(media, "matches", matchesDescriptor);
  else Reflect.deleteProperty(media, "matches");
  if (animateDescriptor) Object.defineProperty(Element.prototype, "animate", animateDescriptor);
  else Reflect.deleteProperty(Element.prototype, "animate");
});

describe.each([TypewriterText, TypewriterTextSmooth])("Typewriter accessible full text", (Component) => {
  it("provides complete readable text before visual reveal and preserves root accessibility props and ref", () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Component
        ref={ref}
        words={[{text: "Hello"}, {text: "world"}]}
        aria-label='Greeting'
        role='group'
        data-testid='typing'
      />,
    );
    expect(ref.current).toBe(screen.getByRole("group", {name: "Greeting"}));
    const text = screen.getByText("Hello world");
    expect(text.closest('[aria-hidden="true"]')).toBeNull();
    expect(screen.getByTestId("typing").querySelector('[data-slot="typewriter-visual"]')).toHaveAttribute("aria-hidden", "true");
  });

  it("completes the visual text and stops the cursor on a live reduced-motion change", () => {
    render(
      <Component
        words={[{text: "Hello"}, {text: "world"}]}
        data-testid='typing'
      />,
    );
    expect(screen.getByTestId("typing")).toHaveAttribute("data-motion", "running");
    act(() => {
      reduced = true;
      media.dispatchEvent(new MediaQueryListEvent("change", {matches: true}));
    });
    expect(screen.getByTestId("typing")).toHaveAttribute("data-motion", "completed");
    expect(screen.getByTestId("typing").querySelector('[data-slot="typewriter-cursor"]')).not.toBeInTheDocument();
    expect(screen.getByTestId("typing").querySelector('[data-slot="typewriter-visual"]')).not.toHaveAttribute("style");
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("updates the stable accessible phrase for changed words including empty words", () => {
    reduced = true;
    const {rerender} = render(
      <Component
        words={[{text: "Before"}]}
        data-testid='typing'
      />,
    );
    expect(screen.getByText("Before", {selector: '[data-slot="typewriter-text"]'})).toBeInTheDocument();
    rerender(
      <Component
        words={[{text: "After"}, {text: "change"}]}
        data-testid='typing'
      />,
    );
    expect(screen.getByText("After change")).toBeInTheDocument();
    expect(screen.queryByText("Before", {selector: '[data-slot="typewriter-text"]'})).not.toBeInTheDocument();
    expect(screen.getByTestId("typing")).toHaveAttribute("data-motion", "completed");
    rerender(
      <Component
        words={[]}
        data-testid='typing'
      />,
    );
    expect(screen.getByTestId("typing")).toBeEmptyDOMElement();
  });
});

describe("Typewriter viewport lifecycle with real Motion", () => {
  it("observes an initially empty root so later words can reveal", () => {
    const {rerender, unmount} = render(
      <TypewriterText
        words={[]}
        data-testid='typing'
      />,
    );
    expect(observed.some((observer) => observer.target === screen.getByTestId("typing"))).toBe(true);
    rerender(
      <TypewriterText
        words={[{text: "Later"}]}
        data-testid='typing'
      />,
    );
    act(() => {
      observed.forEach((observer) => observer.enter());
    });
    expect(screen.getByText("Later", {selector: '[data-slot="typewriter-text"]'})).toBeInTheDocument();
    unmount();
    expect(observed.every((observer) => observer.disconnect.mock.calls.length > 0)).toBe(true);
  });
});
