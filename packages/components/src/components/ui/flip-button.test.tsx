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

import {FlipButton} from "./flip-button";

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

describe("FlipButton", () => {
  it("renders FlipButton with custom classes and forwarded refs", () => {
    // Arrange
    const flipButtonRef = {current: null as HTMLButtonElement | null};

    // Act
    render(
      <FlipButton
        ref={flipButtonRef}
        backText='Hovered'
        className='flip-button-class'
        frontText='Default'
      />,
    );

    // Assert
    const flipButton = screen.getAllByText("Default")[0]?.closest("button");

    expect(flipButton).not.toBeNull();
    expect(flipButton).toHaveClass("flip-button-class");
    expect(flipButtonRef.current).toBe(flipButton);
  });

  it("renders FlipButton with from='bottom' direction", () => {
    // Arrange
    render(
      <FlipButton
        backText='Back'
        from='bottom'
        frontText='Front'
        data-testid='flip-button-bottom'
      />,
    );

    // Assert
    const button = screen.getByTestId("flip-button-bottom");
    expect(button).toBeInTheDocument();
  });

  it("renders FlipButton with from='left' direction", () => {
    // Arrange
    render(
      <FlipButton
        backText='Back'
        from='left'
        frontText='Front'
        data-testid='flip-button-left'
      />,
    );

    // Assert
    const button = screen.getByTestId("flip-button-left");
    expect(button).toBeInTheDocument();
  });

  it("renders FlipButton with from='righ' direction", () => {
    // Arrange
    render(
      <FlipButton
        backText='Back'
        from='righ'
        frontText='Front'
        data-testid='flip-button-right'
      />,
    );

    // Assert
    const button = screen.getByTestId("flip-button-right");
    expect(button).toBeInTheDocument();
  });

  it("renders FlipButton with custom front and back class names", () => {
    // Arrange
    const {container} = render(
      <FlipButton
        backClassName='custom-back'
        backText='Back'
        frontClassName='custom-front'
        frontText='Front'
        data-testid='flip-button-custom'
      />,
    );

    // Assert
    const button = screen.getByTestId("flip-button-custom");
    expect(button).toBeInTheDocument();

    // Check for custom classes in the rendered output
    const frontFace = container.querySelector(".custom-front");
    const backFace = container.querySelector(".custom-back");
    expect(frontFace).toBeInTheDocument();
    expect(backFace).toBeInTheDocument();
  });

  it("handles onClick event", () => {
    // Arrange
    const handleClick = vi.fn();

    render(
      <FlipButton
        backText='Back'
        frontText='Front'
        onClick={handleClick}
        data-testid='flip-button-click'
      />,
    );

    // Act
    const button = screen.getByTestId("flip-button-click");
    button.click();

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders FlipButton with custom transition", () => {
    // Arrange
    const customTransition = {type: "tween" as const, duration: 0.5};

    render(
      <FlipButton
        backText='Back'
        frontText='Front'
        transition={customTransition}
        data-testid='flip-button-transition'
      />,
    );

    // Assert
    const button = screen.getByTestId("flip-button-transition");
    expect(button).toBeInTheDocument();
  });
});
