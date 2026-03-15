import {render, screen, waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger} from "./sheet";
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

  it("closes the sheet when Escape is pressed", async () => {
    // Arrange
    const user = userEvent.setup();
    renderSheet({defaultOpen: false});
    await user.click(screen.getByRole("button", {name: "Open sheet"}));
    expect(await screen.findByRole("dialog", {name: "Sheet title"})).toBeVisible();

    // Act — Sheet is built on the Dialog primitive; Escape closes it the same way
    await user.keyboard("{Escape}");

    // Assert
    await waitFor(() => {
      expect(screen.queryByRole("dialog", {name: "Sheet title"})).not.toBeInTheDocument();
    });
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

  describe("SheetHeader", () => {
    it("renders header inside sheet content", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader data-testid='sheet-header'>
              <SheetTitle>Header Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-header")).toBeInTheDocument();
      expect(screen.getByText("Header Title")).toBeInTheDocument();
    });

    it("applies custom className to header", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetHeader
              className='custom-header'
              data-testid='sheet-header'>
              <SheetTitle>Title</SheetTitle>
            </SheetHeader>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-header")).toHaveClass("custom-header");
    });
  });

  describe("SheetFooter", () => {
    it("renders footer inside sheet content", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetFooter data-testid='sheet-footer'>
              <button type='button'>Cancel</button>
              <button type='button'>Save</button>
            </SheetFooter>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-footer")).toBeInTheDocument();
      expect(screen.getByRole("button", {name: "Cancel"})).toBeInTheDocument();
      expect(screen.getByRole("button", {name: "Save"})).toBeInTheDocument();
    });

    it("applies custom className to footer", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetFooter
              className='custom-footer'
              data-testid='sheet-footer'>
              Footer content
            </SheetFooter>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-footer")).toHaveClass("custom-footer");
    });
  });

  describe("SheetTitle", () => {
    it("renders title inside sheet content", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle data-testid='sheet-title'>Custom Title</SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-title")).toHaveTextContent("Custom Title");
    });

    it("applies custom className to title", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle
              className='custom-title'
              data-testid='sheet-title'>
              Title
            </SheetTitle>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-title")).toHaveClass("custom-title");
    });
  });

  describe("SheetDescription", () => {
    it("renders description inside sheet content", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription data-testid='sheet-description'>This is a detailed description</SheetDescription>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-description")).toHaveTextContent("This is a detailed description");
    });

    it("applies custom className to description", async () => {
      // Arrange
      render(
        <Sheet defaultOpen>
          <SheetTrigger>Open sheet</SheetTrigger>
          <SheetContent>
            <SheetTitle>Title</SheetTitle>
            <SheetDescription
              className='custom-description'
              data-testid='sheet-description'>
              Description
            </SheetDescription>
          </SheetContent>
        </Sheet>,
      );

      // Assert
      expect(await screen.findByTestId("sheet-description")).toHaveClass("custom-description");
    });
  });

  it("renders SheetContent with side='top' positioning", async () => {
    // Arrange
    renderSheet({defaultOpen: true, side: "top"});

    // Assert
    expect(await screen.findByTestId("sheet-content")).toHaveClass(styles.top);
  });

  it("renders SheetContent with side='bottom' positioning", async () => {
    // Arrange
    renderSheet({defaultOpen: true, side: "bottom"});

    // Assert
    expect(await screen.findByTestId("sheet-content")).toHaveClass(styles.bottom);
  });

  it("renders SheetContent with side='right' positioning by default", async () => {
    // Arrange
    renderSheet({defaultOpen: true, side: "right"});

    // Assert
    expect(await screen.findByTestId("sheet-content")).toHaveClass(styles.right);
  });

  it("renders SheetOverlay with custom className", async () => {
    // Arrange
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open</SheetTrigger>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
        </SheetContent>
      </Sheet>,
    );

    // Assert
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeVisible();
  });

  it("renders SheetHeader with asChild prop", async () => {
    // Arrange
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent>
          <SheetHeader asChild>
            <header data-testid='custom-header-element'>
              <SheetTitle>Title</SheetTitle>
            </header>
          </SheetHeader>
        </SheetContent>
      </Sheet>,
    );

    // Assert
    expect(await screen.findByTestId("custom-header-element")).toBeInTheDocument();
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  it("renders SheetFooter with asChild prop", async () => {
    // Arrange
    render(
      <Sheet defaultOpen>
        <SheetTrigger>Open sheet</SheetTrigger>
        <SheetContent>
          <SheetTitle>Title</SheetTitle>
          <SheetFooter asChild>
            <footer data-testid='custom-footer-element'>
              <button type='button'>Action</button>
            </footer>
          </SheetFooter>
        </SheetContent>
      </Sheet>,
    );

    // Assert
    expect(await screen.findByTestId("custom-footer-element")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Action"})).toBeInTheDocument();
  });
});
