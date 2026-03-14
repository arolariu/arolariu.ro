import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger} from "./dropdown-menu";

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
});
