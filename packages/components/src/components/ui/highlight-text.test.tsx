import * as React from "react";

import {render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

const {useInViewMock} = vi.hoisted(() => ({
  useInViewMock: vi.fn(() => true),
}));

vi.mock("motion/react", async () => {
  const ReactModule = await import("react");

  function serializeProp(value: unknown): string {
    return value === undefined ? "undefined" : JSON.stringify(value);
  }

  function createMotionPrimitive<TTag extends keyof React.JSX.IntrinsicElements>(tag: TTag) {
    return ReactModule.forwardRef<Element, React.HTMLAttributes<HTMLElement> & {
      animate?: unknown;
      initial?: unknown;
      transition?: unknown;
    }>(({animate, children, initial, transition, ...props}, ref) => ReactModule.createElement(tag, {
      ...props,
      ref,
      "data-motion-animate": serializeProp(animate),
      "data-motion-initial": serializeProp(initial),
      "data-motion-transition": serializeProp(transition),
    }, children));
  }

  return {
    motion: {
      span: createMotionPrimitive("span"),
    },
    useInView: useInViewMock,
  };
});

import {HighlightText} from "./highlight-text";

beforeEach(() => {
  useInViewMock.mockReset();
  useInViewMock.mockReturnValue(true);

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
    const highlightTextRef = {current: null as HTMLSpanElement | null};

    render(
      <HighlightText
        ref={highlightTextRef}
        className='highlight-text-class'
        text='Highlighted copy'
      />,
    );

    const highlightText = screen.getByText("Highlighted copy");

    expect(highlightText).toHaveClass("highlight-text-class");
    expect(highlightTextRef.current).toBe(highlightText);
  });

  it("keeps the initial highlight state until the text is in view", () => {
    useInViewMock.mockReturnValue(false);

    render(
      <HighlightText
        inView
        data-testid='highlight-text'
        text='Deferred highlight'
      />,
    );

    const highlightText = screen.getByTestId("highlight-text");

    expect(highlightText).toHaveAttribute("data-motion-initial", JSON.stringify({backgroundSize: "0% 100%"}));
    expect(highlightText).toHaveAttribute("data-motion-animate", "undefined");
  });

  it("passes the in-view margin through to useInView", () => {
    render(
      <HighlightText
        inView
        inViewMargin='-20% 0px'
        text='Observed highlight'
      />,
    );

    expect(useInViewMock).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        margin: "-20% 0px",
        once: true,
      }),
    );
  });

  it("forwards the transition prop to the motion span", () => {
    const transition = {duration: 4, ease: "linear"} as const;

    render(
      <HighlightText
        transition={transition}
        data-testid='highlight-transition'
        text='Transition highlight'
      />,
    );

    expect(screen.getByTestId("highlight-transition")).toHaveAttribute(
      "data-motion-transition",
      JSON.stringify(transition),
    );
  });
});
