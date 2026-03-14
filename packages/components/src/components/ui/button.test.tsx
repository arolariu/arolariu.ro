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

  it("renders with destructive variant", () => {
    render(
      <Button
        variant='destructive'
        data-testid='destructive-button'>
        Delete
      </Button>,
    );

    const button = screen.getByTestId("destructive-button");
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("destructive");
  });

  it("renders with outline variant", () => {
    render(
      <Button
        variant='outline'
        data-testid='outline-button'>
        Outline
      </Button>,
    );

    const button = screen.getByTestId("outline-button");
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("outline");
  });

  it("renders with ghost variant", () => {
    render(
      <Button
        variant='ghost'
        data-testid='ghost-button'>
        Ghost
      </Button>,
    );

    const button = screen.getByTestId("ghost-button");
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("ghost");
  });

  it("renders with link variant", () => {
    render(
      <Button
        variant='link'
        data-testid='link-button'>
        Link
      </Button>,
    );

    const button = screen.getByTestId("link-button");
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("link");
  });

  it("renders with secondary variant", () => {
    render(
      <Button
        variant='secondary'
        data-testid='secondary-button'>
        Secondary
      </Button>,
    );

    const button = screen.getByTestId("secondary-button");
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("secondary");
  });

  it("renders with sm size", () => {
    render(
      <Button
        size='sm'
        data-testid='sm-button'>
        Small
      </Button>,
    );

    const button = screen.getByTestId("sm-button");
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("sizeSm");
  });

  it("renders with lg size", () => {
    render(
      <Button
        size='lg'
        data-testid='lg-button'>
        Large
      </Button>,
    );

    const button = screen.getByTestId("lg-button");
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("sizeLg");
  });

  it("renders with icon size", () => {
    render(
      <Button
        size='icon'
        data-testid='icon-button'
        aria-label='Icon'>
        ⚙
      </Button>,
    );

    const button = screen.getByTestId("icon-button");
    expect(button).toBeInTheDocument();
    expect(button.className).toContain("sizeIcon");
  });

  it("renders disabled native button correctly", () => {
    render(
      <Button
        disabled
        data-testid='disabled-button'>
        Disabled
      </Button>,
    );

    const button = screen.getByTestId("disabled-button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("disabled");
  });

  it("renders disabled non-native button with aria-disabled", () => {
    const handleClick = vi.fn();

    render(
      <Button
        asChild
        disabled
        onClick={handleClick}>
        <a
          href='/dashboard'
          data-testid='disabled-link'>
          Disabled Link
        </a>
      </Button>,
    );

    const link = screen.getByTestId("disabled-link");
    expect(link).toHaveAttribute("aria-disabled", "true");
    expect(link).toHaveAttribute("role", "button");
    expect(link).not.toHaveAttribute("disabled");

    // Click should be prevented
    fireEvent.click(link);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("combines variant and size classes", () => {
    render(
      <Button
        variant='outline'
        size='lg'
        data-testid='combo-button'>
        Combo
      </Button>,
    );

    const button = screen.getByTestId("combo-button");
    expect(button.className).toContain("outline");
    expect(button.className).toContain("sizeLg");
  });

  it("applies custom className along with variant styles", () => {
    render(
      <Button
        variant='ghost'
        className='custom-class'
        data-testid='custom-button'>
        Custom
      </Button>,
    );

    const button = screen.getByTestId("custom-button");
    expect(button.className).toContain("ghost");
    expect(button.className).toContain("custom-class");
  });

  it("forwards ref correctly", () => {
    const ref = {current: null as HTMLButtonElement | null};

    render(
      <Button
        ref={ref}
        data-testid='ref-button'>
        Ref Test
      </Button>,
    );

    const button = screen.getByTestId("ref-button");
    expect(ref.current).toBe(button);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });
});
