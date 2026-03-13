import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle, DialogTrigger} from "./dialog";

function renderDialog({
  className,
  defaultOpen = false,
  triggerAsChild = false,
}: Readonly<{
  className?: string;
  defaultOpen?: boolean;
  triggerAsChild?: boolean;
}>) {
  return render(
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild={triggerAsChild}>{triggerAsChild ? <button type='button'>Open dialog</button> : "Open dialog"}</DialogTrigger>
      <DialogContent
        className={className}
        data-testid='dialog-content'>
        <DialogTitle>Dialog title</DialogTitle>
        <DialogDescription>Dialog description</DialogDescription>
        <DialogClose>Close dialog</DialogClose>
      </DialogContent>
    </Dialog>,
  );
}

describe("Dialog", () => {
  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    renderDialog({defaultOpen: true});

    // Assert
    expect(screen.getByRole("button", {hidden: true, name: "Open dialog"})).toBeInTheDocument();
    expect(await screen.findByRole("dialog", {name: "Dialog title"})).toBeVisible();
  });

  it("opens the content when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDialog({defaultOpen: false});

    // Act
    await user.click(screen.getByRole("button", {name: "Open dialog"}));

    // Assert
    expect(await screen.findByRole("dialog", {name: "Dialog title"})).toBeVisible();
  });

  it("closes when the close button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDialog({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open dialog"}));

    // Act
    await user.click(await screen.findByRole("button", {name: "Close dialog"}));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Dialog title"})).not.toBeInTheDocument();
    });
  });

  it("applies a custom className to the popup content", async () => {
    // Arrange
    renderDialog({className: "custom-dialog-content", defaultOpen: true});

    // Assert
    expect(await screen.findByTestId("dialog-content")).toHaveClass("custom-dialog-content");
  });

  it("supports rendering the trigger as a child element", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDialog({triggerAsChild: true});

    // Act
    await user.click(screen.getByRole("button", {name: "Open dialog"}));

    // Assert
    expect(await screen.findByRole("dialog", {name: "Dialog title"})).toBeVisible();
  });

  it("exposes modal dialog accessibility semantics", async () => {
    // Arrange
    renderDialog({defaultOpen: true});

    // Assert
    const dialog = await screen.findByRole("dialog", {name: "Dialog title"});
    const trigger = screen.getByRole("button", {hidden: true, name: "Open dialog"});

    expect(dialog).toHaveAccessibleDescription("Dialog description");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
