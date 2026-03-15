import * as React from "react";

import {act, render, screen, waitFor} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("motion/react", async () => {
  const ReactModule = await import("react");

  type MotionValue = {
    get: () => number;
    on: (event: "change", listener: (latest: number) => void) => () => void;
    set: (value: number) => void;
  };

  function createMotionValue(initialValue: number): MotionValue {
    let currentValue = initialValue;
    const listeners = new Set<(latest: number) => void>();

    return {
      get: () => currentValue,
      on: (_event, listener) => {
        listeners.add(listener);
        listener(currentValue);

        return () => {
          listeners.delete(listener);
        };
      },
      set: (value) => {
        currentValue = value;

        for (const listener of listeners) {
          listener(value);
        }
      },
    };
  }

  function createMotionPrimitive<TTag extends keyof React.JSX.IntrinsicElements>(tag: TTag) {
    return ReactModule.forwardRef<Element, React.HTMLAttributes<HTMLElement> & React.SVGProps<SVGElement>>(({children, ...props}, ref) => {
      const {
        animate: _animate,
        initial: _initial,
        transition: _transition,
        variants: _variants,
        whileHover: _whileHover,
        whileInView: _whileInView,
        whileTap: _whileTap,
        ...domProps
      } = props as React.HTMLAttributes<HTMLElement>
        & React.SVGProps<SVGElement> & {
          animate?: unknown;
          initial?: unknown;
          transition?: unknown;
          variants?: unknown;
          whileHover?: unknown;
          whileInView?: unknown;
          whileTap?: unknown;
        };

      return ReactModule.createElement(tag, {...domProps, ref}, children);
    });
  }

  return {
    motion: {
      button: createMotionPrimitive("button"),
      circle: createMotionPrimitive("circle"),
      div: createMotionPrimitive("div"),
      linearGradient: createMotionPrimitive("linearGradient"),
      path: createMotionPrimitive("path"),
      span: createMotionPrimitive("span"),
    },
    stagger: vi.fn(() => 0),
    useAnimate: () => {
      const scope = ReactModule.useRef<HTMLDivElement | null>(null);
      const animate = vi.fn(async () => undefined);

      return [scope, animate] as const;
    },
    useAnimation: () => ({
      start: vi.fn(async () => undefined),
    }),
    useInView: vi.fn(() => true),
    useMotionValue: (initialValue: number) => ReactModule.useMemo(() => createMotionValue(initialValue), [initialValue]),
    useSpring: <TValue,>(value: TValue) => value,
  };
});

import {DotBackground} from "./dot-background";

beforeEach(() => {
  Object.defineProperty(globalThis.HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    value: 120,
  });
  Object.defineProperty(globalThis.HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    value: 240,
  });
});

describe("DotBackground", () => {
  it("renders DotBackground with a custom class, forwarded ref, and generated dots", async () => {
    // Arrange
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockReturnValue({
      bottom: 16,
      height: 16,
      left: 0,
      right: 32,
      top: 0,
      width: 32,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const ref = {current: null as SVGSVGElement | null};

    // Act
    render(
      <DotBackground
        ref={ref}
        className='dot-background-class'
        data-testid='dot-background'
      />,
    );

    // Assert
    const dotBackground = screen.getByTestId("dot-background");

    await waitFor(() => {
      expect(dotBackground.querySelectorAll("circle")).toHaveLength(2);
    });

    expect(dotBackground).toHaveClass("dot-background-class");
    expect(ref.current).toBe(dotBackground);
    for (const circle of dotBackground.querySelectorAll("circle")) {
      expect(circle).toHaveAttribute("fill", "currentColor");
    }
  });

  it("renders glowing dots, forwards callback refs, and updates on resize", async () => {
    // Arrange
    vi.spyOn(Math, "random").mockReturnValue(0.25);

    let currentWidth = 16;
    const callbackRef = vi.fn();

    vi.spyOn(SVGElement.prototype, "getBoundingClientRect").mockImplementation(() => ({
      bottom: 16,
      height: 16,
      left: 0,
      right: currentWidth,
      top: 0,
      width: currentWidth,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }));

    render(
      <DotBackground
        glow
        ref={callbackRef}
        data-testid='glowing-dot-background'
      />,
    );

    const dotBackground = screen.getByTestId("glowing-dot-background");

    await waitFor(() => {
      expect(dotBackground.querySelectorAll("circle")).toHaveLength(1);
    });

    currentWidth = 32;

    // Act
    act(() => {
      globalThis.window.dispatchEvent(new Event("resize"));
    });

    // Assert
    await waitFor(() => {
      expect(dotBackground.querySelectorAll("circle")).toHaveLength(2);
    });

    expect(callbackRef).toHaveBeenCalledWith(dotBackground);
    for (const circle of dotBackground.querySelectorAll("circle")) {
      expect(circle.getAttribute("fill")).toMatch(/^url\(#.+-gradient\)$/u);
    }
  });
});
