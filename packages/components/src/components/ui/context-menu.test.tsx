import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger} from "./context-menu";

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
});
