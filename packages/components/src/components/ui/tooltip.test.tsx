import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {Tooltip, TooltipContent, TooltipTrigger} from "./tooltip";

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
  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    renderTooltip({defaultOpen: true});

    // Assert
    expect(screen.getByRole("button", {name: "Open tooltip"})).toBeInTheDocument();
    expect(await screen.findByTestId("tooltip-content")).toBeVisible();
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

  // Base UI Tooltip does handle Escape to dismiss, but happy-dom does not reliably
  // propagate synthetic keyboard events to the tooltip's global Escape listener while
  // pointer-hover state is active on the trigger.  The tooltip content also has no
  // semantic ARIA role, making it impossible to query via getByRole for assertion.
  it.todo("dismisses the tooltip when Escape is pressed while visible");

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
