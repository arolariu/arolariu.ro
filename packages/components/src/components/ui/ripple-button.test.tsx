import * as React from "react";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterAll, afterEach, beforeAll, describe, expect, it, vi} from "vitest";

let RippleButton: typeof import("./ripple-button").RippleButton;
const animateDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "animate");
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, "clipboard");

beforeAll(async () => {
  Object.defineProperty(Element.prototype, "animate", {configurable: true, value: undefined});
  vi.useFakeTimers({toFake: ["setTimeout", "clearTimeout", "Date", "performance"]});
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback): number =>
    window.setTimeout(() => callback(performance.now()), 16),
  );
  vi.stubGlobal("cancelAnimationFrame", (id: number): void => window.clearTimeout(id));
  ({RippleButton} = await import("./ripple-button"));
});
afterEach(async () => {
  cleanup();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(64);
  });
  if (clipboardDescriptor) Object.defineProperty(navigator, "clipboard", clipboardDescriptor);
  else Reflect.deleteProperty(navigator, "clipboard");
});
afterAll(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  if (animateDescriptor) Object.defineProperty(Element.prototype, "animate", animateDescriptor);
  else Reflect.deleteProperty(Element.prototype, "animate");
});

describe("RippleButton with real Motion", () => {
  it("activates with native Enter and Space without submitting the surrounding form", async () => {
    const user = userEvent.setup({advanceTimers: vi.advanceTimersByTime});
    const onClick = vi.fn();
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => event.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <RippleButton
          onClick={onClick}
          rippleClassName='test-ripple'>
          Activate
        </RippleButton>
      </form>,
    );
    const tab = user.tab();
    await vi.advanceTimersByTimeAsync(1);
    await tab;
    const keyboard = user.keyboard("{Enter} ");
    await vi.advanceTimersByTimeAsync(1);
    await keyboard;
    expect(onClick).toHaveBeenCalledTimes(2);
    expect(onSubmit).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".test-ripple")).toHaveLength(2);
  });

  it("retains a one-second ripple beyond 600ms and removes it through actual Motion completion", async () => {
    render(
      <RippleButton
        transition={{duration: 1, ease: "linear"}}
        rippleClassName='test-ripple'>
        Activate
      </RippleButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(document.querySelectorAll(".test-ripple")).toHaveLength(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });
    expect(document.querySelectorAll(".test-ripple")).toHaveLength(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(650);
    });
    expect(document.querySelectorAll(".test-ripple")).toHaveLength(0);
  });

  it("does not create a ripple after caller cancellation", () => {
    render(
      <RippleButton
        onClick={(event) => event.preventDefault()}
        rippleClassName='test-ripple'>
        Cancel
      </RippleButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(document.querySelectorAll(".test-ripple")).toHaveLength(0);
  });

  it("uses collision-free identities for activations in the same millisecond", async () => {
    render(
      <RippleButton
        transition={{duration: 1}}
        rippleClassName='test-ripple'>
        Activate
      </RippleButton>,
    );
    const button = screen.getByRole("button");
    fireEvent.click(button);
    fireEvent.click(button);
    expect(document.querySelectorAll(".test-ripple")).toHaveLength(2);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    expect(document.querySelectorAll(".test-ripple")).toHaveLength(0);
  });

  it("keeps distinct stable IDs across simultaneous instances and preserves the click origin", () => {
    const {rerender} = render(
      <>
        <RippleButton rippleClassName='test-ripple'>First</RippleButton>
        <RippleButton rippleClassName='test-ripple'>Second</RippleButton>
      </>,
    );
    fireEvent.click(screen.getByRole("button", {name: "First"}), {clientX: 30, clientY: 40, detail: 1});
    fireEvent.click(screen.getByRole("button", {name: "Second"}));
    const ripples = [...document.querySelectorAll(".test-ripple")];
    const ids = ripples.map((ripple) => ripple.getAttribute("data-ripple-id"));
    expect(ids.every((id) => id !== null)).toBe(true);
    expect(new Set(ids).size).toBe(2);
    expect(ripples[0]).toHaveStyle({transform: "translateX(30px) translateY(40px) scale(0)"});
    rerender(
      <>
        <RippleButton rippleClassName='test-ripple'>First changed</RippleButton>
        <RippleButton rippleClassName='test-ripple'>Second</RippleButton>
      </>,
    );
    expect([...document.querySelectorAll(".test-ripple")].map((ripple) => ripple.getAttribute("data-ripple-id"))).toEqual(ids);
  });

  it("preserves native disabled, type, caller labels and actual refs", () => {
    const ref = React.createRef<HTMLButtonElement>();
    const onClick = vi.fn();
    render(
      <RippleButton
        ref={ref}
        disabled
        aria-label='Disabled action'
        onClick={onClick}
        rippleClassName='test-ripple'>
        Activate
      </RippleButton>,
    );
    const button = screen.getByRole("button", {name: "Disabled action"});
    expect(button).toHaveAttribute("type", "button");
    expect(ref.current).toBe(button);
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    expect(document.querySelectorAll(".test-ripple")).toHaveLength(0);
  });

  it("cancels pending real Motion work when an active ripple unmounts", async () => {
    const {unmount} = render(
      <RippleButton
        transition={{duration: 1}}
        rippleClassName='test-ripple'>
        Activate
      </RippleButton>,
    );
    fireEvent.click(screen.getByRole("button"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    expect(document.querySelectorAll(".test-ripple")).toHaveLength(1);
    unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    expect(document.querySelectorAll(".test-ripple")).toHaveLength(0);
  });
});
