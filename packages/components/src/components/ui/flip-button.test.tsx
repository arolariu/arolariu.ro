import * as React from "react";
import {cleanup, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {FlipButton, type FlipDirection} from "./flip-button";

const right: FlipDirection = "right";
const animateDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
beforeEach(() => {
  Object.defineProperty(Element.prototype, "animate", {configurable: true, value: undefined});
});
afterEach(() => {
  cleanup();
  if (animateDescriptor) Object.defineProperty(Element.prototype, "animate", animateDescriptor);
  else Reflect.deleteProperty(Element.prototype, "animate");
});

describe("FlipButton with real Motion", () => {
  it("accepts the correctly spelled right direction and has one stable accessible label", () => {
    render(
      <FlipButton
        frontText='Open'
        backText='Details'
        from={right}
      />,
    );
    expect(screen.getByRole("button", {name: "Open"})).toHaveAttribute("type", "button");
  });

  it.each(["top", "bottom", "left", "right"] as const)("supports the %s direction", (from) => {
    render(
      <FlipButton
        frontText='Open'
        backText='Details'
        from={from}
      />,
    );
    expect(screen.getByRole("button", {name: "Open"})).toBeInTheDocument();
  });

  it("retains native keyboard activation, caller label, classes and ref", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(
      <FlipButton
        ref={ref}
        frontText='Open'
        backText='Details'
        aria-label='Show details'
        className='caller'
        onClick={onClick}
      />,
    );
    await user.tab();
    await user.keyboard("{Enter} ");
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(ref.current).toBe(screen.getByRole("button", {name: "Show details"}));
    expect(ref.current).toHaveClass("caller");
  });

  it("does not activate a disabled button or submit a form by default", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    const {rerender} = render(
      <form onSubmit={onSubmit}>
        <FlipButton
          frontText='Open'
          backText='Details'
          onClick={onClick}
          disabled
        />
      </form>,
    );
    await user.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
    rerender(
      <form onSubmit={onSubmit}>
        <FlipButton
          frontText='Open'
          backText='Details'
          onClick={onClick}
        />
      </form>,
    );
    await user.click(screen.getByRole("button"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
