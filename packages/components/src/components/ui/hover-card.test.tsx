import * as React from "react";
import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {HoverCard, HoverCardContent, HoverCardTrigger} from "./hover-card";

function renderHoverCard({
  className,
  customTrigger = false,
  defaultOpen = false,
}: Readonly<{
  className?: string;
  customTrigger?: boolean;
  defaultOpen?: boolean;
}>) {
  return render(
    <HoverCard defaultOpen={defaultOpen}>
      <HoverCardTrigger
        delay={0}
        closeDelay={0}
        href='/profile'
        render={customTrigger ? <a href='/profile'>Open hover card</a> : undefined}>
        {!customTrigger ? "Open hover card" : undefined}
      </HoverCardTrigger>
      <HoverCardContent
        className={className}
        data-testid='hover-card-content'>
        Hover card content
      </HoverCardContent>
    </HoverCard>,
  );
}

describe("HoverCard", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("keeps the closed popup mounted through its Portal", async () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <HoverCard>
        <HoverCardTrigger href='/profile'>Profile</HoverCardTrigger>
        <HoverCardContent
          keepMounted
          ref={ref}>
          Persistent preview
        </HoverCardContent>
      </HoverCard>,
    );
    await waitFor(() => expect(ref.current).toBeInTheDocument());
    expect(ref.current).toHaveAttribute("data-closed");
    expect(ref.current).not.toHaveAttribute("keepMounted");
  });

  it("uses Popup state types and routes function offsets to the measured Positioner", async () => {
    const anchor = {getBoundingClientRect: (): DOMRect => new DOMRect(200, 100, 80, 20)};
    const sideOffset = vi.fn<Exclude<HoverCardContent.Props["sideOffset"], number | undefined>>(() => 12);
    const alignOffset = vi.fn<Exclude<HoverCardContent.Props["alignOffset"], number | undefined>>(() => 6);
    const ref = React.createRef<HTMLDivElement>();
    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger href='/profile'>Profile</HoverCardTrigger>
        <HoverCardContent
          ref={ref}
          anchor={anchor}
          side='right'
          align='end'
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionAvoidance={{side: "none", align: "none"}}
          className={(state) => (state.open ? "live-open" : "live-closed")}>
          Measured preview
        </HoverCardContent>
      </HoverCard>,
    );

    await waitFor(() => expect(sideOffset).toHaveBeenCalledWith(expect.objectContaining({anchor: {width: 80, height: 20}})));
    expect(alignOffset).toHaveBeenCalledWith(expect.objectContaining({side: "right", align: "end"}));
    expect(ref.current).toBe(screen.getByText("Measured preview"));
    expect(ref.current).toHaveClass("live-open");
    expect(ref.current).toHaveAttribute("data-side", "right");
    expectTypeOf<HoverCardContent.State>().toEqualTypeOf<import("@base-ui/react/preview-card").PreviewCard.Popup.State>();
  });

  it("routes semantic props and event handlers to the popup", async () => {
    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger href='/profile'>Profile</HoverCardTrigger>
        <HoverCardContent
          aria-label='Profile preview'
          role='region'
          id='profile-preview'>
          Details
        </HoverCardContent>
      </HoverCard>,
    );

    const popup = await screen.findByText("Details");
    expect(popup).toHaveAttribute("role", "region");
    expect(popup).toHaveAttribute("aria-label", "Profile preview");
    expect(popup).toHaveAttribute("id", "profile-preview");
  });

  it("passes live primitive state to trigger and popup render callbacks", async () => {
    const user = userEvent.setup();
    render(
      <HoverCard>
        <HoverCardTrigger
          href='/profile'
          delay={0}
          render={(props, state) => <a {...props}>{state.open ? "Opened" : "Closed"}</a>}
        />
        <HoverCardContent
          render={(props, state) => (
            <section
              {...props}
              data-live-open={String(state.open)}
            />
          )}>
          Popup body
        </HoverCardContent>
      </HoverCard>,
    );

    await user.hover(screen.getByRole("link", {name: "Closed"}));
    expect(await screen.findByRole("link", {name: "Opened"})).toBeInTheDocument();
    expect(screen.getByText("Popup body")).toHaveAttribute("data-live-open", "true");
  });

  it("preserves composed trigger content, refs, classes and both event handlers", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLAnchorElement>();
    const childClick = vi.fn();
    const outerClick = vi.fn();
    render(
      <HoverCard>
        <HoverCardTrigger
          ref={ref}
          className='outer-link'
          onClick={outerClick}
          render={
            <a
              ref={childRef}
              href='#profile'
              className='child-link'
              onClick={childClick}>
              Composed profile
            </a>
          }
        />
        <HoverCardContent>Preview</HoverCardContent>
      </HoverCard>,
    );
    const trigger = screen.getByRole("link", {name: "Composed profile"});
    await user.click(trigger);
    expect(ref.current).toBe(trigger);
    expect(childRef.current).toBe(trigger);
    expect(trigger).toHaveClass("outer-link", "child-link");
    expect(trigger).toHaveAttribute("href", "#profile");
    expect(childClick).toHaveBeenCalledOnce();
    expect(outerClick).toHaveBeenCalledOnce();
  });

  it("routes popup event currentTarget and canonical render-element content to Popup", async () => {
    const user = userEvent.setup();
    let clickedElement: HTMLElement | undefined;
    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger href='/profile'>Profile</HoverCardTrigger>
        <HoverCardContent
          render={<section>Composed preview</section>}
          onClick={(event) => {
            clickedElement = event.currentTarget;
          }}
        />
      </HoverCard>,
    );
    const popup = await screen.findByText("Composed preview");
    await user.click(popup);
    expect(clickedElement).toBe(popup);
    expect(popup.tagName).toBe("SECTION");
  });

  it("uses the pinned upstream default sideOffset=4 and alignOffset=4", async () => {
    const anchor = {getBoundingClientRect: (): DOMRect => new DOMRect(200, 100, 80, 20)};
    render(
      <HoverCard defaultOpen>
        <HoverCardTrigger href='/profile'>Profile</HoverCardTrigger>
        <HoverCardContent
          anchor={anchor}
          align='start'
          collisionAvoidance={{side: "none", align: "none"}}>
          Default placement
        </HoverCardContent>
      </HoverCard>,
    );
    const popup = await screen.findByText("Default placement");
    await waitFor(() => expect(popup.parentElement).toHaveStyle({transform: "translate(204px, 124px)"}));
  });

  it("closes after keyboard focus leaves the trigger link", async () => {
    const user = userEvent.setup();
    render(
      <>
        <HoverCard>
          <HoverCardTrigger
            href='/profile'
            closeDelay={0}>
            Profile
          </HoverCardTrigger>
          <HoverCardContent>Keyboard preview</HoverCardContent>
        </HoverCard>
        <button>Next target</button>
      </>,
    );
    await user.tab();
    expect(await screen.findByText("Keyboard preview")).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("button", {name: "Next target"})).toHaveFocus();
    await waitFor(() => expect(screen.queryByText("Keyboard preview")).not.toBeInTheDocument());
  });

  describe("trigger-owned timing", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      cleanup();
      vi.clearAllTimers();
      vi.useRealTimers();
    });

    it("opens at 1000ms and closes only after the requested close deadline", async () => {
      render(
        <HoverCard>
          <HoverCardTrigger
            href='/profile'
            delay={1000}
            closeDelay={1000}>
            Profile
          </HoverCardTrigger>
          <HoverCardContent>Delayed preview</HoverCardContent>
        </HoverCard>,
      );
      const trigger = screen.getByRole("link", {name: "Profile"});
      fireEvent.pointerEnter(trigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(trigger);
      await act(async () => vi.advanceTimersByTimeAsync(999));
      expect(screen.queryByText("Delayed preview")).not.toBeInTheDocument();
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expect(screen.getByText("Delayed preview")).toBeInTheDocument();
      fireEvent.mouseLeave(trigger, {relatedTarget: document.body});
      fireEvent.mouseMove(document.body, {clientX: 600, clientY: 400});
      await act(async () => vi.advanceTimersByTimeAsync(999));
      expect(screen.getByText("Delayed preview")).toHaveAttribute("data-open");
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expect(screen.getByText("Delayed preview")).toHaveAttribute("data-closed");
      await act(async () => vi.runOnlyPendingTimersAsync());
      expect(screen.queryByText("Delayed preview")).not.toBeInTheDocument();
    });

    it("honors a zero delay without waiting for the primitive's 600ms default", async () => {
      render(
        <HoverCard>
          <HoverCardTrigger
            href='/profile'
            delay={0}>
            Profile
          </HoverCardTrigger>
          <HoverCardContent>Immediate preview</HoverCardContent>
        </HoverCard>,
      );
      const trigger = screen.getByRole("link", {name: "Profile"});
      fireEvent.pointerEnter(trigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(trigger);
      await act(async () => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText("Immediate preview")).toBeInTheDocument();
    });
  });

  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    renderHoverCard({defaultOpen: true});

    // Assert
    expect(screen.getByRole("link", {name: "Open hover card"})).toBeInTheDocument();
    expect(await screen.findByTestId("hover-card-content")).toBeVisible();
  });

  it("opens when the trigger is hovered", async () => {
    // Arrange
    const user = userEvent.setup();
    renderHoverCard({defaultOpen: false});

    // Act
    await user.hover(screen.getByRole("link", {name: "Open hover card"}));

    // Assert
    expect(await screen.findByTestId("hover-card-content")).toBeVisible();
  });

  it("closes when hover leaves the trigger", async () => {
    // Arrange
    const user = userEvent.setup();
    renderHoverCard({defaultOpen: false});
    const trigger = screen.getByRole("link", {name: "Open hover card"});
    await user.hover(trigger);
    expect(await screen.findByTestId("hover-card-content")).toBeVisible();

    // Act
    await user.unhover(trigger);

    // Assert
    await waitFor(() => {
      expect(screen.queryByTestId("hover-card-content")).not.toBeInTheDocument();
    });
  });

  it("applies a custom className to the popup content", async () => {
    // Arrange
    renderHoverCard({className: "custom-hover-card-content", defaultOpen: true});

    // Assert
    expect(await screen.findByText("Hover card content")).toHaveClass("custom-hover-card-content");
  });

  it("supports rendering a custom trigger element", async () => {
    // Arrange
    const user = userEvent.setup();
    renderHoverCard({customTrigger: true});

    // Act
    await user.hover(screen.getByRole("link", {name: "Open hover card"}));

    // Assert
    expect(await screen.findByTestId("hover-card-content")).toBeVisible();
  });

  it("remains keyboard accessible through its trigger link", async () => {
    // Arrange
    const user = userEvent.setup();
    renderHoverCard({defaultOpen: false});
    const trigger = screen.getByRole("link", {name: "Open hover card"});

    // Act
    await user.tab();

    // Assert
    expect(await screen.findByTestId("hover-card-content")).toBeVisible();
    expect(trigger).toHaveAttribute("href", "/profile");
  });
});
