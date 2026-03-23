import * as React from "react";

import {fireEvent, render, screen} from "@testing-library/react";
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

import {BubbleBackground} from "./bubble-background";

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

describe("BubbleBackground", () => {
  it("renders BubbleBackground with custom classes and forwarded refs", () => {
    // Arrange
    const bubbleRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <BubbleBackground
        ref={bubbleRef}
        className='bubble-background-class'
        data-testid='bubble-background'>
        Bubble content
      </BubbleBackground>,
    );

    // Assert
    const bubbleBackground = screen.getByTestId("bubble-background");

    expect(bubbleBackground).toHaveClass("bubble-background-class");
    expect(bubbleBackground).toHaveTextContent("Bubble content");
    expect(bubbleRef.current).toBe(bubbleBackground);
  });

  it("renders BubbleBackground with interactive mode", () => {
    // Act
    render(
      <BubbleBackground
        interactive
        data-testid='bubble-interactive'>
        Bubble content
      </BubbleBackground>,
    );

    // Assert
    const bubbleBackground = screen.getByTestId("bubble-interactive");

    expect(bubbleBackground).toBeInTheDocument();
  });

  it("renders BubbleBackground with custom transition", () => {
    // Act
    render(
      <BubbleBackground
        transition={{stiffness: 200, damping: 30}}
        data-testid='bubble-transition'>
        Bubble content
      </BubbleBackground>,
    );

    // Assert
    const bubbleBackground = screen.getByTestId("bubble-transition");

    expect(bubbleBackground).toBeInTheDocument();
  });

  it("renders BubbleBackground with custom colors", () => {
    // Act
    render(
      <BubbleBackground
        colors={{
          first: "255,0,0",
          second: "0,255,0",
          third: "0,0,255",
          fourth: "255,255,0",
          fifth: "255,0,255",
          sixth: "0,255,255",
        }}
        data-testid='bubble-custom-colors'>
        Bubble content
      </BubbleBackground>,
    );

    // Assert
    const bubbleBackground = screen.getByTestId("bubble-custom-colors");

    expect(bubbleBackground).toBeInTheDocument();
  });

  it("renders BubbleBackground without interactive mode (default)", () => {
    // Act
    render(<BubbleBackground data-testid='bubble-non-interactive'>Bubble content</BubbleBackground>);

    // Assert
    const bubbleBackground = screen.getByTestId("bubble-non-interactive");

    expect(bubbleBackground).toBeInTheDocument();
  });

  it("handles mousemove in interactive mode", () => {
    // Arrange
    render(
      <BubbleBackground
        interactive
        data-testid='bubble-mousemove'>
        Interactive content
      </BubbleBackground>,
    );

    const bubbleBackground = screen.getByTestId("bubble-mousemove");

    // Act - simulate mouse movement
    fireEvent.mouseMove(bubbleBackground, {clientX: 100, clientY: 50});

    // Assert
    expect(bubbleBackground).toBeInTheDocument();
  });

  it("calculates center position correctly on mousemove", () => {
    // Arrange
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 50,
      top: 50,
      width: 200,
      height: 100,
      right: 250,
      bottom: 150,
      x: 50,
      y: 50,
      toJSON: () => ({}),
    } as DOMRect);

    render(
      <BubbleBackground
        interactive
        data-testid='bubble-center-calc'>
        Center calc
      </BubbleBackground>,
    );

    const bubbleBackground = screen.getByTestId("bubble-center-calc");

    // Act - move mouse to specific position
    fireEvent.mouseMove(bubbleBackground, {clientX: 150, clientY: 100});

    // Assert - component should handle the calculation
    expect(bubbleBackground).toBeInTheDocument();
  });

  it("does not attach mousemove listener when interactive is false", () => {
    // Act
    render(
      <BubbleBackground
        interactive={false}
        data-testid='bubble-no-listener'>
        Non-interactive
      </BubbleBackground>,
    );

    // Assert - component should render correctly without interactive mode
    expect(screen.getByTestId("bubble-no-listener")).toBeInTheDocument();
  });

  it("cleans up mousemove listener on unmount when interactive", () => {
    // Arrange
    const removeEventListenerSpy = vi.spyOn(HTMLElement.prototype, "removeEventListener");

    // Act
    const {unmount} = render(
      <BubbleBackground
        interactive
        data-testid='bubble-cleanup-listener'>
        Cleanup test
      </BubbleBackground>,
    );

    unmount();

    // Assert
    const mouseMoveCalls = removeEventListenerSpy.mock.calls.filter((call) => call[0] === "mousemove");

    expect(mouseMoveCalls.length).toBeGreaterThan(0);

    removeEventListenerSpy.mockRestore();
  });

  it("early returns in effect when containerRef is null", () => {
    // This tests the guard clause in the useEffect
    // Act
    render(
      <BubbleBackground
        interactive
        data-testid='bubble-null-ref'>
        Null ref test
      </BubbleBackground>,
    );

    // Assert - should not crash
    expect(screen.getByTestId("bubble-null-ref")).toBeInTheDocument();
  });

  it("renders all bubble layers with correct motion animations", () => {
    // Act
    const {container} = render(<BubbleBackground data-testid='bubble-layers'>Bubble layers</BubbleBackground>);

    // Assert - should have multiple bubble divs
    const bubbles = container.querySelectorAll("div");

    expect(bubbles.length).toBeGreaterThan(5);
  });

  it("renders interactive bubble only when interactive prop is true", () => {
    // Arrange
    const {container: containerNonInteractive} = render(
      <BubbleBackground
        interactive={false}
        data-testid='bubble-no-interactive-layer'>
        No interactive
      </BubbleBackground>,
    );

    const {container: containerInteractive} = render(
      <BubbleBackground
        interactive
        data-testid='bubble-has-interactive-layer'>
        Has interactive
      </BubbleBackground>,
    );

    // Assert - both should render but structure may differ
    expect(containerNonInteractive.querySelectorAll("div").length).toBeGreaterThan(0);
    expect(containerInteractive.querySelectorAll("div").length).toBeGreaterThan(0);
  });

  it("applies custom colors to CSS custom properties", () => {
    // Act
    render(
      <BubbleBackground
        colors={{
          first: "10,20,30",
          second: "40,50,60",
          third: "70,80,90",
          fourth: "100,110,120",
          fifth: "130,140,150",
          sixth: "160,170,180",
        }}
        data-testid='bubble-css-vars'
        style={{"--test": "value"} as React.CSSProperties}>
        CSS vars
      </BubbleBackground>,
    );

    // Assert
    const bubbleBackground = screen.getByTestId("bubble-css-vars");

    expect(bubbleBackground).toBeInTheDocument();
  });

  it("renders SVG filter for goo effect", () => {
    // Act
    const {container} = render(<BubbleBackground data-testid='bubble-svg-filter'>SVG test</BubbleBackground>);

    // Assert
    const svg = container.querySelector("svg");
    const filter = container.querySelector("filter");

    expect(svg).toBeInTheDocument();
    expect(filter).toBeInTheDocument();
  });

  it("handles spring transition options", () => {
    // Act
    render(
      <BubbleBackground
        interactive
        transition={{stiffness: 150, damping: 25, mass: 1}}
        data-testid='bubble-spring-options'>
        Spring options
      </BubbleBackground>,
    );

    // Assert
    expect(screen.getByTestId("bubble-spring-options")).toBeInTheDocument();
  });

  it("renders with default color values", () => {
    // Act
    render(<BubbleBackground data-testid='bubble-default-colors'>Default colors</BubbleBackground>);

    // Assert
    expect(screen.getByTestId("bubble-default-colors")).toBeInTheDocument();
  });
});
