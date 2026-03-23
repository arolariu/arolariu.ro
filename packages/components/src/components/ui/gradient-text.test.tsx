import * as React from "react";

import {render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

vi.mock("motion/react", async () => {
  const ReactModule = await import("react");

  function createMotionPrimitive<TTag extends keyof React.JSX.IntrinsicElements>(tag: TTag) {
    return ReactModule.forwardRef<Element, React.HTMLAttributes<HTMLElement>>(({children, ...props}, ref) => ReactModule.createElement(tag, {...props, ref}, children));
  }

  return {
    motion: {
      span: createMotionPrimitive("span"),
    },
  };
});

import {GradientText} from "./gradient-text";

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

describe("GradientText", () => {
  it("renders GradientText with custom classes and forwarded refs", () => {
    const gradientTextRef = {current: null as HTMLSpanElement | null};

    render(
      <GradientText
        ref={gradientTextRef}
        className='gradient-text-class'
        text='Gradient title'
      />,
    );

    const gradientText = screen.getByText("Gradient title").parentElement;

    expect(gradientText).toHaveClass("gradient-text-class");
    expect(gradientTextRef.current).toBe(gradientText);
  });

  it("applies the gradient prop to the animated text style", () => {
    const gradient = "linear-gradient(90deg, rgb(10 20 30) 0%, rgb(40 50 60) 100%)";

    render(
      <GradientText
        gradient={gradient}
        text='Styled gradient'
      />,
    );

    expect(screen.getByText("Styled gradient").style.getPropertyValue("--ac-gradient-text-background")).toBe(gradient);
  });

  it("does not render the neon overlay when neon is disabled", () => {
    const {container} = render(
      <GradientText
        neon={false}
        text='No glow'
      />,
    );

    expect(container.querySelector('[aria-hidden="true"]')).not.toBeInTheDocument();
  });

  it("renders an aria-hidden neon overlay when neon is enabled", () => {
    const {container} = render(
      <GradientText
        neon
        text='Glow copy'
      />,
    );

    const neonLayer = container.querySelector('[aria-hidden="true"]');

    expect(neonLayer).toBeInTheDocument();
    expect(neonLayer).toHaveAttribute("aria-hidden", "true");
    expect(screen.getAllByText("Glow copy")).toHaveLength(2);
  });
});
