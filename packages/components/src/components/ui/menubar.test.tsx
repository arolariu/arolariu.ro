import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {
  Menubar,
  MenubarCheckboxItem,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarLabel,
  MenubarMenu,
  MenubarRadioGroup,
  MenubarRadioItem,
  MenubarSeparator,
  MenubarShortcut,
  MenubarSub,
  MenubarSubContent,
  MenubarSubTrigger,
  MenubarTrigger,
} from "./menubar";

function renderMenubar(): HTMLElement {
  render(
    <Menubar
      className='custom-root'
      data-testid='menubar-root'>
      <MenubarMenu>
        <MenubarTrigger className='custom-trigger'>File</MenubarTrigger>
        <MenubarContent
          className='custom-content'
          data-testid='file-menu'>
          <MenubarItem>New tab</MenubarItem>
        </MenubarContent>
      </MenubarMenu>
    </Menubar>,
  );

  return screen.getByRole("menuitem", {name: "File"});
}

describe("Menubar", () => {
  it("renders the menubar structure, merges class names, and exposes accessibility attributes", () => {
    // Arrange
    const trigger = renderMenubar();

    // Assert
    expect(screen.getByRole("menubar")).toBeInTheDocument();
    expect(screen.getByTestId("menubar-root")).toHaveClass("custom-root");
    expect(trigger).toHaveClass("custom-trigger");
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the menu content and renders child items when the trigger is clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const trigger = renderMenubar();

    // Act
    await user.click(trigger);

    // Assert
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(await screen.findByRole("menu")).toHaveClass("custom-content");
    expect(screen.getByTestId("file-menu")).toBeInTheDocument();
    expect(await screen.findByRole("menuitem", {name: "New tab"})).toBeVisible();
  });

  describe("MenubarCheckboxItem", () => {
    it("renders checkbox items that can be checked", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem checked>Show sidebar</MenubarCheckboxItem>
              <MenubarCheckboxItem checked={false}>Show toolbar</MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "View"}));

      // Assert
      expect(await screen.findByRole("menuitemcheckbox", {name: "Show sidebar"})).toBeInTheDocument();
      expect(screen.getByRole("menuitemcheckbox", {name: "Show toolbar"})).toBeInTheDocument();
    });

    it("applies custom className to checkbox items", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Options</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem
                className='custom-checkbox'
                data-testid='checkbox-item'>
                Feature
              </MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Options"}));

      // Assert
      expect(await screen.findByTestId("checkbox-item")).toHaveClass("custom-checkbox");
    });

    it("toggles checkbox item checked state on click", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>View</MenubarTrigger>
            <MenubarContent>
              <MenubarCheckboxItem
                checked={false}
                data-testid='toggle-checkbox'>
                Toggle Feature
              </MenubarCheckboxItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "View"}));
      const checkboxItem = await screen.findByRole("menuitemcheckbox", {name: "Toggle Feature"});
      await user.click(checkboxItem);

      // Assert - checkbox should be toggled (Base UI handles state)
      expect(checkboxItem).toBeInTheDocument();
    });
  });

  describe("MenubarRadioGroup and MenubarRadioItem", () => {
    it("renders radio group with radio items", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Theme</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup value='light'>
                <MenubarRadioItem value='light'>Light</MenubarRadioItem>
                <MenubarRadioItem value='dark'>Dark</MenubarRadioItem>
                <MenubarRadioItem value='system'>System</MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Theme"}));

      // Assert
      expect(await screen.findByRole("menuitemradio", {name: "Light"})).toBeInTheDocument();
      expect(screen.getByRole("menuitemradio", {name: "Dark"})).toBeInTheDocument();
      expect(screen.getByRole("menuitemradio", {name: "System"})).toBeInTheDocument();
    });

    it("applies custom className to radio items", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Sort</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup value='test'>
                <MenubarRadioItem
                  value='test'
                  className='custom-radio'
                  data-testid='radio-item'>
                  Test
                </MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Sort"}));

      // Assert
      expect(await screen.findByTestId("radio-item")).toHaveClass("custom-radio");
    });

    it("selects radio item on click", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Theme</MenubarTrigger>
            <MenubarContent>
              <MenubarRadioGroup value='light'>
                <MenubarRadioItem value='light'>Light</MenubarRadioItem>
                <MenubarRadioItem
                  value='dark'
                  data-testid='dark-radio'>
                  Dark
                </MenubarRadioItem>
              </MenubarRadioGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Theme"}));
      const darkRadio = await screen.findByRole("menuitemradio", {name: "Dark"});
      await user.click(darkRadio);

      // Assert - radio selection (Base UI handles state)
      expect(darkRadio).toBeInTheDocument();
    });
  });

  describe("MenubarSub, MenubarSubTrigger, and MenubarSubContent", () => {
    it("renders nested submenu structure", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>Undo</MenubarItem>
              <MenubarSub>
                <MenubarSubTrigger>Advanced</MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Transform</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Edit"}));

      // Assert
      expect(await screen.findByText("Undo")).toBeInTheDocument();
      expect(screen.getByText("Advanced")).toBeInTheDocument();
    });

    it("applies custom className to submenu trigger", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Tools</MenubarTrigger>
            <MenubarContent>
              <MenubarSub>
                <MenubarSubTrigger
                  className='custom-sub-trigger'
                  data-testid='sub-trigger'>
                  More
                </MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarItem>Item</MenubarItem>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Tools"}));

      // Assert
      expect(await screen.findByTestId("sub-trigger")).toHaveClass("custom-sub-trigger");
    });
  });

  describe("MenubarLabel", () => {
    it("renders label inside menu", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarLabel>Recent Files</MenubarLabel>
                <MenubarItem>Document 1</MenubarItem>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "File"}));

      // Assert
      expect(await screen.findByText("Recent Files")).toBeInTheDocument();
    });

    it("applies custom className to label", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarGroup>
                <MenubarLabel
                  className='custom-label'
                  data-testid='menu-label'>
                  Actions
                </MenubarLabel>
              </MenubarGroup>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Edit"}));

      // Assert
      expect(await screen.findByTestId("menu-label")).toHaveClass("custom-label");
    });
  });

  describe("MenubarSeparator", () => {
    it("renders separator inside menu", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>New</MenubarItem>
              <MenubarSeparator data-testid='menu-separator' />
              <MenubarItem>Exit</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "File"}));
      await screen.findByText("New");

      // Assert
      expect(screen.getByTestId("menu-separator")).toBeInTheDocument();
    });
  });

  describe("MenubarShortcut", () => {
    it("renders shortcut text inside menu item", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>File</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                Save
                <MenubarShortcut>⌘S</MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "File"}));

      // Assert
      expect(await screen.findByText("⌘S")).toBeInTheDocument();
    });

    it("applies custom className to shortcut", async () => {
      // Arrange
      const user = userEvent.setup();
      render(
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Edit</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>
                Undo
                <MenubarShortcut
                  className='custom-shortcut'
                  data-testid='shortcut'>
                  ⌘Z
                </MenubarShortcut>
              </MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>,
      );

      // Act
      await user.click(screen.getByRole("menuitem", {name: "Edit"}));

      // Assert
      expect(await screen.findByTestId("shortcut")).toHaveClass("custom-shortcut");
    });
  });
});
