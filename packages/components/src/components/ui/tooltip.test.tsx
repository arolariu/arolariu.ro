import * as React from "react";
import {act, cleanup, fireEvent, render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {afterEach, beforeEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {Tooltip, TooltipArrow, TooltipContent, TooltipProvider, TooltipTrigger} from "./tooltip";

function renderTooltip({
  className,
  defaultOpen = false,
  triggerAsChild = false,
}: Readonly<{
  className?: string;
  defaultOpen?: boolean;
  triggerAsChild?: boolean;
}>) {
  return render(
    <Tooltip
      defaultOpen={defaultOpen}
      delayDuration={0}>
      <TooltipTrigger asChild={triggerAsChild}>
        {triggerAsChild ? <button type='button'>Open tooltip</button> : "Open tooltip"}
      </TooltipTrigger>
      <TooltipContent
        className={className}
        data-testid='tooltip-content'>
        Tooltip content
      </TooltipContent>
    </Tooltip>,
  );
}

describe("Tooltip", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("preserves live Trigger render callbacks, refs and merged classes", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLElement>();
    render(
      <Tooltip delayDuration={0}>
        <TooltipTrigger
          ref={ref}
          className={(state) => (state.open ? "trigger-open" : "trigger-closed")}
          render={(props, state) => <button {...props}>{state.open ? "Opened trigger" : "Closed trigger"}</button>}
        />
        <TooltipContent
          className={(state) => (state.open ? "popup-open" : "popup-closed")}
          render={(props, state) => (
            <section
              {...props}
              data-live-open={String(state.open)}>
              Callback body
            </section>
          )}
        />
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", {name: "Closed trigger"});
    await user.hover(trigger);
    const popup = await screen.findByText("Callback body");
    expect(ref.current).toBe(screen.getByRole("button", {name: "Opened trigger"}));
    expect(ref.current).toHaveClass("trigger-open");
    expect(popup).toHaveClass("popup-open");
    expect(popup).toHaveAttribute("data-live-open", "true");
    expect(popup.querySelector('[data-slot="tooltip-arrow"]')).toBeInTheDocument();
  });

  it("preserves slot child refs and focus-handler cancellation", async () => {
    const ref = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const childFocus = vi.fn();
    render(
      <Tooltip>
        <TooltipTrigger
          asChild
          ref={ref}
          className='outer-trigger'
          onFocus={(event) => event.preventBaseUIHandler()}>
          <button
            ref={childRef}
            className='child-trigger'
            onFocus={childFocus}>
            Cancelled focus
          </button>
        </TooltipTrigger>
        <TooltipContent>Must remain closed</TooltipContent>
      </Tooltip>,
    );
    const trigger = screen.getByRole("button", {name: "Cancelled focus"});
    fireEvent.focus(trigger);
    expect(ref.current).toBe(trigger);
    expect(childRef.current).toBe(trigger);
    expect(trigger).toHaveClass("outer-trigger", "child-trigger");
    expect(childFocus).toHaveBeenCalledOnce();
    expect(screen.queryByText("Must remain closed")).not.toBeInTheDocument();
  });

  it("composes exactly one custom arrow with a real primitive state and ref", async () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent
          showArrow={false}
          side='bottom'
          collisionAvoidance={{side: "none", align: "none"}}>
          Custom help
          <TooltipArrow
            ref={ref}
            className={(state) => (state.open ? "arrow-open" : "arrow-closed")}
            render={(props, state) => (
              <div
                {...props}
                data-arrow-side={state.side}
              />
            )}
          />
        </TooltipContent>
      </Tooltip>,
    );
    const popup = await screen.findByText("Custom help");
    expect(popup.querySelectorAll('[data-slot="tooltip-arrow"]')).toHaveLength(1);
    expect(ref.current).toHaveClass("arrow-open");
    expect(ref.current).toHaveAttribute("data-arrow-side", "bottom");
    expect(ref.current).toHaveAttribute("aria-hidden", "true");
  });

  it("supports lazy component render boundaries without losing element content or refs", async () => {
    const LazySurface = React.lazy(async () => ({
      default: React.forwardRef<HTMLDivElement, React.ComponentProps<"div">>((props, ref) => (
        <div
          {...props}
          ref={ref}
        />
      )),
    }));
    const popupRef = React.createRef<HTMLDivElement>();
    const childRef = React.createRef<HTMLDivElement>();
    render(
      <React.Suspense fallback='Loading surface'>
        <Tooltip defaultOpen>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent
            ref={popupRef}
            render={<LazySurface ref={childRef}>Lazy body</LazySurface>}
          />
        </Tooltip>
      </React.Suspense>,
    );
    const popup = await screen.findByText("Lazy body");
    expect(popupRef.current).toBe(popup);
    expect(childRef.current).toBe(popup);
    expect(popup.querySelector('[data-slot="tooltip-arrow"]')).toBeInTheDocument();
  });

  it("retains every child of an invalid multi-child legacy slot rather than silently selecting the first", () => {
    render(
      <Tooltip>
        <TooltipTrigger asChild>
          <span>First</span>
          <span>Second</span>
        </TooltipTrigger>
      </Tooltip>,
    );
    expect(screen.getByRole("button", {name: "First Second"})).toBeInTheDocument();
  });

  it("renders a primitive arrow and routes measured alignment options to the Positioner", async () => {
    expect(TooltipArrow).toBeDefined();
    const ref = React.createRef<HTMLDivElement>();
    const anchor = {getBoundingClientRect: (): DOMRect => new DOMRect(200, 100, 80, 20)};
    const sideOffset = vi.fn<Exclude<TooltipContent.Props["sideOffset"], number | undefined>>(() => 12);
    const alignOffset = vi.fn<Exclude<TooltipContent.Props["alignOffset"], number | undefined>>(() => 6);
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent
          ref={ref}
          aria-label='Help'
          anchor={anchor}
          side='bottom'
          align='start'
          sideOffset={sideOffset}
          alignOffset={alignOffset}
          collisionAvoidance={{side: "none", align: "none"}}>
          Aligned help
        </TooltipContent>
      </Tooltip>,
    );

    const popup = await screen.findByText("Aligned help");
    await waitFor(() => expect(sideOffset).toHaveBeenCalledWith(expect.objectContaining({anchor: {width: 80, height: 20}})));
    expect(alignOffset).toHaveBeenCalledWith(expect.objectContaining({side: "bottom", align: "start"}));
    expect(ref.current).toBe(popup);
    expect(popup).toHaveAttribute("aria-label", "Help");
    expect(popup).toHaveAttribute("data-align", "start");
    expect(popup.querySelector('[data-slot="tooltip-arrow"]')).toBeInTheDocument();
    expectTypeOf<TooltipContent.State>().toEqualTypeOf<import("@base-ui/react/tooltip").Tooltip.Popup.State>();
    vi.restoreAllMocks();
  });

  it("preserves a composed render element's children while adding the arrow", async () => {
    render(
      <Tooltip defaultOpen>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent render={<section>Composed body</section>} />
      </Tooltip>,
    );

    const popup = await screen.findByText("Composed body");
    expect(popup.tagName).toBe("SECTION");
    expect(popup.querySelector('[data-slot="tooltip-arrow"]')).toBeInTheDocument();
  });

  it("keeps closed popup content mounted on the Portal", async () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Tooltip>
        <TooltipTrigger>Hover</TooltipTrigger>
        <TooltipContent
          keepMounted
          ref={ref}>
          Persistent help
        </TooltipContent>
      </Tooltip>,
    );
    await waitFor(() => expect(ref.current).toBeInTheDocument());
    expect(ref.current).toHaveAttribute("data-closed");
    expect(ref.current).not.toHaveAttribute("keepMounted");
  });

  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    renderTooltip({defaultOpen: true});

    // Assert
    expect(screen.getByRole("button", {name: "Open tooltip"})).toBeInTheDocument();
    expect(await screen.findByTestId("tooltip-content")).toBeVisible();
  });

  describe("Tooltip timing", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => {
      cleanup();
      vi.clearAllTimers();
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it("uses the provider's 1000ms opening delay instead of the primitive default", async () => {
      render(
        <TooltipProvider delayDuration={1000}>
          <Tooltip disableHoverablePopup>
            <TooltipTrigger>Hover</TooltipTrigger>
            <TooltipContent>Delayed content</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );

      const trigger = screen.getByRole("button", {name: "Hover"});
      fireEvent.pointerEnter(trigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);
      await act(async () => vi.advanceTimersByTimeAsync(999));
      expect(screen.queryByText("Delayed content")).not.toBeInTheDocument();
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expect(screen.getByText("Delayed content")).toBeInTheDocument();
    });

    it("routes legacy root delayDuration=0 to the trigger timing contract", async () => {
      render(
        <Tooltip
          delayDuration={0}
          disableHoverablePopup>
          <TooltipTrigger>Hover</TooltipTrigger>
          <TooltipContent>Immediate content</TooltipContent>
        </Tooltip>,
      );

      const trigger = screen.getByRole("button", {name: "Hover"});
      fireEvent.pointerEnter(trigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);
      await act(async () => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText("Immediate content")).toBeInTheDocument();
    });

    it("uses canonical Provider delay=0 ahead of the legacy delayDuration alias", async () => {
      render(
        <TooltipProvider
          delay={0}
          delayDuration={1000}>
          <Tooltip disableHoverablePopup>
            <TooltipTrigger>Hover</TooltipTrigger>
            <TooltipContent>Canonical delay</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
      const trigger = screen.getByRole("button", {name: "Hover"});
      fireEvent.pointerEnter(trigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(trigger);
      fireEvent.mouseMove(trigger);
      await act(async () => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText("Canonical delay")).toBeInTheDocument();
    });

    it("uses a root-local 1000ms delay over Provider zero, and explicit Trigger zero over that root", async () => {
      render(
        <TooltipProvider delay={0}>
          <Tooltip
            delayDuration={1000}
            disableHoverablePopup>
            <TooltipTrigger>Slow root</TooltipTrigger>
            <TooltipContent>Root-delayed help</TooltipContent>
          </Tooltip>
          <Tooltip
            delayDuration={1000}
            disableHoverablePopup>
            <TooltipTrigger delay={0}>Fast trigger</TooltipTrigger>
            <TooltipContent>Trigger-immediate help</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
      const slowTrigger = screen.getByRole("button", {name: "Slow root"});
      fireEvent.pointerEnter(slowTrigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(slowTrigger);
      fireEvent.mouseMove(slowTrigger);
      await act(async () => vi.advanceTimersByTimeAsync(999));
      expect(screen.queryByText("Root-delayed help")).not.toBeInTheDocument();
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expect(screen.getByText("Root-delayed help")).toBeInTheDocument();
      fireEvent.mouseLeave(slowTrigger, {relatedTarget: document.body});
      await act(async () => vi.advanceTimersByTimeAsync(500));
      const fastTrigger = screen.getByRole("button", {name: "Fast trigger"});
      fireEvent.pointerEnter(fastTrigger, {pointerType: "mouse"});
      fireEvent.mouseEnter(fastTrigger);
      fireEvent.mouseMove(fastTrigger);
      await act(async () => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText("Trigger-immediate help")).toBeInTheDocument();
    });

    it("honors Provider closeDelay and opens an adjacent tooltip instantly during the shared window", async () => {
      render(
        <TooltipProvider
          delay={1000}
          closeDelay={200}
          timeout={400}>
          <Tooltip disableHoverablePopup>
            <TooltipTrigger>First</TooltipTrigger>
            <TooltipContent>First help</TooltipContent>
          </Tooltip>
          <Tooltip disableHoverablePopup>
            <TooltipTrigger>Second</TooltipTrigger>
            <TooltipContent>Second help</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
      const first = screen.getByRole("button", {name: "First"});
      fireEvent.pointerEnter(first, {pointerType: "mouse"});
      fireEvent.mouseEnter(first);
      fireEvent.mouseMove(first);
      await act(async () => vi.advanceTimersByTimeAsync(1000));
      expect(screen.getByText("First help")).toBeInTheDocument();
      fireEvent.mouseLeave(first, {relatedTarget: document.body});
      await act(async () => vi.advanceTimersByTimeAsync(199));
      expect(screen.getByText("First help")).toHaveAttribute("data-open");
      await act(async () => vi.advanceTimersByTimeAsync(1));
      expect(screen.getByText("First help")).toHaveAttribute("data-closed");
      const second = screen.getByRole("button", {name: "Second"});
      fireEvent.pointerEnter(second, {pointerType: "mouse"});
      fireEvent.mouseEnter(second);
      fireEvent.mouseMove(second);
      await act(async () => vi.advanceTimersByTimeAsync(0));
      expect(screen.getByText("Second help")).toBeInTheDocument();
    });
  });

  it("opens on hover and focus", async () => {
    // Arrange
    const user = userEvent.setup();
    renderTooltip({defaultOpen: false});
    const trigger = screen.getByRole("button", {name: "Open tooltip"});

    // Act
    await user.hover(trigger);

    // Assert
    expect(await screen.findByTestId("tooltip-content")).toBeVisible();

    // Act
    await user.unhover(trigger);

    // Assert
    await waitFor(() => {
      expect(screen.queryByTestId("tooltip-content")).not.toBeInTheDocument();
    });

    // Act
    await user.tab();

    // Assert
    expect(await screen.findByTestId("tooltip-content")).toBeVisible();
  });

  it("closes when hover leaves the trigger", async () => {
    // Arrange
    const user = userEvent.setup();
    renderTooltip({defaultOpen: false});
    const trigger = screen.getByRole("button", {name: "Open tooltip"});
    await user.hover(trigger);
    expect(await screen.findByTestId("tooltip-content")).toBeVisible();

    // Act
    await user.unhover(trigger);

    // Assert
    await waitFor(() => {
      expect(screen.queryByTestId("tooltip-content")).not.toBeInTheDocument();
    });
  });

  it("applies a custom className to the popup content", async () => {
    // Arrange
    renderTooltip({className: "custom-tooltip-content", defaultOpen: true});

    // Assert
    expect(await screen.findByTestId("tooltip-content")).toHaveClass("custom-tooltip-content");
  });

  it("supports rendering the trigger as a child element", async () => {
    // Arrange
    const user = userEvent.setup();
    renderTooltip({triggerAsChild: true});

    // Act
    await user.hover(screen.getByRole("button", {name: "Open tooltip"}));

    // Assert
    expect(await screen.findByTestId("tooltip-content")).toBeVisible();
  });

  it("dismisses keyboard-opened tooltip on Escape and closes on blur", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Tooltip>
          <TooltipTrigger>Focus tooltip</TooltipTrigger>
          <TooltipContent>Keyboard help</TooltipContent>
        </Tooltip>
        <button>Next target</button>
      </>,
    );
    await user.tab();
    expect(await screen.findByText("Keyboard help")).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByText("Keyboard help")).not.toBeInTheDocument());
    await user.tab();
    await user.tab({shift: true});
    expect(await screen.findByText("Keyboard help")).toBeInTheDocument();
    await user.tab();
    expect(screen.getByRole("button", {name: "Next target"})).toHaveFocus();
    await waitFor(() => expect(screen.queryByText("Keyboard help")).not.toBeInTheDocument());
  });

  it("exposes tooltip accessibility semantics", async () => {
    // Arrange
    const user = userEvent.setup();
    renderTooltip({defaultOpen: false});
    const trigger = screen.getByRole("button", {name: "Open tooltip"});

    // Act
    await user.hover(trigger);

    // Assert
    const tooltip = await screen.findByTestId("tooltip-content");

    expect(tooltip).toHaveTextContent("Tooltip content");
    expect(tooltip).toHaveAttribute("tabindex", "-1");
    expect(tooltip).toHaveAttribute("data-side", "top");
  });
});
