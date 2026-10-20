import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import {renderToString} from "react-dom/server";
import {hydrateRoot} from "react-dom/client";
import postcss from "postcss";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {transpileDeclaration} from "typescript";
import {act, fireEvent, render, screen} from "@testing-library/react";
import {composeStories} from "storybook-react-rsbuild";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {BackgroundBeams} from "./background-beams";
import {BubbleBackground} from "./bubble-background";
import {DotBackground} from "./dot-background";
import {FireworksBackground} from "./fireworks-background";
import {FlipButton} from "./flip-button";
import {GradientBackground} from "./gradient-background";
import {GradientText} from "./gradient-text";
import {HighlightText} from "./highlight-text";
import {HoleBackground} from "./hole-background";
import {RippleButton} from "./ripple-button";
import {Scratcher} from "./scratcher";
import {TypewriterText, TypewriterTextSmooth} from "./typewriter";
import {CountingNumber} from "./counting-number";
import * as bubbleStories from "./bubble-background.stories";
import * as gradientStories from "./gradient-text.stories";
import * as beamsStories from "./background-beams.stories";
import * as dotStories from "./dot-background.stories";
import * as fireworksStories from "./fireworks-background.stories";
import * as gradientBackgroundStories from "./gradient-background.stories";
import * as highlightStories from "./highlight-text.stories";
import * as holeStories from "./hole-background.stories";
import * as scratcherStories from "./scratcher.stories";
import {useReducedMotionPreference, useVisualEffectPolicy} from "./_visual-effects";

describe("motion option declaration contract", () => {
  it("retains the type required by public motion props when internal declarations are stripped", () => {
    const source = readFileSync(join(import.meta.dirname, "_visual-effects.tsx"), "utf8");
    const emitted = transpileDeclaration(source, {
      fileName: "_visual-effects.tsx",
      compilerOptions: {stripInternal: true, removeComments: true},
    });
    expect(emitted.diagnostics).toEqual([]);
    expect(emitted.outputText).toContain("export interface VisualEffectOptions");
    expect(emitted.outputText).toContain("readonly loop?: boolean");
    expect(emitted.outputText).toContain("readonly motionPaused?: boolean");
  });
});

