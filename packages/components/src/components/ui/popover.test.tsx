import * as React from "react";
import {readFileSync} from "node:fs";
import {join} from "node:path";

import {act, cleanup, render, screen, waitFor} from "@testing-library/react";
import {DirectionProvider} from "@base-ui/react/direction-provider";
import userEvent from "@testing-library/user-event";
import {afterEach, describe, expect, expectTypeOf, it, vi} from "vitest";

import {Popover, PopoverContent, PopoverDescription, PopoverHeader, PopoverTitle, PopoverTrigger} from "./popover";

interface PopoverTestHarnessProps {
  className?: string;
  defaultOpen?: boolean;
  triggerAsChild?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
  onOpenChange?: (open: boolean) => void;
}

function PopoverTestHarness({
  className,
  defaultOpen = false,
  triggerAsChild = false,
  side,
  align,
  sideOffset,
  onOpenChange,
}: Readonly<PopoverTestHarnessProps>): React.JSX.Element {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        onOpenChange?.(nextOpen);
      }}>
      <PopoverTrigger render={triggerAsChild ? <button type='button'>Open popover</button> : undefined}>
        {triggerAsChild ? undefined : "Open popover"}
      </PopoverTrigger>
      <PopoverContent
        className={className}
        data-testid='popover-content'
        side={side}
        align={align}
        sideOffset={sideOffset}>
        <span>Popover body</span>
        <button
          type='button'
          onClick={() => setOpen(false)}>
          Close popover
        </button>
      </PopoverContent>
    </Popover>
  );
}

