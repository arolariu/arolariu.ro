import * as React from "react";

import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {Popover, PopoverAnchor, PopoverContent, PopoverTrigger} from "./popover";

interface PopoverTestHarnessProps {
  className?: string;
  defaultOpen?: boolean;
  triggerAsChild?: boolean;
  withAnchor?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  sideOffset?: number;
}

function PopoverTestHarness({
  className,
  defaultOpen = false,
  triggerAsChild = false,
  withAnchor = false,
  side,
  align,
  sideOffset,
}: Readonly<PopoverTestHarnessProps>): React.JSX.Element {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}>
      {withAnchor && <PopoverAnchor data-testid='popover-anchor'>Anchor element</PopoverAnchor>}
      <PopoverTrigger asChild={triggerAsChild}>
        {triggerAsChild ? <button type='button'>Open popover</button> : "Open popover"}
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

  it("renders PopoverAnchor when provided", () => {
    // Arrange & Act
    render(<PopoverTestHarness withAnchor />);

    // Assert
    expect(screen.getByTestId("popover-anchor")).toBeInTheDocument();
    expect(screen.getByText("Anchor element")).toBeInTheDocument();
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

  it("renders PopoverAnchor with custom className", () => {
    // Arrange & Act
    render(
      <Popover>
        <PopoverAnchor
          className='custom-anchor-class'
          data-testid='custom-anchor'>
          Anchor
        </PopoverAnchor>
        <PopoverTrigger>Open</PopoverTrigger>
        <PopoverContent>Content</PopoverContent>
      </Popover>,
    );

    // Assert
    const anchor = screen.getByTestId("custom-anchor");
    expect(anchor).toHaveClass("custom-anchor-class");
  });
});
