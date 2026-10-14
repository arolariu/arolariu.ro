import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import {renderToString} from "react-dom/server";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import postcss from "postcss";
import {act, render} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {BackgroundBeams} from "./background-beams";
import {BubbleBackground} from "./bubble-background";
import {DotBackground} from "./dot-background";
import {FireworksBackground} from "./fireworks-background";
import {GradientBackground} from "./gradient-background";
import {GradientText} from "./gradient-text";
import {HighlightText} from "./highlight-text";
import {HoleBackground} from "./hole-background";
import {Scratcher} from "./scratcher";
import * as bubbleStories from "./bubble-background.stories";
import * as gradientStories from "./gradient-text.stories";
import {useVisualEffectPolicy} from "./_visual-effects";

let observers: ViewBoundary[] = [];
let frames: FrameRequestCallback[] = [];
let timers: TimerHandler[] = [];
let nextId = 0;
let reduced = false;
let media: MediaQueryList;
const canvasContext = {
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  arc: vi.fn(),
  rect: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  clip: vi.fn(),
  scale: vi.fn(),
  drawImage: vi.fn(),
  isPointInPath: vi.fn(() => false),
  isPointInStroke: vi.fn(() => false),
  createLinearGradient: vi.fn(() => ({addColorStop: vi.fn()})),
};
class PathBoundary {
  readonly ellipse = vi.fn();
  readonly rect = vi.fn();
}
class ResizeBoundary implements ResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}
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
    observers.push(this);
  }
  observe(target: Element): void {
    this.target = target;
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  notify(isIntersecting: boolean): void {
    if (!this.target) throw new Error("Missing observed element");
    const rect = this.target.getBoundingClientRect();
    this.callback(
      [
        {
          target: this.target,
          boundingClientRect: rect,
          intersectionRect: rect,
          rootBounds: null,
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          time: 0,
        },
      ],
      this,
    );
  }
}

const families = [
  {name: "background-beams", render: (): React.JSX.Element => <BackgroundBeams />},
  {name: "bubble-background", render: (): React.JSX.Element => <BubbleBackground interactive />},
  {name: "dot-background", render: (): React.JSX.Element => <DotBackground glow />},
  {name: "fireworks-background", render: (): React.JSX.Element => <FireworksBackground />},
  {name: "gradient-background", render: (): React.JSX.Element => <GradientBackground />},
  {
    name: "gradient-text",
    render: (): React.JSX.Element => (
      <GradientText
        text='Gradient'
        neon
      />
    ),
  },
  {
    name: "highlight-text",
    render: (): React.JSX.Element => (
      <HighlightText
        text='Highlight'
        inView
        inViewOnce={false}
      />
    ),
  },
  {name: "hole-background", render: (): React.JSX.Element => <HoleBackground />},
  {
    name: "scratcher",
    render: (): React.JSX.Element => (
      <Scratcher
        width={200}
        height={100}>
        Content
      </Scratcher>
    ),
  },
] as const;
const motionRoots = [
  {
    name: "gradient-background",
    objects: (): void => checkObjectRefs<HTMLDivElement>((ref) => <GradientBackground ref={ref} />),
    callbacks: (): void => checkCallbackRefs<HTMLDivElement>((ref) => <GradientBackground ref={ref} />),
  },
  {
    name: "highlight-text",
    objects: (): void =>
      checkObjectRefs<HTMLSpanElement>((ref) => (
        <HighlightText
          text='Highlight'
          ref={ref}
        />
      )),
    callbacks: (): void =>
      checkCallbackRefs<HTMLSpanElement>((ref) => (
        <HighlightText
          text='Highlight'
          ref={ref}
        />
      )),
  },
  {
    name: "scratcher",
    objects: (): void =>
      checkObjectRefs<HTMLDivElement>((ref) => (
        <Scratcher
          width={200}
          height={100}
          ref={ref}>
          Content
        </Scratcher>
      )),
    callbacks: (): void =>
      checkCallbackRefs<HTMLDivElement>((ref) => (
        <Scratcher
          width={200}
          height={100}
          ref={ref}>
          Content
        </Scratcher>
      )),
  },
] as const;

function PolicyProbe(): React.JSX.Element {
  const ref = React.useRef<HTMLDivElement>(null);
  const {paused, visible, reducedMotion, documentHidden} = useVisualEffectPolicy(ref);
  return (
    <div
      ref={ref}
      data-policy='probe'
      data-paused={paused}
      data-visible={visible}
      data-reduced={reducedMotion}
      data-hidden={documentHidden}
    />
  );
}

function checkObjectRefs<T extends HTMLElement>(renderRoot: (ref: React.Ref<T>) => React.JSX.Element): void {
  const first = React.createRef<T>();
  const second = React.createRef<T>();
  const {rerender, unmount} = render(renderRoot(first));
  const node = first.current;
  expect(node).not.toBeNull();
  rerender(renderRoot(second));
  expect(first.current).toBeNull();
  expect(second.current).toBe(node);
  unmount();
  expect(second.current).toBeNull();
}

function checkCallbackRefs<T extends HTMLElement>(renderRoot: (ref: React.Ref<T>) => React.JSX.Element): void {
  const oldCleanup = vi.fn();
  const newCleanup = vi.fn();
  const oldRef = vi.fn<React.RefCallback<T>>(() => oldCleanup);
  const newRef = vi.fn<React.RefCallback<T>>(() => newCleanup);
  const {rerender, unmount} = render(renderRoot(oldRef));
  const node = oldRef.mock.calls[0]?.[0];
  rerender(renderRoot(newRef));
  expect(oldCleanup).toHaveBeenCalledOnce();
  expect(newRef).toHaveBeenCalledExactlyOnceWith(node);
  expect(oldRef).not.toHaveBeenCalledWith(null);
  unmount();
  expect(newCleanup).toHaveBeenCalledOnce();
  expect(newRef).not.toHaveBeenCalledWith(null);
}

