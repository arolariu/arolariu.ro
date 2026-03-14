import * as React from "react";

import {render, screen} from "@testing-library/react";
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
});
