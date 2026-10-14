import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import {act, cleanup, render, screen, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {CountingNumber} from "./counting-number";

let observed: ViewBoundary[] = [];
class ViewBoundary implements IntersectionObserver {
  readonly root: IntersectionObserver["root"] = null;
  readonly rootMargin = "0px";
  readonly scrollMargin = "0px";
  readonly thresholds = [0];
  readonly disconnect = vi.fn();
  readonly unobserve = vi.fn();
  readonly options: IntersectionObserverInit | undefined;
  target: Element | null = null;
  private readonly callback: IntersectionObserverCallback;
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
beforeEach(() => {
  observed = [];
  vi.stubGlobal("EventTarget", DOMEventTarget);
  vi.stubGlobal("IntersectionObserver", ViewBoundary);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("CountingNumber with real Motion", () => {
  it("preserves a real default count instead of jumping to the target before its first visible frame", async () => {
    render(
      <CountingNumber
        number={100}
        fromNumber={37}
        transition={{duration: 0}}
        data-testid='count'
      />,
    );
    const visual = screen.getByTestId("count").querySelector('[data-slot="counting-number-visual"]');
    expect(visual).toHaveTextContent(/^37$/);
    act(() => {
      observed.forEach((observer) => observer.enter());
    });
    await waitFor(() => expect(visual).toHaveTextContent(/^100$/));
  });

  it("renders nonzero fromNumber as the stable initial text while awaiting viewport entry", () => {
    render(
      <CountingNumber
        number={100}
        fromNumber={37}
        inView
        data-testid='count'
      />,
    );
    expect(screen.getByTestId("count").querySelector('[data-slot="counting-number-visual"]')).toHaveTextContent(/^37$/);
  });

  it("pads the magnitude without moving a negative sign into the digits", () => {
    render(
      <CountingNumber
        number={-123}
        fromNumber={-5.25}
        decimalPlaces={2}
        decimalSeparator=','
        padStart
        inView
        data-testid='count'
      />,
    );
    expect(screen.getByTestId("count").querySelector('[data-slot="counting-number-visual"]')).toHaveTextContent(/^-005,25$/);
  });

  it("preserves the actual span ref and caller accessibility attributes", () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(
      <CountingNumber
        ref={ref}
        number={10}
        inView
        className='caller'
        aria-label='Total'
        data-testid='count'
      />,
    );
    expect(ref.current).toBe(screen.getByTestId("count"));
    expect(ref.current).toHaveClass("caller");
    expect(ref.current).toHaveAttribute("aria-label", "Total");
  });

  it("renders the final formatted target through actual spring completion", async () => {
    render(
      <CountingNumber
        number={-123.45}
        fromNumber={-5}
        transition={{duration: 0}}
        decimalPlaces={2}
        decimalSeparator=','
        padStart
        data-testid='count'
      />,
    );
    act(() => {
      observed.forEach((observer) => observer.enter());
    });
    await waitFor(() =>
      expect(screen.getByTestId("count").querySelector('[data-slot="counting-number-visual"]')).toHaveTextContent(/^-123,45$/),
    );
  });

  it("preserves callback-ref cleanup when the actual span unmounts", () => {
    let node: HTMLSpanElement | null = null;
    let cleaned = false;
    const {unmount} = render(
      <CountingNumber
        ref={(element) => {
          node = element;
          return () => {
            cleaned = true;
            node = null;
          };
        }}
        number={10}
        inView
      />,
    );
    expect(node).toBeInstanceOf(HTMLSpanElement);
    unmount();
    expect(cleaned).toBe(true);
    expect(node).toBeNull();
  });

  it("uses actual viewport entry and follows target changes through real spring updates", async () => {
    const {rerender, unmount} = render(
      <CountingNumber
        number={50}
        fromNumber={37}
        inView
        inViewMargin='100px'
        transition={{duration: 0}}
        data-testid='count'
      />,
    );
    expect(screen.getByTestId("count").querySelector('[data-slot="counting-number-visual"]')).toHaveTextContent(/^37$/);
    expect(observed.some((observer) => observer.options?.rootMargin === "100px")).toBe(true);
    act(() => {
      observed.forEach((observer) => observer.enter());
    });
    await waitFor(() =>
      expect(screen.getByTestId("count").querySelector('[data-slot="counting-number-visual"]')).toHaveTextContent(/^50$/),
    );
    rerender(
      <CountingNumber
        number={75}
        fromNumber={37}
        inView
        inViewMargin='100px'
        transition={{duration: 0}}
        data-testid='count'
      />,
    );
    await waitFor(() =>
      expect(screen.getByTestId("count").querySelector('[data-slot="counting-number-visual"]')).toHaveTextContent(/^75$/),
    );
    unmount();
    expect(observed.every((observer) => observer.disconnect.mock.calls.length > 0)).toBe(true);
  });
});
