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

import {HighlightText} from "./highlight-text";

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

describe("HighlightText", () => {
  it("renders HighlightText with custom classes and forwarded refs", () => {
    // Arrange
    const highlightTextRef = {current: null as HTMLSpanElement | null};

    // Act
    render(
      <HighlightText
        ref={highlightTextRef}
        className='highlight-text-class'
        text='Highlighted copy'
      />,
    );

    // Assert
    const highlightText = screen.getByText("Highlighted copy");

    expect(highlightText).toHaveClass("highlight-text-class");
    expect(highlightTextRef.current).toBe(highlightText);
  });
});
