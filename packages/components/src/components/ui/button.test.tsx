import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi} from "vitest";

import {Button} from "./button";

describe("Button", () => {
  it("renders a native button with a safe default type", () => {
    // Arrange
    render(<Button>Save changes</Button>);

    // Assert
    expect(screen.getByRole("button", {name: "Save changes"})).toHaveAttribute("type", "button");
  });

  it("preserves an explicit type override", () => {
    // Arrange
    render(<Button type='submit'>Submit form</Button>);

    // Assert
    expect(screen.getByRole("button", {name: "Submit form"})).toHaveAttribute("type", "submit");
  });

  it("supports the deprecated asChild API without adding native button attributes", () => {
    // Arrange
    render(
      <Button
        asChild
        className='custom-class'>
        <a href='/dashboard'>Go to dashboard</a>
      </Button>,
    );

    // Assert
    const link = screen.getByRole("button", {name: "Go to dashboard"});
    expect(link).toHaveAttribute("href", "/dashboard");
    expect(link).not.toHaveAttribute("type");
    expect(link).toHaveClass("custom-class");
  });

  it("passes button state to render callbacks and omits fallback children when render is used", () => {
    // Arrange
    render(
      <Button
        variant='outline'
        size='lg'
        disabled
        render={(props, state) => (
          <a
            {...props}
            href='/dashboard'>
            {`${state.variant}-${state.size}-${String(state.disabled)}`}
          </a>
        )}>
        Hidden fallback
      </Button>,
    );

    // Assert
    expect(screen.getByRole("button", {name: "outline-lg-true"})).toBeInTheDocument();
    expect(screen.queryByText("Hidden fallback")).not.toBeInTheDocument();
  });

  it("prevents clicks on disabled non-native render targets", () => {
    // Arrange
    const handleClick = vi.fn();

    render(
      <Button
        asChild
        disabled
        onClick={handleClick}>
        <a href='/dashboard'>Disabled dashboard link</a>
      </Button>,
    );

    // Act
    fireEvent.click(screen.getByRole("button", {name: "Disabled dashboard link"}));

    // Assert
    expect(handleClick).not.toHaveBeenCalled();
  });
});
