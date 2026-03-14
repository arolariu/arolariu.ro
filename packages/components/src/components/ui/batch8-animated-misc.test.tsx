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

import {AspectRatio} from "./aspect-ratio";
import {BackgroundBeams} from "./background-beams";
import {BubbleBackground} from "./bubble-background";
import {CountingNumber} from "./counting-number";
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

describe("Batch 8 animated and misc components", () => {
  it("renders AspectRatio with children, custom classes, and a forwarded ref", () => {
    // Arrange
    const ref = {current: null as HTMLDivElement | null};

    // Act
    render(
      <AspectRatio
        ref={ref}
        className='aspect-ratio-class'
        data-testid='aspect-ratio'>
        Media
      </AspectRatio>,
    );

    // Assert
    const aspectRatio = screen.getByTestId("aspect-ratio");

    expect(aspectRatio).toHaveClass("aspect-ratio-class");
    expect(aspectRatio).toHaveTextContent("Media");
    expect(ref.current).toBe(aspectRatio);
  });

  it("renders animated background components with custom classes and forwarded refs", () => {
    // Arrange
    const beamsRef = {current: null as HTMLDivElement | null};
    const bubbleRef = {current: null as HTMLDivElement | null};
    const fireworksRef = {current: null as HTMLDivElement | null};
    const gradientRef = {current: null as HTMLDivElement | null};
    const holeRef = {current: null as HTMLCanvasElement | null};

    // Act
    render(
      <>
        <BackgroundBeams
          ref={beamsRef}
          className='background-beams-class'
          data-testid='background-beams'
        />
        <BubbleBackground
          ref={bubbleRef}
          className='bubble-background-class'
          data-testid='bubble-background'>
          Bubble content
        </BubbleBackground>
        <FireworksBackground
          ref={fireworksRef}
          className='fireworks-background-class'
          data-testid='fireworks-background'
        />
        <GradientBackground
          ref={gradientRef}
          className='gradient-background-class'
          data-testid='gradient-background'
        />
        <HoleBackground
          ref={holeRef}
          className='hole-background-class'
          data-testid='hole-background'
        />
      </>,
    );

    // Assert
    const backgroundBeams = screen.getByTestId("background-beams");
    const bubbleBackground = screen.getByTestId("bubble-background");
    const fireworksBackground = screen.getByTestId("fireworks-background");
    const gradientBackground = screen.getByTestId("gradient-background");
    const holeBackground = screen.getByTestId("hole-background");

    expect(backgroundBeams).toHaveClass("background-beams-class");
    expect(bubbleBackground).toHaveClass("bubble-background-class");
    expect(bubbleBackground).toHaveTextContent("Bubble content");
    expect(fireworksBackground).toHaveClass("fireworks-background-class");
    expect(gradientBackground).toHaveClass("gradient-background-class");
    expect(holeBackground.parentElement).toHaveClass("hole-background-class");
    expect(beamsRef.current).toBe(backgroundBeams);
    expect(bubbleRef.current).toBe(bubbleBackground);
    expect(fireworksRef.current).toBe(fireworksBackground);
    expect(gradientRef.current).toBe(gradientBackground);
    expect(holeRef.current).toBe(holeBackground);
  });

  it("renders DotBackground with a custom class and a forwarded ref", () => {
    // Arrange
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

    expect(dotBackground).toHaveClass("dot-background-class");
    expect(ref.current).toBe(dotBackground);
  });

  it("renders animated text components with custom classes and forwarded refs", () => {
    // Arrange
    const gradientTextRef = {current: null as HTMLSpanElement | null};
    const highlightTextRef = {current: null as HTMLSpanElement | null};
    const countingNumberRef = {current: null as HTMLSpanElement | null};

    // Act
    render(
      <>
        <GradientText
          ref={gradientTextRef}
          className='gradient-text-class'
          text='Gradient title'
        />
        <HighlightText
          ref={highlightTextRef}
          className='highlight-text-class'
          text='Highlighted copy'
        />
        <CountingNumber
          ref={countingNumberRef}
          className='counting-number-class'
          number={42}
        />
      </>,
    );

    // Assert
    const gradientText = screen.getByText("Gradient title").parentElement;
    const highlightText = screen.getByText("Highlighted copy");
    const countingNumber = screen.getByText("42");

    expect(gradientText).toHaveClass("gradient-text-class");
    expect(highlightText).toHaveClass("highlight-text-class");
    expect(countingNumber).toHaveClass("counting-number-class");
    expect(gradientTextRef.current).toBe(gradientText);
    expect(highlightTextRef.current).toBe(highlightText);
    expect(countingNumberRef.current).toBe(countingNumber);
  });

  it("renders animated button components with custom classes and forwarded refs", () => {
    // Arrange
    const flipButtonRef = {current: null as HTMLButtonElement | null};
    const rippleButtonRef = {current: null as HTMLButtonElement | null};
    const handleRippleClick = vi.fn();

    // Act
    render(
      <>
        <FlipButton
          ref={flipButtonRef}
          backText='Hovered'
          className='flip-button-class'
          frontText='Default'
        />
        <RippleButton
          ref={rippleButtonRef}
          className='ripple-button-class'
          onClick={handleRippleClick}>
          Ripple
        </RippleButton>
      </>,
    );

    // Assert
    const flipButton = screen.getAllByText("Default")[0]?.closest("button");
    const rippleButton = screen.getByRole("button", {name: "Ripple"});

    expect(flipButton).not.toBeNull();
    expect(flipButton).toHaveClass("flip-button-class");
    expect(rippleButton).toHaveClass("ripple-button-class");
    expect(flipButtonRef.current).toBe(flipButton);
    expect(rippleButtonRef.current).toBe(rippleButton);

    fireEvent.click(rippleButton);
    expect(handleRippleClick).toHaveBeenCalledTimes(1);
  });

  it("renders Scratcher as a smoke test with custom classes", () => {
    // Act
    render(
      <Scratcher
        className='scratcher-class'
        height={120}
        width={240}>
        <div>Scratch prize</div>
      </Scratcher>,
    );

    // Assert
    const scratcherRoot = screen.getByText("Scratch prize").parentElement;

    expect(scratcherRoot).toHaveClass("scratcher-class");
    expect(screen.getByText("Scratch prize")).toBeInTheDocument();
  });

  it("renders Typewriter variants with custom classes and forwarded refs", () => {
    // Arrange
    const typewriterRef = {current: null as HTMLDivElement | null};
    const smoothTypewriterRef = {current: null as HTMLDivElement | null};
    const words = [{text: "Hello"}] as const;

    // Act
    render(
      <>
        <TypewriterText
          ref={typewriterRef}
          className='typewriter-class'
          words={words}
        />
        <TypewriterTextSmooth
          ref={smoothTypewriterRef}
          className='typewriter-smooth-class'
          words={words}
        />
      </>,
    );

    // Assert
    expect(document.body).toHaveTextContent("Hello");
    expect(typewriterRef.current).toHaveClass("typewriter-class");
    expect(smoothTypewriterRef.current).toHaveClass("typewriter-smooth-class");
  });
});