beforeEach(() => {
  observers = [];
  frames = [];
  timers = [];
  nextId = 0;
  reduced = false;
  media = window.matchMedia("(prefers-reduced-motion: reduce)");
  Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
  vi.spyOn(window, "matchMedia").mockReturnValue(media);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 50, 200, 100));
  vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 50, 200, 100));
  Object.defineProperty(window, "devicePixelRatio", {configurable: true, value: 2});
  Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {configurable: true, value: () => canvasContext});
  vi.stubGlobal("EventTarget", DOMEventTarget);
  vi.stubGlobal("IntersectionObserver", ViewBoundary);
  vi.stubGlobal("ResizeObserver", ResizeBoundary);
  vi.stubGlobal("Path2D", PathBoundary);
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback);
    return ++nextId;
  });
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => undefined);
  vi.stubGlobal("setTimeout", (callback: TimerHandler): number => {
    timers.push(callback);
    return ++nextId;
  });
  vi.spyOn(window, "clearTimeout").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("visual effect policy consumer contracts", () => {
  it.each(families)("$name pauses on the first non-intersecting observation without first entering", ({render: renderFamily}) => {
    const {container} = render(renderFamily());
    expect(observers.some((observer) => observer.target !== null)).toBe(true);
    act(() => {
      for (const observer of observers) if (observer.target) observer.notify(false);
    });
    expect(container.querySelector("[data-motion]")).toHaveAttribute("data-motion", "paused");
    expect(frames.filter((callback) => callback.name === "animate")).toHaveLength(0);
    expect(timers.filter((callback) => typeof callback === "function" && callback.name === "launchFirework")).toHaveLength(0);
  });

  describe("private per-instance visual effect policy", () => {
    it("starts conservatively paused and keeps live reduced/visibility preferences separate", () => {
      const {container} = render(<PolicyProbe />);
      const probe = container.querySelector("[data-policy]");
      expect(probe).toHaveAttribute("data-paused", "true");
      expect(probe).toHaveAttribute("data-visible", "false");
      expect(probe).toHaveAttribute("data-reduced", "false");
      act(() => {
        observers[0]?.notify(false);
      });
      expect(probe).toHaveAttribute("data-paused", "true");
      act(() => {
        observers[0]?.notify(true);
      });
      expect(probe).toHaveAttribute("data-paused", "false");
      act(() => {
        reduced = true;
        media.dispatchEvent(new Event("change"));
      });
      expect(probe).toHaveAttribute("data-visible", "true");
      expect(probe).toHaveAttribute("data-reduced", "true");
      expect(probe).toHaveAttribute("data-paused", "true");
      const visibility = vi.spyOn(document, "visibilityState", "get");
      act(() => {
        reduced = false;
        media.dispatchEvent(new Event("change"));
        visibility.mockReturnValue("hidden");
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(probe).toHaveAttribute("data-reduced", "false");
      expect(probe).toHaveAttribute("data-hidden", "true");
      expect(probe).toHaveAttribute("data-paused", "true");
      act(() => {
        visibility.mockReturnValue("visible");
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(probe).toHaveAttribute("data-paused", "false");
    });
    it("disconnects owned platform subscriptions and ignores notifications after unmount", () => {
      const removeMedia = vi.spyOn(media, "removeEventListener");
      const removeDocument = vi.spyOn(document, "removeEventListener");
      const {unmount} = render(<PolicyProbe />);
      unmount();
      expect(observers[0]?.disconnect).toHaveBeenCalledOnce();
      expect(removeMedia).toHaveBeenCalledWith("change", expect.any(Function));
      expect(removeDocument).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
      act(() => {
        reduced = true;
        media.dispatchEvent(new Event("change"));
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(frames.filter((callback) => callback.name === "animate")).toHaveLength(0);
    });
    it("keeps a stable conservative server snapshot without creating native observers or timers", () => {
      const html = renderToString(<PolicyProbe />);
      expect(html).toContain('data-paused="true"');
      expect(html).toContain('data-visible="false"');
      expect(html).toContain('data-reduced="true"');
      expect(observers).toHaveLength(0);
      expect(timers).toHaveLength(0);
    });
  });

  it.each(motionRoots)("$name replaces object refs independently of Motion's stable DOM callback", ({objects}) => {
    objects();
  });

  it.each(motionRoots)("$name detaches/replaces callback refs and runs their cleanups once", ({callbacks}) => {
    callbacks();
  });
});

describe("normal-mode visual effect stories", () => {
  it.each(families)("$name's general demo layout is unconditional, not nested in forced colors", ({name}) => {
    const css = postcss.parse(readFileSync(join(import.meta.dirname, `${name}.module.css`), "utf8"));
    const generalRules: postcss.Rule[] = [];
    css.walkRules((rule) => {
      if (rule.selectors.some((selector) => /(?:\.demo(?:Content|Pair|Prize|Heading|FullScreen|Lead)?|\.resizableDemo)$/u.test(selector))) {
        generalRules.push(rule);
      }
    });
    expect(generalRules.length).toBeGreaterThan(0);
    for (const rule of generalRules) expect(rule.parent?.type, rule.selector).toBe("root");
  });
  it("uses CSS classes rather than fixed inline opacity in authored palette/gradient stories", () => {
    expect(bubbleStories.CustomColors.args?.style).toBeUndefined();
    expect(gradientStories.CustomGradient.args?.style).toBeUndefined();
    expect(bubbleStories.CustomColors.args?.className).toBeTruthy();
    expect(gradientStories.CustomGradient.args?.className).toBeTruthy();
  });
});
