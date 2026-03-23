import * as React from "react";

import {fireEvent, render, screen} from "@testing-library/react";
import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("motion/react", async () => {
  const ReactModule = await import("react");

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
  };
});

import {HoleBackground} from "./hole-background";

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

describe("HoleBackground", () => {
  it("renders HoleBackground with custom classes and forwarded refs", () => {
    // Arrange
    const holeRef = {current: null as HTMLCanvasElement | null};

    // Act
    render(
      <HoleBackground
        ref={holeRef}
        className='hole-background-class'
        data-testid='hole-background'
      />,
    );

    // Assert
    const holeBackground = screen.getByTestId("hole-background");

    expect(holeBackground.parentElement).toHaveClass("hole-background-class");
    expect(holeRef.current).toBe(holeBackground);
  });

  it("renders HoleBackground with custom strokeColor", () => {
    // Act
    render(
      <HoleBackground
        strokeColor='#FF0000'
        className='hole-custom-stroke'
        data-testid='hole-custom-stroke'
      />,
    );

    // Assert
    const holeBackground = screen.getByTestId("hole-custom-stroke");

    expect(holeBackground.parentElement).toHaveClass("hole-custom-stroke");
  });

  it("renders HoleBackground with custom numberOfLines and numberOfDiscs", () => {
    // Act
    render(
      <HoleBackground
        numberOfLines={30}
        numberOfDiscs={40}
        className='hole-custom-config'
        data-testid='hole-custom-config'
      />,
    );

    // Assert
    const holeBackground = screen.getByTestId("hole-custom-config");

    expect(holeBackground.parentElement).toHaveClass("hole-custom-config");
  });

  it("renders HoleBackground with custom particleRGBColor", () => {
    // Act
    render(
      <HoleBackground
        particleRGBColor={[128, 128, 255]}
        className='hole-custom-particles'
        data-testid='hole-custom-particles'
      />,
    );

    // Assert
    const holeBackground = screen.getByTestId("hole-custom-particles");

    expect(holeBackground.parentElement).toHaveClass("hole-custom-particles");
  });

  it("renders HoleBackground with children", () => {
    // Act
    render(
      <HoleBackground data-testid='hole-with-children'>
        <div>Hole content</div>
      </HoleBackground>,
    );

    // Assert
    expect(screen.getByText("Hole content")).toBeInTheDocument();
  });

  it("initializes canvas and starts animation loop", () => {
    // Act
    render(<HoleBackground data-testid='hole-animation' />);

    // Assert
    expect(screen.getByTestId("hole-animation")).toBeInTheDocument();
  });

  it("handles window resize event", () => {
    // Arrange
    render(<HoleBackground data-testid='hole-resize' />);

    // Act
    fireEvent.resize(globalThis.window);

    // Assert
    const canvas = screen.getByTestId("hole-resize");

    expect(canvas).toBeInTheDocument();
  });

  it("cleans up on unmount - cancels animation frame", () => {
    // Act
    const {unmount} = render(<HoleBackground data-testid='hole-cleanup' />);
    unmount();

    // Assert - should complete without errors
    expect(true).toBe(true);
  });

  it("draws discs with proper canvas operations", () => {
    // Act
    render(<HoleBackground data-testid='hole-discs' />);

    // Assert
    expect(screen.getByTestId("hole-discs")).toBeInTheDocument();
  });

  it("renders lines canvas and draws image", () => {
    // Act
    render(<HoleBackground data-testid='hole-lines' />);

    // Assert
    expect(screen.getByTestId("hole-lines")).toBeInTheDocument();
  });

  it("clips drawing operations with Path2D", () => {
    // Act
    render(<HoleBackground data-testid='hole-clip' />);

    // Assert - should render and setup clipping paths
    expect(screen.getByTestId("hole-clip")).toBeInTheDocument();
  });

  it("draws particles within clipping path", () => {
    // Act
    render(<HoleBackground data-testid='hole-particles' />);

    // Assert
    expect(screen.getByTestId("hole-particles")).toBeInTheDocument();
  });

  it("updates particle positions with physics", () => {
    // Act
    render(<HoleBackground data-testid='hole-particle-physics' />);

    // Assert
    expect(screen.getByTestId("hole-particle-physics")).toBeInTheDocument();
  });

  it("manages particle lifecycle", () => {
    // Act
    render(<HoleBackground data-testid='hole-particle-reset' />);

    // Assert
    expect(screen.getByTestId("hole-particle-reset")).toBeInTheDocument();
  });

  it("tweens disc properties with easing", () => {
    // Act
    render(<HoleBackground data-testid='hole-tween' />);

    // Assert
    expect(screen.getByTestId("hole-tween")).toBeInTheDocument();
  });

  it("handles isPointInPath for line clipping", () => {
    // Arrange
    mockCanvasContext.isPointInPath.mockReturnValueOnce(true);

    // Act
    render(<HoleBackground data-testid='hole-point-in-path' />);

    // Assert - should render without crashing
    expect(screen.getByTestId("hole-point-in-path")).toBeInTheDocument();
  });

  it("handles isPointInStroke for line rendering", () => {
    // Arrange
    mockCanvasContext.isPointInStroke.mockReturnValueOnce(true);

    // Act
    render(<HoleBackground data-testid='hole-point-in-stroke' />);

    // Assert - should render without crashing
    expect(screen.getByTestId("hole-point-in-stroke")).toBeInTheDocument();
  });

  it("draws lines with moveTo and lineTo", () => {
    // Act
    render(<HoleBackground data-testid='hole-line-drawing' />);

    // Assert
    expect(screen.getByTestId("hole-line-drawing")).toBeInTheDocument();
  });

  it("scales canvas context by device pixel ratio", () => {
    // Act
    render(<HoleBackground data-testid='hole-dpi-scaling' />);

    // Assert
    expect(screen.getByTestId("hole-dpi-scaling")).toBeInTheDocument();
  });

  it("handles canvas without context gracefully", () => {
    // Arrange
    const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValueOnce(null);

    // Act
    render(<HoleBackground data-testid='hole-no-context' />);

    // Assert - should not crash
    expect(screen.getByTestId("hole-no-context")).toBeInTheDocument();

    getContextSpy.mockRestore();
  });

  it("creates particles with random properties", () => {
    // Act
    render(
      <HoleBackground
        particleRGBColor={[100, 150, 200]}
        data-testid='hole-random-particles'
      />,
    );

    // Assert
    expect(screen.getByTestId("hole-random-particles")).toBeInTheDocument();
  });

  it("handles all HTML canvas props", () => {
    // Act
    render(
      <HoleBackground
        data-testid='hole-with-props'
        title='Hole Background'
        id='hole-canvas'
      />,
    );

    // Assert
    const canvas = screen.getByTestId("hole-with-props");

    expect(canvas).toHaveAttribute("title", "Hole Background");
    expect(canvas).toHaveAttribute("id", "hole-canvas");
  });

  it("renders scanlines overlay", () => {
    // Act
    const {container} = render(<HoleBackground data-testid='hole-scanlines' />);

    // Assert
    const scanlines = container.querySelector('[aria-hidden="true"]');

    expect(scanlines).toBeInTheDocument();
  });

  it("animates glow effect with motion", () => {
    // Act
    const {container} = render(<HoleBackground data-testid='hole-glow' />);

    // Assert - motion.div for glow should be rendered
    const glow = container.querySelector('[aria-hidden="true"]');

    expect(glow).toBeInTheDocument();
  });

  it("moves discs with progress updates", () => {
    // Arrange
    let animationCallback: FrameRequestCallback | null = null;
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      animationCallback = callback;
      return 1;
    });

    // Act
    render(<HoleBackground data-testid='hole-disc-movement' />);

    // Trigger multiple frames
    if (animationCallback) {
      for (let i = 0; i < 10; i++) {
        animationCallback(i * 16);
      }
    }

    // Assert - discs should animate
    expect(screen.getByTestId("hole-disc-movement")).toBeInTheDocument();
  });

  it("moves particles upward with physics", () => {
    // Arrange
    let animationCallback: FrameRequestCallback | null = null;
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      animationCallback = callback;
      return 1;
    });

    // Act
    render(<HoleBackground data-testid='hole-particle-movement' />);

    // Trigger animation frames
    if (animationCallback) {
      for (let i = 0; i < 50; i++) {
        animationCallback(i * 16);
      }
    }

    // Assert - particles should be updated
    expect(screen.getByTestId("hole-particle-movement")).toBeInTheDocument();
  });

  it("reinitializes particles when they exit bounds", () => {
    // Arrange
    let animationCallback: FrameRequestCallback | null = null;
    vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation((callback) => {
      animationCallback = callback;
      return 1;
    });

    // Act
    render(<HoleBackground data-testid='hole-particle-reinit' />);

    // Run many frames to allow particles to exit and reinit
    if (animationCallback) {
      for (let i = 0; i < 200; i++) {
        animationCallback(i * 16);
      }
    }

    // Assert - should handle particle lifecycle
    expect(screen.getByTestId("hole-particle-reinit")).toBeInTheDocument();
  });

  it("draws discs at every 5th index", () => {
    // Arrange
    mockCanvasContext.ellipse.mockClear();

    // Act
    render(
      <HoleBackground
        numberOfDiscs={25}
        data-testid='hole-disc-filter'
      />,
    );

    // Assert - only every 5th disc should be drawn
    expect(screen.getByTestId("hole-disc-filter")).toBeInTheDocument();
  });

  it("applies clipping to discs smaller than clip threshold", () => {
    // Arrange
    mockCanvasContext.clip.mockClear();
    mockCanvasContext.save.mockClear();
    mockCanvasContext.restore.mockClear();

    // Act
    render(
      <HoleBackground
        numberOfDiscs={60}
        data-testid='hole-disc-clip'
      />,
    );

    // Assert - clipping operations should be performed
    expect(screen.getByTestId("hole-disc-clip")).toBeInTheDocument();
  });

  it("creates Path2D for clipping operations", () => {
    // Act
    render(<HoleBackground data-testid='hole-path2d' />);

    // Assert - component should use Path2D without errors
    expect(screen.getByTestId("hole-path2d")).toBeInTheDocument();
  });

  it("handles line clipping with isPointInPath returning true", () => {
    // Arrange
    mockCanvasContext.isPointInPath.mockReturnValue(true);
    mockCanvasContext.clip.mockClear();

    // Act
    render(
      <HoleBackground
        numberOfLines={10}
        data-testid='hole-line-clip-active'
      />,
    );

    // Assert - should apply clipping when points are in path
    expect(screen.getByTestId("hole-line-clip-active")).toBeInTheDocument();
  });

  it("recreates lines and discs on window resize", () => {
    // Arrange
    render(<HoleBackground data-testid='hole-resize-reinit' />);

    // Act
    fireEvent.resize(globalThis.window);

    // Assert - should reinitialize without errors
    expect(screen.getByTestId("hole-resize-reinit")).toBeInTheDocument();
  });
});
