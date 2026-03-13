import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";

import {Menubar, MenubarContent, MenubarItem, MenubarMenu, MenubarTrigger} from "./menubar";

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
});
