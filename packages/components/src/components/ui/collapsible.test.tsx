import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "./collapsible";

function renderCollapsible({onOpenChange}: Readonly<{onOpenChange?: (open: boolean) => void}> = {}): HTMLElement {
  render(
    <Collapsible
      className='custom-root'
      data-testid='collapsible-root'
      onOpenChange={onOpenChange}>
      <CollapsibleTrigger className='custom-trigger'>Toggle details</CollapsibleTrigger>
      <CollapsibleContent
        className='custom-panel'
        data-testid='collapsible-panel'>
        Hidden details content
      </CollapsibleContent>
    </Collapsible>,
  );

  return screen.getByRole("button", {name: "Toggle details"});
}

describe("Collapsible", () => {
  it("renders the structure, merges class names, and exposes accessibility attributes", () => {
    // Arrange
    const trigger = renderCollapsible();

    // Assert
    expect(screen.getByTestId("collapsible-root")).toHaveClass("custom-root");
    expect(trigger).toHaveClass("custom-trigger");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveAttribute("type", "button");
  });

  it("expands and collapses the content when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const trigger = renderCollapsible();

    // Act
    await user.click(trigger);

    // Assert
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("collapsible-panel")).toBeVisible();
    expect(screen.getByTestId("collapsible-panel")).toHaveClass("custom-panel");
    expect(screen.getByText("Hidden details content")).toBeInTheDocument();

    // Act
    await user.click(trigger);

    // Assert
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("calls onOpenChange with the updated open state", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleOpenChange = vi.fn<(open: boolean) => void>();
    const trigger = renderCollapsible({onOpenChange: handleOpenChange});

    // Act
    await user.click(trigger);

    // Assert
    expect(handleOpenChange.mock.calls.at(-1)?.[0]).toBe(true);

    // Act
    await user.click(trigger);

    // Assert
    expect(handleOpenChange.mock.calls.at(-1)?.[0]).toBe(false);
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleOpenChange = vi.fn<(open: boolean) => void>();

    function ControlledCollapsible(): React.JSX.Element {
      const [open, setOpen] = React.useState(false);

      return (
        <Collapsible
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            handleOpenChange(nextOpen);
          }}>
          <CollapsibleTrigger>Toggle details</CollapsibleTrigger>
          <CollapsibleContent>Controlled details content</CollapsibleContent>
        </Collapsible>
      );
    }

    render(<ControlledCollapsible />);

    const trigger = screen.getByRole("button", {name: "Toggle details"});

    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Act
    await user.click(trigger);

    // Assert
    expect(handleOpenChange).toHaveBeenCalledWith(true);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Controlled details content")).toBeVisible();
  });

  it("supports rendering the trigger as a child element while preserving the non-asChild trigger path", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <Collapsible>
        <CollapsibleTrigger asChild>
          <button
            type='button'
            data-testid='trigger-child'>
            Toggle details
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent data-testid='collapsible-panel'>Hidden details content</CollapsibleContent>
      </Collapsible>,
    );

    const trigger = screen.getByTestId("trigger-child");

    // Assert
    expect(trigger.tagName).toBe("BUTTON");
    expect(screen.queryByRole("button", {name: "Toggle details"})).toBe(trigger);
    expect(trigger.querySelector("button")).toBeNull();
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    // Act
    await user.click(trigger);

    // Assert
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByTestId("collapsible-panel")).toBeVisible();
  });
});
