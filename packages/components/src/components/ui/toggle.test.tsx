import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Toggle} from "./toggle";

describe("Toggle", () => {
  it("renders without crashing", () => {
    // Arrange
    render(<Toggle aria-label='Bold'>Bold</Toggle>);

    // Assert
    expect(screen.getByRole("button", {name: "Bold"})).toBeInTheDocument();
  });

  it("forwards its ref to the toggle DOM element", () => {
    // Arrange
    const ref = React.createRef<HTMLButtonElement>();

    render(
      <Toggle
        ref={ref}
        aria-label='Forwarded toggle'>
        Toggle
      </Toggle>,
    );

    // Assert
    expect(ref.current).toBe(screen.getByRole("button", {name: "Forwarded toggle"}));
  });

  it("merges custom class names", () => {
    // Arrange
    render(
      <Toggle
        aria-label='Styled toggle'
        className='custom-toggle'>
        Toggle
      </Toggle>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Styled toggle"})).toHaveClass("custom-toggle");
  });

  it("updates pressed state when clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const handlePressedChange = vi.fn<(pressed: boolean) => void>();

    render(
      <Toggle
        aria-label='Italic'
        onPressedChange={handlePressedChange}>
        Italic
      </Toggle>,
    );

    const toggle = screen.getByRole("button", {name: "Italic"});

    // Assert
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    // Act
    await user.click(toggle);

    // Assert
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(handlePressedChange.mock.calls.at(-1)?.[0]).toBe(true);

    // Act
    await user.click(toggle);

    // Assert
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(handlePressedChange.mock.calls.at(-1)?.[0]).toBe(false);
  });

  it("marks disabled toggles with data-disabled", () => {
    // Arrange
    render(
      <Toggle
        aria-label='Disabled toggle'
        disabled>
        Disabled
      </Toggle>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Disabled toggle"})).toHaveAttribute("data-disabled");
  });

  it("supports keyboard toggling with the enter key", async () => {
    // Arrange
    const user = userEvent.setup();

    render(<Toggle aria-label='Keyboard toggle'>Keyboard</Toggle>);

    const toggle = screen.getByRole("button", {name: "Keyboard toggle"});
    toggle.focus();

    // Act
    await user.keyboard("{Enter}");

    // Assert
    expect(toggle).toHaveAttribute("aria-pressed", "true");
  });

  it("exposes accessible toggle button semantics", () => {
    // Arrange
    render(
      <Toggle
        aria-label='Accessible toggle'
        pressed>
        Accessible
      </Toggle>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "Accessible toggle"})).toHaveAttribute("aria-pressed", "true");
  });
});