describe("Popover", () => {
  it("refresh accessibility: constrains popup width/height and wraps unbroken content", () => {
    const css = readFileSync(join(import.meta.dirname, "popover.module.css"), "utf8");
    expect(css).toMatch(/\.popup\s*\{[^}]*max-width:\s*min\(var\(--available-width/u);
    expect(css).toMatch(/\.popup\s*\{[^}]*max-height:\s*var\(--available-height/u);
    expect(css).toMatch(/\.popup\s*\{[^}]*overflow-wrap:\s*anywhere/u);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("names and describes the popup through actual Title and Description primitives", async () => {
    expect(PopoverTitle).toBeDefined();
    expect(PopoverDescription).toBeDefined();
    expect(PopoverHeader).toBeDefined();
    const headerRef = React.createRef<HTMLDivElement>();
    const titleRef = React.createRef<HTMLHeadingElement>();
    const descriptionRef = React.createRef<HTMLParagraphElement>();
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>
          <PopoverHeader
            ref={headerRef}
            className='custom-header'>
            <PopoverTitle
              ref={titleRef}
              className='custom-title'>
              Actions
            </PopoverTitle>
            <PopoverDescription
              ref={descriptionRef}
              className='custom-description'>
              Choose an action
            </PopoverDescription>
          </PopoverHeader>
        </PopoverContent>
      </Popover>,
    );

    const popup = await screen.findByRole("dialog", {name: "Actions"});
    expect(popup).toHaveAccessibleDescription("Choose an action");
    expect(headerRef.current?.tagName).toBe("DIV");
    expect(headerRef.current).toHaveClass("custom-header");
    expect(titleRef.current).toBe(screen.getByRole("heading", {name: "Actions", level: 2}));
    expect(descriptionRef.current).toHaveClass("custom-description");
    expectTypeOf<PopoverContent.Props["finalFocus"]>().toEqualTypeOf<import("@base-ui/react/popover").Popover.Popup.Props["finalFocus"]>();
  });

  it("keeps a closed popup mounted through the Portal, not a leaked DOM prop", async () => {
    const ref = React.createRef<HTMLDivElement>();
    render(
      <Popover>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent
          keepMounted
          ref={ref}
          aria-label='Actions'>
          Persistent body
        </PopoverContent>
      </Popover>,
    );

    await waitFor(() => expect(ref.current).toBeInTheDocument());
    expect(ref.current).toHaveAttribute("data-closed");
    expect(ref.current).not.toHaveAttribute("keepMounted");
  });

  it("positions against an explicit measured anchor with logical RTL side and function offsets", async () => {
    const sideOffset = vi.fn<Exclude<PopoverContent.Props["sideOffset"], number | undefined>>(() => 12);
    const alignOffset = vi.fn<Exclude<PopoverContent.Props["alignOffset"], number | undefined>>(() => 6);
    const anchor = {getBoundingClientRect: (): DOMRect => new DOMRect(200, 100, 80, 20)};
    render(
      <DirectionProvider direction='rtl'>
        <Popover defaultOpen>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent
            aria-label='Measured'
            anchor={anchor}
            side='inline-end'
            align='start'
            sideOffset={sideOffset}
            alignOffset={alignOffset}
            positionMethod='fixed'
            collisionAvoidance={{side: "none", align: "none"}}
            collisionBoundary={{x: 0, y: 0, width: 1000, height: 600}}
            collisionPadding={0}>
            Content
          </PopoverContent>
        </Popover>
      </DirectionProvider>,
    );

    const popup = await screen.findByRole("dialog", {name: "Measured"});
    await waitFor(() => expect(sideOffset).toHaveBeenCalledWith(expect.objectContaining({anchor: {width: 80, height: 20}})));
    expect(alignOffset).toHaveBeenCalledWith(expect.objectContaining({align: "start"}));
    expect(popup).toHaveAttribute("data-side", "inline-end");
    expect(popup).toHaveAttribute("data-align", "start");
    expect(popup.parentElement).toHaveStyle({position: "fixed"});
    await waitFor(() => expect(popup.parentElement).toHaveStyle({transform: "translate(188px, 106px)"}));
    expect(popup).not.toHaveAttribute("anchor");
    expect(popup).not.toHaveAttribute("sideOffset");
  });

  it("places PopoverContent accessible naming on the popup", () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent aria-label='Actions'>Menu body</PopoverContent>
      </Popover>,
    );

    expect(screen.getByRole("dialog", {name: "Actions"})).toBeInTheDocument();
  });

  it("preserves trigger slot refs, child handlers, classes and Base UI event cancellation", async () => {
    const user = userEvent.setup();
    const ref = React.createRef<HTMLElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const onChildClick = vi.fn();
    render(
      <Popover>
        <PopoverTrigger
          ref={ref}
          className='outer-trigger'
          onClick={(event) => event.preventBaseUIHandler()}
          render={
            <button
              ref={childRef}
              className='child-trigger'
              onClick={onChildClick}>
              Cancelled
            </button>
          }
        />
        <PopoverContent>Must stay closed</PopoverContent>
      </Popover>,
    );

    const trigger = screen.getByRole("button", {name: "Cancelled"});
    await user.click(trigger);
    expect(ref.current).toBe(trigger);
    expect(childRef.current).toBe(trigger);
    expect(trigger).toHaveClass("outer-trigger", "child-trigger");
    expect(onChildClick).toHaveBeenCalledOnce();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("routes popup refs, ids, class callbacks and event currentTarget to the semantic element", async () => {
    const user = userEvent.setup();
    const popupRef = React.createRef<HTMLDivElement>();
    let clickedElement: HTMLElement | undefined;
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent
          ref={popupRef}
          id='semantic-popup'
          className={(state) => (state.open ? "popup-open" : "popup-closed")}
          aria-label='Actions'
          onClick={(event) => {
            clickedElement = event.currentTarget;
          }}>
          Click the popup
        </PopoverContent>
      </Popover>,
    );
    const popup = await screen.findByRole("dialog", {name: "Actions"});
    await user.click(popup);
    expect(popupRef.current).toBe(popup);
    expect(popup).toHaveAttribute("id", "semantic-popup");
    expect(popup).toHaveClass("popup-open");
    expect(clickedElement).toBe(popup);
    expect(popup.parentElement).not.toHaveAttribute("id", "semantic-popup");
  });

  it("preserves canonical render-element children on the popup", async () => {
    render(
      <Popover defaultOpen>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent
          aria-label='Composed'
          render={<section>Element body</section>}
        />
      </Popover>,
    );
    expect(await screen.findByRole("dialog", {name: "Composed"})).toHaveTextContent("Element body");
  });

  it("passes initial and final focus callbacks the actual interaction types", async () => {
    const user = userEvent.setup();
    const inside = React.createRef<HTMLButtonElement>();
    const outside = React.createRef<HTMLButtonElement>();
    const openTypes: string[] = [];
    const closeTypes: string[] = [];
    render(
      <>
        <button ref={outside}>Return target</button>
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent
            initialFocus={(type) => {
              openTypes.push(type);
              return inside.current;
            }}
            finalFocus={(type) => {
              closeTypes.push(type);
              return outside.current;
            }}>
            <button ref={inside}>Chosen initial target</button>
          </PopoverContent>
        </Popover>
      </>,
    );
    await user.click(screen.getByRole("button", {name: "Open"}));
    await waitFor(() => expect(inside.current).toHaveFocus());
    expect(openTypes).toEqual(["mouse"]);
    await user.keyboard("{Escape}");
    await waitFor(() => expect(outside.current).toHaveFocus());
    expect(closeTypes).toEqual(["keyboard"]);
  });

  it("leaves root lifecycle timing and prevented unmounting to Base UI", async () => {
    const user = userEvent.setup();
    const actionsRef = React.createRef<import("@base-ui/react/popover").Popover.Root.Actions>();
    const events: string[] = [];
    render(
      <Popover
        actionsRef={actionsRef}
        onOpenChange={(open, details) => {
          events.push(`change:${open}:${details.reason}`);
          if (!open) details.preventUnmountOnClose();
        }}
        onOpenChangeComplete={(open) => events.push(`complete:${open}`)}>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent aria-label='Lifecycle'>Body</PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", {name: "Open"}));
    await waitFor(() => expect(events).toContain("complete:true"));
    expect(events[0]).toBe("change:true:trigger-press");
    await user.keyboard("{Escape}");
    expect(events).toContain("change:false:escape-key");
    expect(screen.getByRole("dialog", {name: "Lifecycle", hidden: true})).toBeInTheDocument();
    expect(events).not.toContain("complete:false");
    await act(async () => actionsRef.current?.unmount());
    await waitFor(() => expect(screen.queryByRole("dialog", {hidden: true})).not.toBeInTheDocument());
    expect(events).toContain("complete:false");
  });

  it("cancels root open requests without overriding the primitive's event details", async () => {
    const user = userEvent.setup();
    render(
      <Popover onOpenChange={(_open, details) => details.cancel()}>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Should remain closed</PopoverContent>
      </Popover>,
    );
    await user.click(screen.getByRole("button", {name: "Open"}));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("retains multiple ordinary trigger children", () => {
    render(
      <Popover>
        <PopoverTrigger>
          <span>First</span>
          <span>Second</span>
        </PopoverTrigger>
      </Popover>,
    );
    expect(screen.getByRole("button", {name: "First Second"})).toBeInTheDocument();
  });

  it("passes live primitive state to trigger and popup render callbacks", async () => {
    const user = userEvent.setup();
    render(
      <Popover>
        <PopoverTrigger render={(props, state) => <button {...props}>{state.open ? "Opened" : "Closed"}</button>} />
        <PopoverContent
          render={(props, state) => (
            <section
              {...props}
              data-live-open={String(state.open)}
            />
          )}>
          Popup body
        </PopoverContent>
      </Popover>,
    );

    await user.click(screen.getByRole("button", {name: "Closed"}));
    expect(screen.getByRole("button", {name: "Opened"})).toBeInTheDocument();
    expect(await screen.findByRole("dialog")).toHaveAttribute("data-live-open", "true");
  });

  it("returns focus to the popup's requested final focus target", async () => {
    const user = userEvent.setup();
    const finalFocus = React.createRef<HTMLButtonElement>();
    render(
      <>
        <button ref={finalFocus}>Return here</button>
        <Popover>
          <PopoverTrigger>Open</PopoverTrigger>
          <PopoverContent finalFocus={finalFocus}>
            <button>Inside</button>
          </PopoverContent>
        </Popover>
      </>,
    );

    await user.click(screen.getByRole("button", {name: "Open"}));
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.getByRole("button", {name: "Return here"})).toHaveFocus());
  });

  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    render(<PopoverTestHarness defaultOpen />);

    // Assert
    expect(screen.getByRole("button", {name: "Open popover"})).toBeInTheDocument();
    expect(await screen.findByRole("dialog")).toBeVisible();
  });

  it("opens the content when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PopoverTestHarness />);

    // Act
    await user.click(screen.getByRole("button", {name: "Open popover"}));

    // Assert
    expect(await screen.findByRole("dialog")).toBeVisible();
  });

  it("closes when the close button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PopoverTestHarness />);
    await user.click(screen.getByRole("button", {name: "Open popover"}));

    // Act
    await user.click(await screen.findByRole("button", {name: "Close popover"}));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("applies a custom className to the popup content", async () => {
    // Arrange
    render(
      <PopoverTestHarness
        className='custom-popover-content'
        defaultOpen
      />,
    );

    // Assert
    expect(await screen.findByRole("dialog")).toHaveClass("custom-popover-content");
  });

  it("supports rendering the trigger as a child element", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PopoverTestHarness triggerAsChild />);

    // Act
    await user.click(screen.getByRole("button", {name: "Open popover"}));

    // Assert
    expect(await screen.findByRole("dialog")).toBeVisible();
  });

  it("exposes popover accessibility semantics", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PopoverTestHarness />);

    // Act
    await user.click(screen.getByRole("button", {name: "Open popover"}));

    // Assert
    const trigger = screen.getByRole("button", {name: "Open popover"});
    const popover = await screen.findByRole("dialog");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(popover).toBeVisible();
  });

  it("closes the popover when Escape is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PopoverTestHarness />);
    await user.click(screen.getByRole("button", {name: "Open popover"}));
    expect(await screen.findByRole("dialog")).toBeVisible();

    // Act — Base UI Popover calls onOpenChange(false) on Escape; the controlled
    // harness reflects that change and removes the popup from the DOM
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("renders PopoverContent with different side prop", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PopoverTestHarness side='top' />);

    // Act
    await user.click(screen.getByRole("button", {name: "Open popover"}));

    // Assert
    expect(await screen.findByRole("dialog")).toBeVisible();
  });

  it("renders PopoverContent with different align prop", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PopoverTestHarness align='start' />);

    // Act
    await user.click(screen.getByRole("button", {name: "Open popover"}));

    // Assert
    expect(await screen.findByRole("dialog")).toBeVisible();
  });

  it("renders PopoverContent with custom sideOffset", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<PopoverTestHarness sideOffset={10} />);

    // Act
    await user.click(screen.getByRole("button", {name: "Open popover"}));

    // Assert
    expect(await screen.findByRole("dialog")).toBeVisible();
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleOpenChange = vi.fn<(open: boolean) => void>();

    render(<PopoverTestHarness onOpenChange={handleOpenChange} />);

    const trigger = screen.getByRole("button", {name: "Open popover"});

    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Act
    await user.click(trigger);

    // Assert
    expect(handleOpenChange).toHaveBeenCalledWith(true);
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
