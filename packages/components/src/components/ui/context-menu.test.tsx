import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./context-menu";

describe("ContextMenu", () => {
  it("renders without crashing", () => {
    // Arrange
    render(
      <ContextMenu>
        <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Rename</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    // Assert
    expect(screen.getByText("Open context menu")).toBeInTheDocument();
  });

  it("opens the menu on contextmenu interaction", async () => {
    // Arrange
    render(
      <ContextMenu>
        <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Rename</ContextMenuItem>
          <ContextMenuItem>Delete</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    // Act
    fireEvent.contextMenu(screen.getByText("Open context menu"));

    // Assert
    expect(await screen.findByRole("menuitem", {name: "Rename"})).toBeInTheDocument();
    expect(screen.getByRole("menuitem", {name: "Delete"})).toBeInTheDocument();
  });

  it("merges the content className", async () => {
    // Arrange
    render(
      <ContextMenu>
        <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
        <ContextMenuContent className='custom-content'>
          <ContextMenuItem>Rename</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    // Act
    fireEvent.contextMenu(screen.getByText("Open context menu"));

    // Assert
    expect(await screen.findByRole("menu")).toHaveClass("custom-content");
  });

  it("renders item children inside the popup", async () => {
    // Arrange
    render(
      <ContextMenu>
        <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem>Child item content</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>,
    );

    // Act
    fireEvent.contextMenu(screen.getByText("Open context menu"));

    // Assert
    expect(await screen.findByText("Child item content")).toBeInTheDocument();
  });

  describe("ContextMenuCheckboxItem", () => {
    it("renders checkbox items that can be checked", async () => {
      // Arrange
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuCheckboxItem checked>Enabled</ContextMenuCheckboxItem>
            <ContextMenuCheckboxItem checked={false}>Disabled</ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Assert
      expect(await screen.findByRole("menuitemcheckbox", {name: "Enabled"})).toBeInTheDocument();
      expect(screen.getByRole("menuitemcheckbox", {name: "Disabled"})).toBeInTheDocument();
    });

    it("applies custom className to checkbox items", async () => {
      // Arrange
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuCheckboxItem
              className='custom-checkbox'
              data-testid='checkbox-item'>
              Option
            </ContextMenuCheckboxItem>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Assert
      expect(await screen.findByTestId("checkbox-item")).toHaveClass("custom-checkbox");
    });
  });

  describe("ContextMenuRadioGroup and ContextMenuRadioItem", () => {
    it("renders radio group with radio items", async () => {
      // Arrange
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuRadioGroup value='option1'>
              <ContextMenuRadioItem value='option1'>Option 1</ContextMenuRadioItem>
              <ContextMenuRadioItem value='option2'>Option 2</ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Assert
      expect(await screen.findByRole("menuitemradio", {name: "Option 1"})).toBeInTheDocument();
      expect(screen.getByRole("menuitemradio", {name: "Option 2"})).toBeInTheDocument();
    });

    it("applies custom className to radio items", async () => {
      // Arrange
      render(
        <ContextMenu defaultOpen>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuRadioGroup value='test'>
              <ContextMenuRadioItem
                value='test'
                className='custom-radio'
                data-testid='radio-item'>
                Test
              </ContextMenuRadioItem>
            </ContextMenuRadioGroup>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Assert
      expect(await screen.findByTestId("radio-item")).toHaveClass("custom-radio");
    });
  });

  describe("ContextMenuSub, ContextMenuSubTrigger, and ContextMenuSubContent", () => {
    it("renders nested submenu structure", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Top level</ContextMenuItem>
            <ContextMenuSub>
              <ContextMenuSubTrigger>More options</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Submenu item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      fireEvent.contextMenu(screen.getByText("Open context menu"));

      // Assert
      expect(await screen.findByText("Top level")).toBeInTheDocument();
      expect(screen.getByText("More options")).toBeInTheDocument();
    });

    it("applies custom className to submenu trigger", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuSub>
              <ContextMenuSubTrigger
                className='custom-sub-trigger'
                data-testid='sub-trigger'>
                Submenu
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>Item</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      fireEvent.contextMenu(screen.getByText("Open context menu"));

      // Assert
      expect(await screen.findByTestId("sub-trigger")).toHaveClass("custom-sub-trigger");
    });
  });

  describe("ContextMenuLabel", () => {
    it("renders label inside menu", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuLabel>Actions</ContextMenuLabel>
              <ContextMenuItem>Action 1</ContextMenuItem>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      fireEvent.contextMenu(screen.getByText("Open context menu"));

      // Assert
      expect(await screen.findByText("Actions")).toBeInTheDocument();
    });

    it("applies custom className to label", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuGroup>
              <ContextMenuLabel
                className='custom-label'
                data-testid='menu-label'>
                Section
              </ContextMenuLabel>
            </ContextMenuGroup>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      fireEvent.contextMenu(screen.getByText("Open context menu"));

      // Assert
      expect(await screen.findByTestId("menu-label")).toHaveClass("custom-label");
    });
  });

  describe("ContextMenuSeparator", () => {
    it("renders separator inside menu", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>Item 1</ContextMenuItem>
            <ContextMenuSeparator data-testid='menu-separator' />
            <ContextMenuItem>Item 2</ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      fireEvent.contextMenu(screen.getByText("Open context menu"));
      await screen.findByText("Item 1");

      // Assert
      expect(screen.getByTestId("menu-separator")).toBeInTheDocument();
    });
  });

  describe("ContextMenuShortcut", () => {
    it("renders shortcut text inside menu item", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>
              Copy
              <ContextMenuShortcut>⌘C</ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      fireEvent.contextMenu(screen.getByText("Open context menu"));

      // Assert
      expect(await screen.findByText("⌘C")).toBeInTheDocument();
    });

    it("applies custom className to shortcut", async () => {
      // Arrange
      render(
        <ContextMenu>
          <ContextMenuTrigger>Open context menu</ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuItem>
              Paste
              <ContextMenuShortcut
                className='custom-shortcut'
                data-testid='shortcut'>
                ⌘V
              </ContextMenuShortcut>
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenu>,
      );

      // Act
      fireEvent.contextMenu(screen.getByText("Open context menu"));

      // Assert
      expect(await screen.findByTestId("shortcut")).toHaveClass("custom-shortcut");
    });
  });
});
