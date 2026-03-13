import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "./collapsible";

function renderCollapsible(): HTMLElement {
  render(
    <Collapsible
      className='custom-root'
      data-testid='collapsible-root'>
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
});
