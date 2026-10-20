import * as React from "react";
import {EventTarget as DOMEventTarget} from "happy-dom";
import {act, cleanup, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";

import {FlipButton, type FlipDirection} from "./flip-button";

const right: FlipDirection = "right";
const animateDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
beforeEach(() => {
  Object.defineProperty(Element.prototype, "animate", {configurable: true, value: undefined});
  vi.stubGlobal("EventTarget", DOMEventTarget);
});
afterEach(() => {
  cleanup();
  if (animateDescriptor) Object.defineProperty(Element.prototype, "animate", animateDescriptor);
  else Reflect.deleteProperty(Element.prototype, "animate");
  vi.unstubAllGlobals();
});

describe("FlipButton with real Motion", () => {
  it.each(["hover", "focus"] as const)(
    "keeps both action-face labels in one stable name through real %s transitions",
    async (interaction) => {
      const user = userEvent.setup();
      render(
        <FlipButton
          frontText='Show details'
          backText='Open details'
          transition={{duration: 0}}
        />,
      );
      const button = screen.getByRole("button");
      const [front, back] = button.querySelectorAll("span");
      expect(front).toHaveStyle({opacity: "1"});
      expect(back).toHaveStyle({opacity: "0"});
      expect(button).toHaveAccessibleName("Show details / Open details");
      if (interaction === "hover") await user.hover(button);
      else await user.tab();
      await waitFor(() => {
        expect(front).toHaveStyle({opacity: "0"});
        expect(back).toHaveStyle({opacity: "1"});
      });
      expect(button).toHaveAccessibleName("Show details / Open details");
      if (interaction === "hover") await user.unhover(button);
      else await user.tab();
      await waitFor(() => {
        expect(front).toHaveStyle({opacity: "1"});
        expect(back).toHaveStyle({opacity: "0"});
      });
      expect(button).toHaveAccessibleName("Show details / Open details");
    },
  );

  it("does not duplicate an identical action label", () => {
    render(
      <FlipButton
        frontText='Open details'
        backText='Open details'
      />,
    );
    expect(screen.getByRole("button")).toHaveAccessibleName("Open details");
  });

  it("accepts the correctly spelled right direction and has one stable accessible label", () => {
    render(
      <FlipButton
        frontText='Open'
        backText='Open details'
        from={right}
      />,
    );
    expect(screen.getByRole("button", {name: "Open / Open details"})).toHaveAttribute("type", "button");
  });

  it.each(["top", "bottom", "left", "right"] as const)("supports the %s direction", (from) => {
    render(
      <FlipButton
        frontText='Open'
        backText='Open details'
        from={from}
      />,
    );
    expect(screen.getByRole("button", {name: "Open / Open details"})).toBeInTheDocument();
  });

  it("retains native keyboard activation, caller label, classes and ref", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(
      <FlipButton
        ref={ref}
        frontText='Open details'
        backText='Open details'
        aria-label='Open details documentation'
        className='caller'
        onClick={onClick}
      />,
    );
    await user.tab();
    await user.keyboard("{Enter} ");
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(ref.current).toBe(screen.getByRole("button", {name: "Open details documentation"}));
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
          backText='Open details'
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
          backText='Open details'
          onClick={onClick}
        />
      </form>,
    );
    await user.click(screen.getByRole("button"));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe("FlipButton reduced-motion subscription", () => {
  let reduced = false;
  let media: MediaQueryList;
  const constructedObservers = vi.fn();
  class CountingObserver {
    constructor() {
      constructedObservers();
    }
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  beforeEach(() => {
    reduced = false;
    constructedObservers.mockClear();
    media = window.matchMedia("(prefers-reduced-motion: reduce)");
    Object.defineProperty(media, "matches", {configurable: true, get: () => reduced});
    vi.spyOn(window, "matchMedia").mockReturnValue(media);
    vi.stubGlobal("IntersectionObserver", CountingObserver);
  });
  afterEach(() => {
    vi.mocked(window.matchMedia).mockRestore();
  });

  it("subscribes to the reduced-motion preference only: no per-button IntersectionObserver or visibility listener", () => {
    const addDocumentListener = vi.spyOn(document, "addEventListener");
    const addMediaListener = vi.spyOn(media, "addEventListener");
    const removeMediaListener = vi.spyOn(media, "removeEventListener");
    try {
      const {unmount} = render(
        <>
          <FlipButton
            frontText='Show details'
            backText='Open details'
          />
          <FlipButton
            frontText='Show more'
            backText='Open more'
          />
        </>,
      );
      expect(constructedObservers).not.toHaveBeenCalled();
      expect(addDocumentListener.mock.calls.filter(([type]) => type === "visibilitychange")).toHaveLength(0);
      expect(addMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
      unmount();
      expect(removeMediaListener).toHaveBeenCalledWith("change", expect.any(Function));
    } finally {
      addDocumentListener.mockRestore();
    }
  });

  it("flips instantly once a live reduced-motion preference applies, whatever the caller transition", async () => {
    const user = userEvent.setup();
    render(
      <FlipButton
        frontText='Show details'
        backText='Open details'
        transition={{duration: 10, ease: "linear"}}
      />,
    );
    const button = screen.getByRole("button", {name: "Show details / Open details"});
    const [front, back] = button.querySelectorAll("span");
    act(() => {
      reduced = true;
      media.dispatchEvent(new Event("change"));
    });
    await user.hover(button);
    await waitFor(
      () => {
        expect(front).toHaveStyle({opacity: "0"});
        expect(back).toHaveStyle({opacity: "1"});
      },
      {timeout: 500},
    );
  });
});
