import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {ToggleGroup, ToggleGroupItem} from "./toggle-group";

describe("ToggleGroup", () => {
  it("renders without crashing", () => {
    // Arrange
    render(
      <ToggleGroup
        role='group'
        aria-label='Text styles'
        multiple>
        <ToggleGroupItem
          value='bold'
          aria-label='Bold'>
          B
        </ToggleGroupItem>
        <ToggleGroupItem
          value='italic'
          aria-label='Italic'>
          I
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Text styles"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Bold"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Italic"})).toBeInTheDocument();
  });

  it("forwards refs to the group and item DOM elements", () => {
    // Arrange
    const groupRef = React.createRef<HTMLDivElement>();
    const itemRef = React.createRef<HTMLButtonElement>();

    render(
      <ToggleGroup
        ref={groupRef}
        role='group'
        aria-label='Forwarded toggle group'
        multiple>
        <ToggleGroupItem
          ref={itemRef}
          value='bold'
          aria-label='Bold ref'>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    // Assert
    expect(groupRef.current).toBe(screen.getByRole("group", {name: "Forwarded toggle group"}));
    expect(itemRef.current).toBe(screen.getByRole("button", {name: "Bold ref"}));
  });

  it("merges custom class names for the group and items", () => {
    // Arrange
    render(
      <ToggleGroup
        role='group'
        aria-label='Styled toggle group'
        className='custom-toggle-group'
        multiple>
        <ToggleGroupItem
          value='bold'
          aria-label='Styled toggle item'
          className='custom-toggle-group-item'>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Styled toggle group"})).toHaveClass("custom-toggle-group");
    expect(screen.getByRole("button", {name: "Styled toggle item"})).toHaveClass("custom-toggle-group-item");
  });

  it("updates pressed state when items are toggled", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string[]) => void>();

    render(
      <ToggleGroup
        role='group'
        aria-label='Editor formatting'
        defaultValue={["bold"]}
        multiple
        onValueChange={handleValueChange}>
        <ToggleGroupItem
          value='bold'
          aria-label='Bold format'>
          B
        </ToggleGroupItem>
        <ToggleGroupItem
          value='italic'
          aria-label='Italic format'>
          I
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    const boldToggle = screen.getByRole("button", {name: "Bold format"});
    const italicToggle = screen.getByRole("button", {name: "Italic format"});

    // Assert
    expect(boldToggle).toHaveAttribute("aria-pressed", "true");
    expect(italicToggle).toHaveAttribute("aria-pressed", "false");

    // Act
    await user.click(italicToggle);

    // Assert
    expect(italicToggle).toHaveAttribute("aria-pressed", "true");
    expect(handleValueChange.mock.calls.at(-1)?.[0]).toEqual(expect.arrayContaining(["bold", "italic"]));
  });

  it("marks disabled items with data-disabled", () => {
    // Arrange
    render(
      <ToggleGroup
        role='group'
        aria-label='Disabled formatting'
        multiple>
        <ToggleGroupItem
          value='underline'
          aria-label='Underline format'
          disabled>
          U
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Underline format"})).toHaveAttribute("data-disabled");
  });

  it("supports keyboard toggling with the space key", async () => {
    // Arrange
    const user = userEvent.setup();

    render(
      <ToggleGroup
        role='group'
        aria-label='Keyboard formatting'
        multiple>
        <ToggleGroupItem
          value='bold'
          aria-label='Bold keyboard format'>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    const toggle = screen.getByRole("button", {name: "Bold keyboard format"});
    toggle.focus();

    // Act
    await user.keyboard(" ");

    // Assert
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("exposes accessible group and toggle button semantics", () => {
    // Arrange
    render(
      <ToggleGroup
        role='group'
        aria-label='Accessible formatting'
        defaultValue={["bold"]}
        multiple>
        <ToggleGroupItem
          value='bold'
          aria-label='Bold accessible format'>
          B
        </ToggleGroupItem>
      </ToggleGroup>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Accessible formatting"})).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Bold accessible format"})).toHaveAttribute("aria-pressed", "true");
  });
});
