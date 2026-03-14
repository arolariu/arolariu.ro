import * as React from "react";

import {render, screen} from "@testing-library/react";
import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";

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

import {FireworksBackground} from "./fireworks-background";

type MockCanvasContext = {
  arc: ReturnType<typeof vi.fn>;
  beginPath: ReturnType<typeof vi.fn>;
  clearRect: ReturnType<typeof vi.fn>;
  clip: ReturnType<typeof vi.fn>;
  closePath: ReturnType<typeof vi.fn>;
  createLinearGradient: ReturnType<typeof vi.fn>;
  drawImage: ReturnType<typeof vi.fn>;
  ellipse: ReturnType<typeof vi.fn>;
  fill: ReturnType<typeof vi.fn>;
  fillRect: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
  isPointInPath: ReturnType<typeof vi.fn>;
  isPointInStroke: ReturnType<typeof vi.fn>;
  lineTo: ReturnType<typeof vi.fn>;
  moveTo: ReturnType<typeof vi.fn>;
  rect: ReturnType<typeof vi.fn>;
  restore: ReturnType<typeof vi.fn>;
  save: ReturnType<typeof vi.fn>;
  scale: ReturnType<typeof vi.fn>;
  stroke: ReturnType<typeof vi.fn>;
};

const mockCanvasContext: MockCanvasContext = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  clip: vi.fn(),
  closePath: vi.fn(),
  createLinearGradient: vi.fn(() => ({
    addColorStop: vi.fn(),
  })),
  drawImage: vi.fn(),
  ellipse: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(400),
  })),
  isPointInPath: vi.fn(() => false),
  isPointInStroke: vi.fn(() => false),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  rect: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  stroke: vi.fn(),
};

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => mockCanvasContext as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, "getBoundingClientRect").mockImplementation(
    () =>
      ({
        bottom: 120,
        height: 120,
        left: 0,
        right: 240,
        toJSON: () => ({}),
        top: 0,
        width: 240,
        x: 0,
        y: 0,
      }) as DOMRect,
  );
  vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 1);
  vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => undefined);

  if (!("Path2D" in globalThis)) {
    class MockPath2D {
      public ellipse(): void {}

      public rect(): void {}
    }

    Object.assign(globalThis, {Path2D: MockPath2D});
  }
});

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

describe("FireworksBackground", () => {
  it("renders FireworksBackground with custom classes and forwarded refs", () => {
    // Arrange
    const fireworksRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <FireworksBackground
        ref={fireworksRef}
        className='fireworks-background-class'
        data-testid='fireworks-background'
      />,
    );

    // Assert
    const fireworksBackground = screen.getByTestId("fireworks-background");

    expect(fireworksBackground).toHaveClass("fireworks-background-class");
    expect(fireworksRef.current).toBe(fireworksBackground);
  });

  it("renders FireworksBackground with custom particleCount", () => {
    // Act
    render(
      <FireworksBackground
        population={2}
        data-testid='fireworks-custom'
      />,
    );

    // Assert
    const fireworks = screen.getByTestId("fireworks-custom");

    expect(fireworks).toBeInTheDocument();
  });

  it("renders FireworksBackground with custom colors", () => {
    // Act
    render(
      <FireworksBackground
        color={["#FF0000", "#00FF00", "#0000FF"]}
        data-testid='fireworks-colors'
      />,
    );

    // Assert
    const fireworks = screen.getByTestId("fireworks-colors");

    expect(fireworks).toBeInTheDocument();
  });

  it("renders FireworksBackground with single color string", () => {
    // Act
    render(
      <FireworksBackground
        color='#FF0000'
        data-testid='fireworks-single-color'
      />,
    );

    // Assert
    const fireworks = screen.getByTestId("fireworks-single-color");

    expect(fireworks).toBeInTheDocument();
  });

  it("renders FireworksBackground with custom speed and size ranges", () => {
    // Act
    render(
      <FireworksBackground
        fireworkSpeed={{min: 3, max: 6}}
        fireworkSize={{min: 1, max: 3}}
        particleSpeed={{min: 1, max: 5}}
        particleSize={{min: 1, max: 3}}
        data-testid='fireworks-ranges'
      />,
    );

    // Assert
    const fireworks = screen.getByTestId("fireworks-ranges");

    expect(fireworks).toBeInTheDocument();
  });

  it("renders FireworksBackground with number values instead of ranges", () => {
    // Act
    render(
      <FireworksBackground
        fireworkSpeed={5}
        fireworkSize={3}
        particleSpeed={4}
        particleSize={2}
        data-testid='fireworks-numbers'
      />,
    );

    // Assert
    const fireworks = screen.getByTestId("fireworks-numbers");

    expect(fireworks).toBeInTheDocument();
  });

  it("renders FireworksBackground canvas element", () => {
    // Act
    render(<FireworksBackground data-testid='fireworks-canvas' />);

    // Assert
    const fireworks = screen.getByTestId("fireworks-canvas");
    const canvas = fireworks.querySelector("canvas");

    expect(canvas).toBeInTheDocument();
    expect(canvas?.tagName).toBe("CANVAS");
  });

  it("renders FireworksBackground with canvasProps", () => {
    // Act
    render(
      <FireworksBackground
        canvasProps={{className: "custom-canvas-class"}}
        data-testid='fireworks-canvas-props'
      />,
    );

    // Assert
    const fireworks = screen.getByTestId("fireworks-canvas-props");
    const canvas = fireworks.querySelector("canvas");

    expect(canvas).toHaveClass("custom-canvas-class");
  });
});
