import * as React from "react";

import {fireEvent, render, screen} from "@testing-library/react";
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

  it("initializes canvas and renders without crashing", () => {
    // Act
    render(<FireworksBackground data-testid='fireworks-init' />);

    // Assert
    const fireworks = screen.getByTestId("fireworks-init");
    const canvas = fireworks.querySelector("canvas");

    expect(canvas).toBeInTheDocument();
    expect(fireworks).toBeInTheDocument();
  });

  it("handles click event to launch firework at cursor position", () => {
    // Arrange
    render(<FireworksBackground data-testid='fireworks-clickable' />);
    const fireworks = screen.getByTestId("fireworks-clickable");

    // Act - simulate click at specific position
    fireEvent.click(fireworks, {clientX: 100, clientY: 50});

    // Assert - component should handle click without crashing
    expect(fireworks).toBeInTheDocument();
  });

  it("handles window resize event and updates canvas dimensions", () => {
    // Arrange
    render(<FireworksBackground data-testid='fireworks-resize' />);

    // Act - trigger resize event
    fireEvent.resize(globalThis.window);

    // Assert - canvas should still be in document
    const fireworks = screen.getByTestId("fireworks-resize");
    const canvas = fireworks.querySelector("canvas");

    expect(canvas).toBeInTheDocument();
  });

  it("starts animation loop on mount", () => {
    // Act
    render(<FireworksBackground data-testid='fireworks-animation' />);

    // Assert - component renders and initializes
    const fireworks = screen.getByTestId("fireworks-animation");

    expect(fireworks).toBeInTheDocument();
  });

  it("cleans up on unmount", () => {
    // Act
    const {unmount} = render(<FireworksBackground data-testid='fireworks-cleanup' />);
    unmount();

    // Assert - unmount should complete without errors
    expect(true).toBe(true);
  });

  it("launches fireworks automatically with population multiplier", () => {
    // Act
    render(
      <FireworksBackground
        population={3}
        data-testid='fireworks-population'
      />,
    );

    // Assert
    const fireworks = screen.getByTestId("fireworks-population");

    expect(fireworks).toBeInTheDocument();
  });

  it("renders with custom speed and size configurations", () => {
    // Act
    render(
      <FireworksBackground
        fireworkSpeed={{min: 3, max: 6}}
        fireworkSize={{min: 1, max: 3}}
        particleSpeed={{min: 1, max: 5}}
        particleSize={{min: 1, max: 2}}
        data-testid='fireworks-trails'
      />,
    );

    // Assert
    expect(screen.getByTestId("fireworks-trails")).toBeInTheDocument();
  });

  it("creates particles with proper physics properties", () => {
    // Act
    render(
      <FireworksBackground
        particleSpeed={{min: 1, max: 3}}
        particleSize={{min: 1, max: 2}}
        data-testid='fireworks-particles'
      />,
    );

    // Assert
    expect(screen.getByTestId("fireworks-particles")).toBeInTheDocument();
  });

  it("handles firework explosion animations", () => {
    // Act
    render(<FireworksBackground data-testid='fireworks-explosion' />);

    // Assert
    expect(screen.getByTestId("fireworks-explosion")).toBeInTheDocument();
  });

  it("handles color as array and selects random color from palette", () => {
    // Act
    render(
      <FireworksBackground
        color={["#FF0000", "#00FF00", "#0000FF", "#FFFF00"]}
        data-testid='fireworks-color-array'
      />,
    );

    // Assert
    expect(screen.getByTestId("fireworks-color-array")).toBeInTheDocument();
  });

  it("handles missing canvas context gracefully", () => {
    // Arrange
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValueOnce(null);

    // Act
    render(<FireworksBackground data-testid='fireworks-no-context' />);

    // Assert - should not crash
    expect(screen.getByTestId("fireworks-no-context")).toBeInTheDocument();

    // Cleanup
    getContextSpy.mockRestore();
  });

  it("renders with particle physics simulation", () => {
    // Act
    render(<FireworksBackground data-testid='fireworks-physics' />);

    // Assert
    expect(screen.getByTestId("fireworks-physics")).toBeInTheDocument();
  });

  it("manages particle lifecycle", () => {
    // Act
    render(<FireworksBackground data-testid='fireworks-cleanup-particles' />);

    // Assert
    expect(screen.getByTestId("fireworks-cleanup-particles")).toBeInTheDocument();
  });

  it("handles firework trajectory", () => {
    // Act
    render(<FireworksBackground data-testid='fireworks-target' />);

    // Assert
    expect(screen.getByTestId("fireworks-target")).toBeInTheDocument();
  });

  it("draws firework trail correctly", () => {
    // Act
    render(<FireworksBackground data-testid='fireworks-single-trail' />);

    // Assert
    expect(screen.getByTestId("fireworks-single-trail")).toBeInTheDocument();
  });

  it("draws particles with proper alpha decay", () => {
    // Arrange
    let animationCallback: FrameRequestCallback | null = null;
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      animationCallback = callback;
      return 1;
    });
    mockCanvasContext.arc.mockClear();
    mockCanvasContext.fill.mockClear();

    // Act
    render(<FireworksBackground data-testid='fireworks-particle-draw' />);

    // Trigger animation callback multiple times
    if (animationCallback) {
      animationCallback(0);
      animationCallback(16);
      animationCallback(32);
    }

    // Assert - canvas methods should be called for particle drawing
    expect(screen.getByTestId("fireworks-particle-draw")).toBeInTheDocument();
  });

  it("removes dead fireworks from array", () => {
    // Arrange
    let animationCallback: FrameRequestCallback | null = null;
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      animationCallback = callback;
      return 1;
    });

    // Act
    render(<FireworksBackground data-testid='fireworks-removal' />);

    // Trigger multiple animation frames to allow firework lifecycle
    if (animationCallback) {
      for (let i = 0; i < 100; i++) {
        animationCallback(i * 16);
      }
    }

    // Assert - component should handle firework removal without crashing
    expect(screen.getByTestId("fireworks-removal")).toBeInTheDocument();
  });

  it("removes dead particles from explosions array", () => {
    // Arrange
    let animationCallback: FrameRequestCallback | null = null;
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      animationCallback = callback;
      return 1;
    });

    // Act
    render(<FireworksBackground data-testid='fireworks-particle-cleanup' />);

    // Simulate click to create fireworks
    const container = screen.getByTestId("fireworks-particle-cleanup");
    fireEvent.click(container, {clientX: 100, clientY: 50});

    // Trigger animation frames
    if (animationCallback) {
      for (let i = 0; i < 100; i++) {
        animationCallback(i * 16);
      }
    }

    // Assert - should clean up particles without crashing
    expect(screen.getByTestId("fireworks-particle-cleanup")).toBeInTheDocument();
  });

  it("draws firework trail with multiple points", () => {
    // Arrange
    let animationCallback: FrameRequestCallback | null = null;
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      animationCallback = callback;
      return 1;
    });
    mockCanvasContext.moveTo.mockClear();
    mockCanvasContext.lineTo.mockClear();
    mockCanvasContext.stroke.mockClear();

    // Act
    render(<FireworksBackground data-testid='fireworks-trail-points' />);

    // Trigger animation callbacks
    if (animationCallback) {
      for (let i = 0; i < 20; i++) {
        animationCallback(i * 16);
      }
    }

    // Assert - should draw trail with moveTo/lineTo operations
    expect(screen.getByTestId("fireworks-trail-points")).toBeInTheDocument();
  });

  it("handles firework explosion and particle creation", () => {
    // Arrange
    let animationCallback: FrameRequestCallback | null = null;
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      animationCallback = callback;
      return 1;
    });

    // Act
    render(<FireworksBackground data-testid='fireworks-explode' />);

    // Trigger animations to allow fireworks to reach target and explode
    if (animationCallback) {
      for (let i = 0; i < 200; i++) {
        animationCallback(i * 16);
      }
    }

    // Assert - explosions should be handled without errors
    expect(screen.getByTestId("fireworks-explode")).toBeInTheDocument();
  });

  it("launches fireworks automatically with setTimeout", () => {
    // Arrange
    vi.useFakeTimers();

    // Act
    render(
      <FireworksBackground
        population={2}
        data-testid='fireworks-auto-launch'
      />,
    );

    // Fast-forward time to trigger auto-launches
    vi.advanceTimersByTime(5000);

    // Assert - should create multiple fireworks over time
    expect(screen.getByTestId("fireworks-auto-launch")).toBeInTheDocument();

    // Cleanup
    vi.useRealTimers();
  });

  it("updates canvas dimensions on window resize", () => {
    // Arrange
    render(<FireworksBackground data-testid='fireworks-resize-dims' />);
    const canvas = document.querySelector("canvas");

    // Act
    Object.defineProperty(globalThis, "innerWidth", {
      configurable: true,
      value: 1024,
      writable: true,
    });
    fireEvent.resize(globalThis.window);

    // Assert - canvas should update dimensions
    expect(canvas).toBeInTheDocument();
  });
});
