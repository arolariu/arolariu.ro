import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger} from "./sheet";
import styles from "./sheet.module.css";

function renderSheet({
  className,
  defaultOpen = false,
  side = "right",
  triggerAsChild = false,
}: Readonly<{
  className?: string;
  defaultOpen?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  triggerAsChild?: boolean;
}>) {
  return render(
    <Sheet defaultOpen={defaultOpen}>
      <SheetTrigger asChild={triggerAsChild}>{triggerAsChild ? <button type='button'>Open sheet</button> : "Open sheet"}</SheetTrigger>
      <SheetContent
        className={className}
        side={side}
        data-testid='sheet-content'>
        <SheetTitle>Sheet title</SheetTitle>
        <SheetDescription>Sheet description</SheetDescription>
      </SheetContent>
    </Sheet>,
  );
}

describe("Sheet", () => {
  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    renderSheet({defaultOpen: true});

    // Assert
    expect(screen.getByRole("button", {hidden: true, name: "Open sheet"})).toBeInTheDocument();
    expect(await screen.findByRole("dialog", {name: "Sheet title"})).toBeVisible();
  });

  it("opens the content when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderSheet({defaultOpen: false});

    // Act
    await user.click(screen.getByRole("button", {name: "Open sheet"}));

    // Assert
    expect(await screen.findByRole("dialog", {name: "Sheet title"})).toBeVisible();
  });

  it("closes when the close button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderSheet({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open sheet"}));

    // Act
    await user.click(await screen.findByRole("button", {name: "Close"}));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Sheet title"})).not.toBeInTheDocument();
    });
  });

  it("applies a custom className to the popup content", async () => {
    // Arrange
    renderSheet({className: "custom-sheet-content", defaultOpen: true});

    // Assert
    expect(await screen.findByTestId("sheet-content")).toHaveClass("custom-sheet-content");
  });

  it("supports rendering the trigger as a child element", async () => {
    // Arrange
    const user = userEvent.setup();
    renderSheet({triggerAsChild: true});

    // Act
    await user.click(screen.getByRole("button", {name: "Open sheet"}));

    // Assert
    expect(await screen.findByRole("dialog", {name: "Sheet title"})).toBeVisible();
  });

  it("applies the requested side positioning class", async () => {
    // Arrange
    renderSheet({defaultOpen: true, side: "left"});

    // Assert
    expect(await screen.findByTestId("sheet-content")).toHaveClass(styles.left);
  });

  it("exposes modal sheet accessibility semantics", async () => {
    // Arrange
    renderSheet({defaultOpen: true});

    // Assert
    const sheet = await screen.findByRole("dialog", {name: "Sheet title"});
    const trigger = screen.getByRole("button", {hidden: true, name: "Open sheet"});

    expect(sheet).toHaveAccessibleDescription("Sheet description");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
