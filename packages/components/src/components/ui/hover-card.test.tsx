import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

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
