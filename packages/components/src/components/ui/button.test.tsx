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

  it("renders with intrinsic button element via render prop", () => {
    // Arrange - passing a <button> element directly
    render(
      <Button
        render={<button data-testid='intrinsic-button'>Custom Button</button>}
        variant='outline'
      />,
    );

    // Assert - should detect intrinsic button and add type="button"
    const button = screen.getByTestId("intrinsic-button");
    expect(button).toHaveAttribute("type", "button");
    expect(button.className).toContain("outline");
  });

  it("prevents Enter key on disabled non-native elements", () => {
    // Arrange
    const handleClick = vi.fn();

    render(
      <Button
        asChild
        disabled
        onClick={handleClick}>
        <a
          href='/dashboard'
          data-testid='disabled-enter'>
          Disabled Link
        </a>
      </Button>,
    );

    // Act
    const link = screen.getByTestId("disabled-enter");
    fireEvent.keyDown(link, {key: "Enter"});

    // Assert - Enter should be prevented
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("prevents Space key on disabled non-native elements", () => {
    // Arrange
    const handleClick = vi.fn();

    render(
      <Button
        asChild
        disabled
        onClick={handleClick}>
        <a
          href='/dashboard'
          data-testid='disabled-space'>
          Disabled Link
        </a>
      </Button>,
    );

    // Act
    const link = screen.getByTestId("disabled-space");
    fireEvent.keyDown(link, {key: " "});

    // Assert - Space should be prevented
    expect(handleClick).not.toHaveBeenCalled();
  });

  it("allows key events on disabled non-native elements for other keys", () => {
    // Arrange
    render(
      <Button
        asChild
        disabled>
        <a
          href='/dashboard'
          data-testid='disabled-other-key'>
          Disabled Link
        </a>
      </Button>,
    );

    // Act
    const link = screen.getByTestId("disabled-other-key");
    fireEvent.keyDown(link, {key: "Tab"});

    // Assert - should not throw or crash
    expect(link).toHaveAttribute("aria-disabled", "true");
  });

  it("sets tabIndex to -1 for disabled non-native elements", () => {
    // Arrange
    render(
      <Button
        asChild
        disabled>
        <a
          href='/dashboard'
          data-testid='disabled-tabindex'>
          Disabled Link
        </a>
      </Button>,
    );

    // Assert - tabIndex should be -1
    const link = screen.getByTestId("disabled-tabindex");
    expect(link).toHaveAttribute("tabIndex", "-1");
  });

  it("does not set tabIndex for non-disabled non-native elements", () => {
    // Arrange
    render(
      <Button asChild>
        <a
          href='/dashboard'
          data-testid='enabled-tabindex'>
          Enabled Link
        </a>
      </Button>,
    );

    // Assert - tabIndex should not be set
    const link = screen.getByTestId("enabled-tabindex");
    expect(link).not.toHaveAttribute("tabIndex");
  });

  it("renders button as non-button element without type attribute", () => {
    // Arrange
    render(
      <Button
        asChild
        data-testid='div-button'>
        <div>Div Button</div>
      </Button>,
    );

    // Assert - should have button role but no type attribute
    const divButton = screen.getByRole("button", {name: "Div Button"});
    expect(divButton.tagName).toBe("DIV");
    expect(divButton).not.toHaveAttribute("type");
  });

  it("allows click on enabled non-native elements", () => {
    // Arrange
    const handleClick = vi.fn();

    render(
      <Button
        asChild
        onClick={handleClick}>
        <a
          href='/dashboard'
          data-testid='enabled-link'>
          Enabled Link
        </a>
      </Button>,
    );

    // Act
    fireEvent.click(screen.getByTestId("enabled-link"));

    // Assert - click should work
    expect(handleClick).toHaveBeenCalled();
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

  it("renders with render prop returning non-button element", () => {
    render(
      <Button
        render={<div data-testid='custom-div' />}
        variant='outline'
        size='lg'>
        Custom Element
      </Button>,
    );

    const element = screen.getByTestId("custom-div");
    expect(element.tagName).toBe("DIV");
    expect(element).toHaveAttribute("role", "button");
    expect(element.className).toContain("outline");
    expect(element.className).toContain("sizeLg");
  });

  it("renders with render prop returning intrinsic button element", () => {
    render(
      <Button
        render={<button data-testid='custom-button' />}
        variant='secondary'>
        Intrinsic Button
      </Button>,
    );

    const button = screen.getByTestId("custom-button");
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "button");
    expect(button).not.toHaveAttribute("role");
    expect(button.className).toContain("secondary");
  });

  it("prevents keyDown (Enter) on disabled non-native button", () => {
    const mockPreventDefault = vi.fn();

    render(
      <Button
        asChild
        disabled>
        <a
          href='/dashboard'
          data-testid='disabled-link'>
          Disabled Link
        </a>
      </Button>,
    );

    const link = screen.getByTestId("disabled-link");
    const event = new KeyboardEvent("keydown", {key: "Enter", bubbles: true});
    Object.defineProperty(event, "preventDefault", {value: mockPreventDefault});
    link.dispatchEvent(event);

    expect(mockPreventDefault).toHaveBeenCalled();
  });

  it("prevents keyDown (Space) on disabled non-native button", () => {
    const mockPreventDefault = vi.fn();

    render(
      <Button
        asChild
        disabled>
        <a
          href='/dashboard'
          data-testid='disabled-link'>
          Disabled Link
        </a>
      </Button>,
    );

    const link = screen.getByTestId("disabled-link");
    const event = new KeyboardEvent("keydown", {key: " ", bubbles: true});
    Object.defineProperty(event, "preventDefault", {value: mockPreventDefault});
    link.dispatchEvent(event);

    expect(mockPreventDefault).toHaveBeenCalled();
  });

  it("allows keyDown (other keys) on disabled non-native button", () => {
    const handleKeyDown = vi.fn();

    render(
      <Button
        asChild
        disabled
        onKeyDown={handleKeyDown}>
        <a
          href='/dashboard'
          data-testid='disabled-link'>
          Disabled Link
        </a>
      </Button>,
    );

    const link = screen.getByTestId("disabled-link");
    fireEvent.keyDown(link, {key: "Tab"});

    expect(handleKeyDown).toHaveBeenCalled();
  });

  it("renders with all variant and size combinations", () => {
    const variants = ["default", "destructive", "outline", "secondary", "ghost", "link"] as const;
    const sizes = ["default", "sm", "lg", "icon"] as const;

    variants.forEach((variant) => {
      sizes.forEach((size) => {
        const {unmount} = render(
          <Button
            variant={variant}
            size={size}
            data-testid={`button-${variant}-${size}`}>
            {variant}-{size}
          </Button>,
        );

        const button = screen.getByTestId(`button-${variant}-${size}`);
        expect(button).toBeInTheDocument();
        unmount();
      });
    });
  });

  it("renders with render prop that is a callback function", () => {
    render(
      <Button
        variant='destructive'
        size='sm'
        disabled
        render={(props, state) => (
          <a
            {...props}
            href='/delete'
            data-testid='render-callback'>
            {state.variant}-{state.size}-{String(state.disabled)}
          </a>
        )}>
        Fallback
      </Button>,
    );

    const link = screen.getByTestId("render-callback");
    expect(link.tagName).toBe("A");
    expect(link).toHaveTextContent("destructive-sm-true");
    expect(link).toHaveAttribute("aria-disabled", "true");
  });

  it("sets tabIndex to -1 on disabled non-native button", () => {
    render(
      <Button
        asChild
        disabled>
        <a
          href='/dashboard'
          data-testid='disabled-link'>
          Disabled Link
        </a>
      </Button>,
    );

    const link = screen.getByTestId("disabled-link");
    expect(link).toHaveAttribute("tabIndex", "-1");
  });

  it("does not set tabIndex on enabled non-native button", () => {
    render(
      <Button asChild>
        <a
          href='/dashboard'
          data-testid='enabled-link'>
          Enabled Link
        </a>
      </Button>,
    );

    const link = screen.getByTestId("enabled-link");
    expect(link).not.toHaveAttribute("tabIndex");
  });
});
