import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "./dialog";

function renderDialog({
  className,
  defaultOpen = false,
  onOpenChange,
  triggerAsChild = false,
}: Readonly<{
  className?: string;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerAsChild?: boolean;
}>) {
  return render(
    <Dialog
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}>
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
  it("renders the trigger as an accessible button and opens the dialog", async () => {
    // Arrange — render closed first to verify trigger accessibility
    const user = userEvent.setup();
    renderDialog({defaultOpen: false});

    // Assert — trigger is accessible before dialog opens
    const trigger = screen.getByRole("button", {name: "Open dialog"});
    expect(trigger).toBeInTheDocument();
    expect(trigger).toBeVisible();

    // Act — open the dialog
    await user.click(trigger);

    // Assert — dialog is visible
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

  it("calls onOpenChange with false when the dialog closes", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleOpenChange = vi.fn<(open: boolean) => void>();

    renderDialog({defaultOpen: false, onOpenChange: handleOpenChange});

    // Act
    await user.click(screen.getByRole("button", {name: "Open dialog"}));

    // Assert
    expect(handleOpenChange.mock.calls.at(-1)?.[0]).toBe(true);

    // Act
    await user.click(await screen.findByRole("button", {name: "Close dialog"}));

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Dialog title"})).not.toBeInTheDocument();
    });
    expect(handleOpenChange.mock.calls.at(-1)?.[0]).toBe(false);
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

  it("closes the dialog when Escape is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    renderDialog({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open dialog"}));
    expect(await screen.findByRole("dialog", {name: "Dialog title"})).toBeVisible();

    // Act — Base UI Dialog traps focus inside; pressing Escape triggers the close handler
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Dialog title"})).not.toBeInTheDocument();
    });
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

  it("renders header and footer containers with their default wrappers", async () => {
    // Arrange
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader data-testid='dialog-header'>
            <DialogTitle>Dialog title</DialogTitle>
            <DialogDescription>Dialog description</DialogDescription>
          </DialogHeader>
          <DialogFooter data-testid='dialog-footer'>
            <DialogClose>Close dialog</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    // Assert
    expect((await screen.findByTestId("dialog-header")).tagName).toBe("DIV");
    expect(screen.getByTestId("dialog-footer").tagName).toBe("DIV");
    expect(screen.getByRole("button", {name: "Close dialog"})).toBeInTheDocument();
  });

  it("supports rendering header and footer as child elements", async () => {
    // Arrange
    render(
      <Dialog defaultOpen>
        <DialogTrigger>Open dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader asChild>
            <header data-testid='dialog-header'>
              <DialogTitle>Dialog title</DialogTitle>
              <DialogDescription>Dialog description</DialogDescription>
            </header>
          </DialogHeader>
          <DialogFooter asChild>
            <footer data-testid='dialog-footer'>
              <DialogClose>Close dialog</DialogClose>
            </footer>
          </DialogFooter>
        </DialogContent>
      </Dialog>,
    );

    // Assert
    expect((await screen.findByTestId("dialog-header")).tagName).toBe("HEADER");
    expect(screen.getByTestId("dialog-header").querySelector("header")).toBeNull();
    expect(screen.getByTestId("dialog-footer").tagName).toBe("FOOTER");
    expect(screen.getByTestId("dialog-footer").querySelector("footer")).toBeNull();
    expect(screen.getByRole("button", {name: "Close dialog"})).toBeInTheDocument();
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleOpenChange = vi.fn<(open: boolean) => void>();

    function ControlledDialog(): React.JSX.Element {
      const [open, setOpen] = React.useState(false);

      return (
        <Dialog
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            handleOpenChange(nextOpen);
          }}>
          <DialogTrigger>Open dialog</DialogTrigger>
          <DialogContent>
            <DialogTitle>Controlled dialog title</DialogTitle>
            <DialogDescription>Controlled dialog description</DialogDescription>
            <DialogClose>Close dialog</DialogClose>
          </DialogContent>
        </Dialog>
      );
    }

    render(<ControlledDialog />);

    const trigger = screen.getByRole("button", {name: "Open dialog"});

    // Act
    await user.click(trigger);

    // Assert
    expect(handleOpenChange).toHaveBeenCalledWith(true);
    expect(await screen.findByRole("dialog", {name: "Controlled dialog title"})).toBeVisible();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    // Act
    await user.click(screen.getByRole("button", {name: "Close dialog"}));

    // Assert
    expect(handleOpenChange).toHaveBeenCalledWith(false);
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Controlled dialog title"})).not.toBeInTheDocument();
    });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
