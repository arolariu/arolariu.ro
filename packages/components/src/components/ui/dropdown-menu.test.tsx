import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./dropdown-menu";

describe("DropdownMenu", () => {
  it("renders without crashing", () => {
    // Arrange
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Open menu"})).toBeInTheDocument();
  });

  it("opens the menu when the trigger is clicked", async () => {
    // Arrange
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Billing</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Act
    fireEvent.click(screen.getByRole("button", {name: "Open menu"}));

    // Assert
    expect(await screen.findByRole("menuitem", {name: "Profile"})).toBeInTheDocument();
    expect(screen.getByRole("menuitem", {name: "Billing"})).toBeInTheDocument();
  });

  it("merges the content className", async () => {
    // Arrange
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent className='custom-content'>
          <DropdownMenuItem>Profile</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Act
    fireEvent.click(screen.getByRole("button", {name: "Open menu"}));

    // Assert
    expect(await screen.findByRole("menu")).toHaveClass("custom-content");
  });

  it("renders children inside menu items", async () => {
    // Arrange
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Nested child content</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    // Act
    fireEvent.click(screen.getByRole("button", {name: "Open menu"}));

    // Assert
    expect(await screen.findByText("Nested child content")).toBeInTheDocument();
  });

  describe("DropdownMenuCheckboxItem", () => {
    it("renders checkbox items that can be checked", async () => {
      // Arrange
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem checked>Show toolbar</DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false}>Show sidebar</DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Assert
      expect(await screen.findByRole("menuitemcheckbox", {name: "Show toolbar"})).toBeInTheDocument();
      expect(screen.getByRole("menuitemcheckbox", {name: "Show sidebar"})).toBeInTheDocument();
    });

    it("applies custom className to checkbox items", async () => {
      // Arrange
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuCheckboxItem
              className='custom-checkbox'
              data-testid='checkbox-item'>
              Feature
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Assert
      expect(await screen.findByTestId("checkbox-item")).toHaveClass("custom-checkbox");
    });
  });

  describe("DropdownMenuRadioGroup and DropdownMenuRadioItem", () => {
    it("renders radio group with radio items", async () => {
      // Arrange
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value='light'>
              <DropdownMenuRadioItem value='light'>Light</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value='dark'>Dark</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value='system'>System</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Assert
      expect(await screen.findByRole("menuitemradio", {name: "Light"})).toBeInTheDocument();
      expect(screen.getByRole("menuitemradio", {name: "Dark"})).toBeInTheDocument();
      expect(screen.getByRole("menuitemradio", {name: "System"})).toBeInTheDocument();
    });

    it("applies custom className to radio items", async () => {
      // Arrange
      render(
        <DropdownMenu defaultOpen>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuRadioGroup value='test'>
              <DropdownMenuRadioItem
                value='test'
                className='custom-radio'
                data-testid='radio-item'>
                Test
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Assert
      expect(await screen.findByTestId("radio-item")).toHaveClass("custom-radio");
    });
  });

  describe("DropdownMenuSub, DropdownMenuSubTrigger, and DropdownMenuSubContent", () => {
    it("renders nested submenu structure", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Advanced</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Developer tools</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      fireEvent.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByText("Settings")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });

    it("applies custom className to submenu trigger", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger
                className='custom-sub-trigger'
                data-testid='sub-trigger'>
                More
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem>Item</DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      fireEvent.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByTestId("sub-trigger")).toHaveClass("custom-sub-trigger");
    });
  });

  describe("DropdownMenuLabel", () => {
    it("renders label inside menu", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuItem>Profile</DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      fireEvent.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByText("My Account")).toBeInTheDocument();
    });

    it("applies custom className to label", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuLabel
                className='custom-label'
                data-testid='menu-label'>
                Section
              </DropdownMenuLabel>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      fireEvent.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByTestId("menu-label")).toHaveClass("custom-label");
    });
  });

  describe("DropdownMenuSeparator", () => {
    it("renders separator inside menu", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuSeparator data-testid='menu-separator' />
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      fireEvent.click(screen.getByRole("button", {name: "Open menu"}));
      await screen.findByText("Item 1");

      // Assert
      expect(screen.getByTestId("menu-separator")).toBeInTheDocument();
    });
  });

  describe("DropdownMenuShortcut", () => {
    it("renders shortcut text inside menu item", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Save
              <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      fireEvent.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByText("⌘S")).toBeInTheDocument();
    });

    it("applies custom className to shortcut", async () => {
      // Arrange
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              Open
              <DropdownMenuShortcut
                className='custom-shortcut'
                data-testid='shortcut'>
                ⌘O
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      // Act
      fireEvent.click(screen.getByRole("button", {name: "Open menu"}));

      // Assert
      expect(await screen.findByTestId("shortcut")).toHaveClass("custom-shortcut");
    });
  });
});
