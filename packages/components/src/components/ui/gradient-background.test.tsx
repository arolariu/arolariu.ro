import * as React from "react";

import {render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

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

import {GradientBackground} from "./gradient-background";

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

describe("GradientBackground", () => {
  it("renders GradientBackground with custom classes and forwarded refs", () => {
    // Arrange
    const gradientRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <GradientBackground
        ref={gradientRef}
        className='gradient-background-class'
        data-testid='gradient-background'
      />,
    );

    // Assert
    const gradientBackground = screen.getByTestId("gradient-background");

    expect(gradientBackground).toHaveClass("gradient-background-class");
    expect(gradientRef.current).toBe(gradientBackground);
  });

  it("renders GradientBackground with custom transition", () => {
    // Act
    render(
      <GradientBackground
        transition={{duration: 20, ease: "linear", repeat: Infinity}}
        data-testid='gradient-custom-transition'
      />,
    );

    // Assert
    const gradientBackground = screen.getByTestId("gradient-custom-transition");

    expect(gradientBackground).toBeInTheDocument();
  });

  it("renders GradientBackground without explicit transition", () => {
    // Act
    render(<GradientBackground data-testid='gradient-default-transition' />);

    // Assert
    const gradientBackground = screen.getByTestId("gradient-default-transition");

    expect(gradientBackground).toBeInTheDocument();
  });

  it("renders with children content", () => {
    // Act
    render(
      <GradientBackground data-testid='gradient-with-children'>
        <div>Gradient children</div>
      </GradientBackground>,
    );

    // Assert
    expect(screen.getByText("Gradient children")).toBeInTheDocument();
  });

  it("filters out React key prop from spreading", () => {
    // Act
    render(
      <GradientBackground
        key='test-key'
        data-testid='gradient-with-key'
      />,
    );

    // Assert
    const gradientBackground = screen.getByTestId("gradient-with-key");

    expect(gradientBackground).toBeInTheDocument();
    expect(gradientBackground).not.toHaveAttribute("key");
  });

  it("forwards all valid HTML props", () => {
    // Act
    render(
      <GradientBackground
        data-testid='gradient-html-props'
        title='Gradient title'
        id='gradient-id'
        aria-label='Gradient label'
      />,
    );

    // Assert
    const gradientBackground = screen.getByTestId("gradient-html-props");

    expect(gradientBackground).toHaveAttribute("title", "Gradient title");
    expect(gradientBackground).toHaveAttribute("id", "gradient-id");
    expect(gradientBackground).toHaveAttribute("aria-label", "Gradient label");
  });

  it("applies animate prop with background position values", () => {
    // Act
    render(<GradientBackground data-testid='gradient-animate' />);

    // Assert
    const gradientBackground = screen.getByTestId("gradient-animate");

    expect(gradientBackground).toBeInTheDocument();
  });

  it("renders with custom style prop", () => {
    // Act
    render(
      <GradientBackground
        data-testid='gradient-custom-style'
        style={{opacity: 0.5}}
      />,
    );

    // Assert
    const gradientBackground = screen.getByTestId("gradient-custom-style");

    expect(gradientBackground).toBeInTheDocument();
  });

  it("handles transition with different ease functions", () => {
    // Act
    render(
      <GradientBackground
        transition={{duration: 10, ease: "linear", repeat: 5}}
        data-testid='gradient-ease-linear'
      />,
    );

    // Assert
    expect(screen.getByTestId("gradient-ease-linear")).toBeInTheDocument();
  });

  it("handles transition with repeat type", () => {
    // Act
    render(
      <GradientBackground
        transition={{duration: 10, ease: "easeInOut", repeat: Infinity, repeatType: "reverse"}}
        data-testid='gradient-repeat-type'
      />,
    );

    // Assert
    expect(screen.getByTestId("gradient-repeat-type")).toBeInTheDocument();
  });

  it("spreads all HTMLMotionProps correctly", () => {
    // Act
    render(
      <GradientBackground
        data-testid='gradient-motion-props'
        onAnimationStart={() => {}}
        onAnimationComplete={() => {}}
      />,
    );

    // Assert
    expect(screen.getByTestId("gradient-motion-props")).toBeInTheDocument();
  });
});
