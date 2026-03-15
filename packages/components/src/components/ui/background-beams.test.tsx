import * as React from "react";

import {render, screen} from "@testing-library/react";
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

import {BackgroundBeams} from "./background-beams";

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

describe("BackgroundBeams", () => {
  it("renders BackgroundBeams with custom classes and forwarded refs", () => {
    // Arrange
    const beamsRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <BackgroundBeams
        ref={beamsRef}
        className='background-beams-class'
        data-testid='background-beams'
      />,
    );

    // Assert
    const backgroundBeams = screen.getByTestId("background-beams");

    expect(backgroundBeams).toHaveClass("background-beams-class");
    expect(beamsRef.current).toBe(backgroundBeams);
  });
});
