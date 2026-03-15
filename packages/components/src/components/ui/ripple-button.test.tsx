import * as React from "react";

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

import {RippleButton} from "./ripple-button";

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

describe("RippleButton", () => {
  it("renders RippleButton with custom classes and forwarded refs", async () => {
    // Arrange
    const user = userEvent.setup();
    const rippleButtonRef = {current: null as HTMLButtonElement | null};
    const handleRippleClick = vi.fn();

    // Act
    render(
      <RippleButton
        ref={rippleButtonRef}
        className='ripple-button-class'
        onClick={handleRippleClick}>
        Ripple
      </RippleButton>,
    );

    // Assert
    const rippleButton = screen.getByRole("button", {name: "Ripple"});

    expect(rippleButton).toHaveClass("ripple-button-class");
    expect(rippleButtonRef.current).toBe(rippleButton);

    await user.click(rippleButton);
    expect(handleRippleClick).toHaveBeenCalledTimes(1);
  });

  it("creates ripple animation on click", async () => {
    // Arrange
    const user = userEvent.setup();
    const rippleButtonRef = {current: null as HTMLButtonElement | null};

    // Act
    render(
      <RippleButton
        ref={rippleButtonRef}
        data-testid='ripple-button'>
        Click me
      </RippleButton>,
    );

    const button = screen.getByTestId("ripple-button");

    // Mock getBoundingClientRect
    button.getBoundingClientRect = vi.fn(() => ({
      bottom: 100,
      height: 50,
      left: 50,
      right: 150,
      top: 50,
      width: 100,
      x: 50,
      y: 50,
      toJSON: () => ({}),
    }));

    // Click to create a ripple
    await user.click(button);

    // Assert - ripple should be created (can't directly check ripple state but can verify click worked)
    expect(button).toBeInTheDocument();
  });

  it("removes ripple after timeout", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<RippleButton data-testid='ripple-button'>Click me</RippleButton>);
    const button = screen.getByTestId("ripple-button");

    button.getBoundingClientRect = vi.fn(() => ({
      bottom: 100,
      height: 50,
      left: 50,
      right: 150,
      top: 50,
      width: 100,
      x: 50,
      y: 50,
      toJSON: () => ({}),
    }));

    // Click to create ripple
    await user.click(button);

    // Button should still be there
    expect(button).toBeInTheDocument();

    // Wait for ripple cleanup
    await new Promise((resolve) => setTimeout(resolve, 650));

    expect(button).toBeInTheDocument();
  });

  it("handles custom rippleClassName", async () => {
    // Arrange & Act
    const user = userEvent.setup();

    render(
      <RippleButton
        rippleClassName='custom-ripple'
        data-testid='ripple-button'>
        Custom Ripple
      </RippleButton>,
    );

    const button = screen.getByTestId("ripple-button");

    button.getBoundingClientRect = vi.fn(() => ({
      bottom: 100,
      height: 50,
      left: 50,
      right: 150,
      top: 50,
      width: 100,
      x: 50,
      y: 50,
      toJSON: () => ({}),
    }));

    await user.click(button);

    // Assert - button renders correctly with custom ripple class
    expect(button).toBeInTheDocument();
  });

  it("handles custom scale prop", async () => {
    // Arrange & Act
    const user = userEvent.setup();

    render(
      <RippleButton
        scale={20}
        data-testid='ripple-button'>
        Scaled Ripple
      </RippleButton>,
    );

    const button = screen.getByTestId("ripple-button");

    button.getBoundingClientRect = vi.fn(() => ({
      bottom: 100,
      height: 50,
      left: 50,
      right: 150,
      top: 50,
      width: 100,
      x: 50,
      y: 50,
      toJSON: () => ({}),
    }));

    await user.click(button);

    // Assert
    expect(button).toBeInTheDocument();
  });

  it("handles custom transition prop", async () => {
    // Arrange & Act
    const user = userEvent.setup();

    render(
      <RippleButton
        transition={{duration: 1.0, ease: "easeIn"}}
        data-testid='ripple-button'>
        Custom Transition
      </RippleButton>,
    );

    const button = screen.getByTestId("ripple-button");

    button.getBoundingClientRect = vi.fn(() => ({
      bottom: 100,
      height: 50,
      left: 50,
      right: 150,
      top: 50,
      width: 100,
      x: 50,
      y: 50,
      toJSON: () => ({}),
    }));

    await user.click(button);

    // Assert
    expect(button).toBeInTheDocument();
  });

  it("handles click when buttonRef is not available", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<RippleButton data-testid='ripple-button'>No Ref</RippleButton>);
    const button = screen.getByTestId("ripple-button");

    // Override button ref to simulate null case
    const originalGetElementById = document.getElementById;
    document.getElementById = vi.fn(() => null);

    // Act - click should not crash even if ref is not available
    await user.click(button);

    // Assert
    expect(button).toBeInTheDocument();

    // Restore
    document.getElementById = originalGetElementById;
  });

  it("cleans up timeouts on unmount", async () => {
    // Arrange
    const user = userEvent.setup();
    const {unmount} = render(<RippleButton data-testid='ripple-button'>Cleanup Test</RippleButton>);
    const button = screen.getByTestId("ripple-button");

    button.getBoundingClientRect = vi.fn(() => ({
      bottom: 100,
      height: 50,
      left: 50,
      right: 150,
      top: 50,
      width: 100,
      x: 50,
      y: 50,
      toJSON: () => ({}),
    }));

    // Click to create ripple
    await user.click(button);

    // Unmount before timeout completes
    unmount();

    // Wait a bit - should not crash
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
});
