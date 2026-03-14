import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it, vi as vitest} from "vitest";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
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

  it("renders AlertDialogHeader with children", async () => {
    // Arrange
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader data-testid='alert-header'>
            <AlertDialogTitle>Header Title</AlertDialogTitle>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Assert
    const header = await screen.findByTestId("alert-header");
    expect(header).toBeInTheDocument();
    expect(screen.getByText("Header Title")).toBeInTheDocument();
  });

  it("renders AlertDialogFooter with children", async () => {
    // Arrange
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Title</AlertDialogTitle>
          <AlertDialogDescription>Description</AlertDialogDescription>
          <AlertDialogFooter data-testid='alert-footer'>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Assert
    const footer = await screen.findByTestId("alert-footer");
    expect(footer).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Cancel"})).toBeInTheDocument();
  });

  it("renders AlertDialogHeader with asChild prop and valid element", async () => {
    // Arrange
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogHeader
            asChild
            data-testid='alert-header'>
            <header>Custom Header</header>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Assert
    const header = await screen.findByTestId("alert-header");
    expect(header).toBeInTheDocument();
    expect(header.tagName).toBe("HEADER");
    expect(screen.getByText("Custom Header")).toBeInTheDocument();
  });

  it("renders AlertDialogFooter with asChild prop and valid element", async () => {
    // Arrange
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Title</AlertDialogTitle>
          <AlertDialogFooter
            asChild
            data-testid='alert-footer'>
            <footer>Custom Footer</footer>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Assert
    const footer = await screen.findByTestId("alert-footer");
    expect(footer).toBeInTheDocument();
    expect(footer.tagName).toBe("FOOTER");
    expect(screen.getByText("Custom Footer")).toBeInTheDocument();
  });

  it("renders AlertDialogOverlay", async () => {
    // Arrange
    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Title</AlertDialogTitle>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Assert
    const alertDialog = await screen.findByRole("alertdialog", {name: "Title"});
    expect(alertDialog).toBeVisible();
  });

  it("renders AlertDialogAction with click handler", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleClick = vitest.fn();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogDescription>Are you sure?</AlertDialogDescription>
          <AlertDialogAction onClick={handleClick}>Confirm</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Act
    const confirmButton = await screen.findByRole("button", {name: "Confirm"});
    await user.click(confirmButton);

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("renders AlertDialogCancel with click handler", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleClick = vitest.fn();

    render(
      <AlertDialog defaultOpen>
        <AlertDialogContent>
          <AlertDialogTitle>Confirm</AlertDialogTitle>
          <AlertDialogDescription>Are you sure?</AlertDialogDescription>
          <AlertDialogCancel onClick={handleClick}>Cancel</AlertDialogCancel>
        </AlertDialogContent>
      </AlertDialog>,
    );

    // Act
    const cancelButton = await screen.findByRole("button", {name: "Cancel"});
    await user.click(cancelButton);

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