let observers: ViewBoundary[] = [];
let frames: FrameRequestCallback[] = [];
let timers: TimerHandler[] = [];
let timerDelays: number[] = [];
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
  readonly root: IntersectionObserver["root"] = null;
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
  {
    name: "ripple-button",
    objects: (): void => checkObjectRefs<HTMLButtonElement>((ref) => <RippleButton ref={ref}>Activate</RippleButton>),
    callbacks: (): void => checkCallbackRefs<HTMLButtonElement>((ref) => <RippleButton ref={ref}>Activate</RippleButton>),
  },
  {
    name: "flip-button",
    objects: (): void =>
      checkObjectRefs<HTMLButtonElement>((ref) => (
        <FlipButton
          ref={ref}
          frontText='Show details'
          backText='Open details'
        />
      )),
    callbacks: (): void =>
      checkCallbackRefs<HTMLButtonElement>((ref) => (
        <FlipButton
          ref={ref}
          frontText='Show details'
          backText='Open details'
        />
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

function ReducedMotionProbe(): React.JSX.Element {
  const reducedMotion = useReducedMotionPreference();
  return (
    <div
      data-preference='reduced-motion'
      data-reduced={reducedMotion}
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
  timerDelays = [];
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
  vi.stubGlobal("setTimeout", (callback: TimerHandler, delay?: number): number => {
    timers.push(callback);
    timerDelays.push(delay ?? 0);
    return ++nextId;
  });
  vi.spyOn(window, "clearTimeout").mockImplementation(() => undefined);
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("visual effect policy consumer contracts", () => {
  it.each(families.filter(({name}) => name !== "scratcher"))(
    "$name settles automatic motion within five seconds, not just when offscreen",
    ({render: renderFamily}) => {
      const {container} = render(renderFamily());
      act(() => {
        for (const observer of observers) if (observer.target) observer.notify(true);
      });
      expect(container.querySelector("[data-motion]")).toHaveAttribute("data-motion", "running");
      const settle = timers.find((callback) => typeof callback === "function" && callback.name === "settleMotion");
      expect(settle).toBeTypeOf("function");
      expect(timerDelays[timers.findIndex((callback) => callback === settle)]).toBe(5000);
      act(() => {
        if (typeof settle === "function") settle();
      });
      expect(container.querySelector("[data-motion]")).toHaveAttribute("data-motion", "paused");
    },
  );

  it.each(families.filter(({name}) => name !== "scratcher"))(
    "$name honors controlled pause/resume during intentional loops",
    ({render: renderFamily}) => {
      const {container, rerender} = render(React.cloneElement(renderFamily(), {loop: true, motionPaused: false}));
      act(() => {
        for (const observer of observers) if (observer.target) observer.notify(true);
      });
      expect(container.querySelector("[data-motion]")).toHaveAttribute("data-motion", "running");
      expect(timers.filter((callback) => typeof callback === "function" && callback.name === "settleMotion")).toHaveLength(0);
      rerender(React.cloneElement(renderFamily(), {loop: true, motionPaused: true}));
      expect(container.querySelector("[data-motion]")).toHaveAttribute("data-motion", "paused");
      rerender(React.cloneElement(renderFamily(), {loop: true, motionPaused: false}));
      expect(container.querySelector("[data-motion]")).toHaveAttribute("data-motion", "running");
    },
  );

  it.each([TypewriterText, TypewriterTextSmooth])("settles the entire typewriter phrase and cursor, including long text", (Component) => {
    const {container} = render(<Component words={[{text: "A".repeat(100)}]} />);
    act(() => {
      for (const observer of observers) if (observer.target) observer.notify(true);
    });
    expect(container.querySelector('[data-slot="typewriter-cursor"]')).not.toBeNull();
    const settle = timers.find((callback) => typeof callback === "function" && callback.name === "settleMotion");
    act(() => {
      if (typeof settle === "function") settle();
    });
    expect(container.firstElementChild).toHaveAttribute("data-motion", "completed");
    expect(container.querySelector('[data-slot="typewriter-cursor"]')).toBeNull();
    expect(container.querySelector('[data-slot="typewriter-visual"]')).toHaveTextContent("A".repeat(100));
  });

  it("keeps the final number accessible immediately while the visual count is decorative", () => {
    render(
      <CountingNumber
        number={100}
        fromNumber={0}
        inView
      />,
    );
    expect(screen.getByText("100").closest('[aria-hidden="true"]')).toBeNull();
    expect(screen.getByText("0")).toHaveAttribute("aria-hidden", "true");
  });

  it("settles a slow real numeric spring at its final value and keeps later targets readable", () => {
    const {container, rerender} = render(
      <CountingNumber
        number={100}
        fromNumber={0}
        transition={{stiffness: 1, damping: 1}}
      />,
    );
    act(() => {
      for (const observer of observers) if (observer.target) observer.notify(true);
    });
    const settle = timers.find((callback) => typeof callback === "function" && callback.name === "settleMotion");
    expect(settle).toBeTypeOf("function");
    act(() => {
      if (typeof settle === "function") settle();
    });
    expect(container.querySelector('[data-slot="counting-number-visual"]')).toHaveTextContent(/^100$/);
    rerender(
      <CountingNumber
        number={200}
        fromNumber={0}
        transition={{stiffness: 1, damping: 1}}
      />,
    );
    expect(container.querySelector('[data-slot="counting-number-visual"]')).toHaveTextContent(/^200$/);
  });

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

  describe("private reduced-motion-only preference", () => {
    it("tracks the live preference without a viewport observer, visibility listener or settle timer, and unsubscribes", () => {
      const addDocumentListener = vi.spyOn(document, "addEventListener");
      const removeMediaListener = vi.spyOn(media, "removeEventListener");
      try {
        const {container, unmount} = render(<ReducedMotionProbe />);
        const probe = container.querySelector("[data-preference]");
        expect(probe).toHaveAttribute("data-reduced", "false");
        act(() => {
          reduced = true;
          media.dispatchEvent(new Event("change"));
        });
        expect(probe).toHaveAttribute("data-reduced", "true");
        expect(observers).toHaveLength(0);
        expect(timers.filter((callback) => typeof callback === "function" && callback.name === "settleMotion")).toHaveLength(0);
        expect(addDocumentListener.mock.calls.filter(([type]) => type === "visibilitychange")).toHaveLength(0);
        unmount();
        expect(removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
      } finally {
        addDocumentListener.mockRestore();
      }
    });
    it("hydrates from the conservative server snapshot without a mismatch, then applies the live preference", async () => {
      const html = renderToString(<ReducedMotionProbe />);
      expect(html).toContain('data-reduced="true"');
      const container = document.createElement("div");
      container.innerHTML = html;
      document.body.append(container);
      const consoleErrors = vi.spyOn(console, "error").mockImplementation(() => undefined);
      const recoverableErrors = vi.fn();
      let root: ReturnType<typeof hydrateRoot> | undefined;
      try {
        await act(async () => {
          root = hydrateRoot(container, <ReducedMotionProbe />, {onRecoverableError: recoverableErrors});
        });
        expect(container.querySelector("[data-preference]")).toHaveAttribute("data-reduced", "false");
        expect(recoverableErrors).not.toHaveBeenCalled();
        expect(consoleErrors).not.toHaveBeenCalled();
        expect(observers).toHaveLength(0);
      } finally {
        act(() => {
          root?.unmount();
        });
        container.remove();
        consoleErrors.mockRestore();
      }
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
  const storyFamilies = [
    {name: "background-beams", Story: composeStories(beamsStories).Default},
    {name: "bubble-background", Story: composeStories(bubbleStories).Default},
    {name: "dot-background", Story: composeStories(dotStories).Default},
    {name: "fireworks-background", Story: composeStories(fireworksStories).Default},
    {name: "gradient-background", Story: composeStories(gradientBackgroundStories).Default},
    {name: "gradient-text", Story: composeStories(gradientStories).Default},
    {name: "highlight-text", Story: composeStories(highlightStories).Default},
    {name: "hole-background", Story: composeStories(holeStories).Default},
    {name: "scratcher", Story: composeStories(scratcherStories).Default},
  ];
  it.each(storyFamilies)("$name's general demo layout is unconditional, not nested in forced colors", ({name, Story}) => {
    const {container, unmount} = render(<Story />);
    const sheet = container.querySelector("style");
    if (!sheet?.textContent) throw new Error("Expected the mounted story stylesheet");
    const css = postcss.parse(sheet.textContent);
    const generalRules: postcss.Rule[] = [];
    css.walkRules((rule) => {
      if (
        rule.selectors.some((selector) =>
          new RegExp(`^\\.ac-story-${name}-(?:demo(?:Content|Pair|Prize|Heading|FullScreen|Lead)?|resizableDemo)$`, "u").test(selector),
        )
      ) {
        generalRules.push(rule);
      }
    });
    expect(generalRules.length).toBeGreaterThan(0);
    for (const rule of generalRules) expect(rule.parent?.type, rule.selector).toBe("root");
    expect(container.querySelector(`[class*="ac-story-${name}-"]`)).not.toBeNull();
    unmount();
    expect(sheet.isConnected).toBe(false);
  });
  it("uses CSS classes rather than fixed inline opacity in authored palette/gradient stories", () => {
    expect(bubbleStories.CustomColors.args?.style).toBeUndefined();
    expect(gradientStories.CustomGradient.args?.style).toBeUndefined();
    expect(bubbleStories.CustomColors.args?.className).toBeTruthy();
    expect(gradientStories.CustomGradient.args?.className).toBeTruthy();
  });

  it.each([
    {Story: composeStories(beamsStories).ControlledLoop, label: /Pause beams/u},
    {Story: composeStories(bubbleStories).ControlledLoop, label: /Pause bubbles/u},
    {Story: composeStories(dotStories).ControlledLoop, label: /Pause glow/u},
    {Story: composeStories(fireworksStories).ControlledLoop, label: /Pause fireworks/u},
    {Story: composeStories(gradientBackgroundStories).ControlledLoop, label: /Pause gradient/u},
    {Story: composeStories(gradientStories).ControlledLoop, label: /Pause text motion/u},
    {Story: composeStories(highlightStories).ControlledLoop, label: /Pause highlight/u},
    {Story: composeStories(holeStories).ControlledLoop, label: /Pause tunnel/u},
  ])("runs an actual controlled-loop story with an operable pause button", ({Story, label}) => {
    const {container} = render(<Story />);
    act(() => {
      for (const observer of observers) if (observer.target) observer.notify(true);
    });
    expect(container.querySelector("[data-motion]")).toHaveAttribute("data-motion", "running");
    const control = screen.getByRole("button", {name: label});
    expect(control.tagName).toBe("BUTTON");
    fireEvent.click(control);
    expect(container.querySelector("[data-motion]")).toHaveAttribute("data-motion", "paused");
    expect(screen.getByRole("button", {name: /Resume/u})).toBeInTheDocument();
  });
});
