import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./alert-dialog";

function renderAlertDialog({
  className,
  defaultOpen = false,
  triggerAsChild = false,
}: Readonly<{
  className?: string;
  defaultOpen?: boolean;
  triggerAsChild?: boolean;
}>) {
  return render(
    <AlertDialog defaultOpen={defaultOpen}>
      <AlertDialogTrigger asChild={triggerAsChild}>
        {triggerAsChild ? <button type='button'>Open alert dialog</button> : "Open alert dialog"}
      </AlertDialogTrigger>
      <AlertDialogContent
        className={className}
        data-testid='alert-dialog-content'>
        <AlertDialogTitle>Alert title</AlertDialogTitle>
        <AlertDialogDescription>Alert description</AlertDialogDescription>
        <AlertDialogCancel>Close alert dialog</AlertDialogCancel>
      </AlertDialogContent>
    </AlertDialog>,
  );
}

describe("AlertDialog", () => {
  it("renders the root, trigger, and content without crashing", async () => {
    // Arrange
    renderAlertDialog({defaultOpen: true});

    // Assert
    expect(screen.getByRole("button", {hidden: true, name: "Open alert dialog"})).toBeInTheDocument();
    expect(await screen.findByRole("alertdialog", {name: "Alert title"})).toBeVisible();
  });

  it("opens the content when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderAlertDialog({defaultOpen: false});

    // Act
    await user.click(screen.getByRole("button", {name: "Open alert dialog"}));

    // Assert
    expect(await screen.findByRole("alertdialog", {name: "Alert title"})).toBeVisible();
  });

  it("closes when the close button is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    renderAlertDialog({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open alert dialog"}));

    // Act
    await user.click(await screen.findByRole("button", {name: "Close alert dialog"}));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("alertdialog", {name: "Alert title"})).not.toBeInTheDocument();
    });
  });

  it("applies a custom className to the popup content", async () => {
    // Arrange
    renderAlertDialog({className: "custom-alert-dialog-content", defaultOpen: true});

    // Assert
    expect(await screen.findByTestId("alert-dialog-content")).toHaveClass("custom-alert-dialog-content");
  });

  it("supports rendering the trigger as a child element", async () => {
    // Arrange
    const user = userEvent.setup();
    renderAlertDialog({triggerAsChild: true});

    // Act
    await user.click(screen.getByRole("button", {name: "Open alert dialog"}));

    // Assert
    expect(await screen.findByRole("alertdialog", {name: "Alert title"})).toBeVisible();
  });

  it("exposes alert dialog accessibility semantics", async () => {
    // Arrange
    renderAlertDialog({defaultOpen: true});

    // Assert
    const alertDialog = await screen.findByRole("alertdialog", {name: "Alert title"});
    const trigger = screen.getByRole("button", {hidden: true, name: "Open alert dialog"});

    expect(alertDialog).toHaveAccessibleDescription("Alert description");
    expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });
});
