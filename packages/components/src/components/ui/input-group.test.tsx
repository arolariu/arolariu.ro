import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it, vi as vitest} from "vitest";

import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea} from "./input-group";

describe("InputGroup", () => {
  it("renders InputGroup components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const groupRef = {current: null as HTMLDivElement | null};
    const inputRef = {current: null as HTMLInputElement | null};
    const textareaRef = {current: null as HTMLTextAreaElement | null};

    // Act
    render(
      <>
        <InputGroup
          ref={groupRef}
          className='input-group-class'
          data-testid='input-group'>
          <InputGroupAddon data-testid='input-group-addon'>
            <InputGroupText>@</InputGroupText>
          </InputGroupAddon>
          <InputGroupInput
            ref={inputRef}
            aria-label='Username'
            placeholder='username'
          />
          <InputGroupButton>Check</InputGroupButton>
        </InputGroup>
        <InputGroup data-testid='textarea-group'>
          <InputGroupTextarea
            ref={textareaRef}
            aria-label='Notes'
          />
        </InputGroup>
      </>,
    );

    // Assert
    const inputGroup = screen.getByTestId("input-group");
    const usernameInput = screen.getByLabelText("Username");
    const notesTextarea = screen.getByLabelText("Notes");

    expect(inputGroup).toHaveClass("input-group-class");
    expect(screen.getByText("@")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Check"})).toBeInTheDocument();
    expect(groupRef.current).toBe(inputGroup);
    expect(inputRef.current).toBe(usernameInput);
    expect(textareaRef.current).toBe(notesTextarea);

    fireEvent.click(screen.getByTestId("input-group-addon"));
    expect(usernameInput).toHaveFocus();
  });

  it("renders InputGroupAddon with different align values", () => {
    // Arrange & Act
    render(
      <>
        <InputGroup data-testid='group-1'>
          <InputGroupAddon
            align='inline-start'
            data-testid='addon-inline-start'>
            Start
          </InputGroupAddon>
          <InputGroupInput aria-label='Input 1' />
        </InputGroup>
        <InputGroup data-testid='group-2'>
          <InputGroupInput aria-label='Input 2' />
          <InputGroupAddon
            align='inline-end'
            data-testid='addon-inline-end'>
            End
          </InputGroupAddon>
        </InputGroup>
        <InputGroup data-testid='group-3'>
          <InputGroupAddon
            align='block-start'
            data-testid='addon-block-start'>
            Top
          </InputGroupAddon>
          <InputGroupInput aria-label='Input 3' />
        </InputGroup>
        <InputGroup data-testid='group-4'>
          <InputGroupInput aria-label='Input 4' />
          <InputGroupAddon
            align='block-end'
            data-testid='addon-block-end'>
            Bottom
          </InputGroupAddon>
        </InputGroup>
      </>,
    );

    // Assert
    expect(screen.getByTestId("addon-inline-start")).toHaveAttribute("data-align", "inline-start");
    expect(screen.getByTestId("addon-inline-end")).toHaveAttribute("data-align", "inline-end");
    expect(screen.getByTestId("addon-block-start")).toHaveAttribute("data-align", "block-start");
    expect(screen.getByTestId("addon-block-end")).toHaveAttribute("data-align", "block-end");
  });

  it("renders InputGroupButton with different sizes", () => {
    // Arrange & Act
    render(
      <InputGroup>
        <InputGroupInput aria-label='Test input' />
        <InputGroupButton
          size='xs'
          data-testid='btn-xs'>
          XS
        </InputGroupButton>
        <InputGroupButton
          size='sm'
          data-testid='btn-sm'>
          SM
        </InputGroupButton>
        <InputGroupButton
          size='icon-xs'
          data-testid='btn-icon-xs'
          aria-label='Icon XS'
        />
        <InputGroupButton
          size='icon-sm'
          data-testid='btn-icon-sm'
          aria-label='Icon SM'
        />
      </InputGroup>,
    );

    // Assert
    expect(screen.getByTestId("btn-xs")).toHaveAttribute("data-size", "xs");
    expect(screen.getByTestId("btn-sm")).toHaveAttribute("data-size", "sm");
    expect(screen.getByTestId("btn-icon-xs")).toHaveAttribute("data-size", "icon-xs");
    expect(screen.getByTestId("btn-icon-sm")).toHaveAttribute("data-size", "icon-sm");
  });

  it("renders InputGroupText component", () => {
    // Arrange
    const textRef = {current: null as HTMLSpanElement | null};

    // Act
    render(
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText
            ref={textRef}
            data-testid='input-group-text'>
            $
          </InputGroupText>
        </InputGroupAddon>
        <InputGroupInput aria-label='Amount' />
      </InputGroup>,
    );

    // Assert
    const text = screen.getByTestId("input-group-text");
    expect(text).toBeInTheDocument();
    expect(text.tagName).toBe("SPAN");
    expect(text).toHaveTextContent("$");
    expect(textRef.current).toBe(text);
  });

  it("renders InputGroupTextarea with custom props", () => {
    // Arrange
    const textareaRef = {current: null as HTMLTextAreaElement | null};

    // Act
    render(
      <InputGroup>
        <InputGroupTextarea
          ref={textareaRef}
          rows={5}
          placeholder='Enter notes'
          data-testid='input-group-textarea'
          aria-label='Notes'
        />
      </InputGroup>,
    );

    // Assert
    const textarea = screen.getByTestId("input-group-textarea");
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute("rows", "5");
    expect(textarea).toHaveAttribute("placeholder", "Enter notes");
    expect(textareaRef.current).toBe(textarea);
  });

  it("renders InputGroupInput with custom props", () => {
    // Arrange
    const inputRef = {current: null as HTMLInputElement | null};

    // Act
    render(
      <InputGroup>
        <InputGroupInput
          ref={inputRef}
          type='email'
          placeholder='Email'
          data-testid='input-group-input'
          aria-label='Email'
        />
      </InputGroup>,
    );

    // Assert
    const input = screen.getByTestId("input-group-input");
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("placeholder", "Email");
    expect(inputRef.current).toBe(input);
  });

  it("InputGroupAddon onClick focuses related input when clicking non-button content", () => {
    // Arrange
    render(
      <InputGroup>
        <InputGroupAddon
          data-testid='addon'
          onClick={(e) => {
            expect(e.defaultPrevented).toBe(false);
          }}>
          <InputGroupText>@</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          aria-label='Username'
          data-testid='input'
        />
      </InputGroup>,
    );

    // Act
    const addon = screen.getByTestId("addon");
    const input = screen.getByTestId("input");

    fireEvent.click(addon);

    // Assert
    expect(input).toHaveFocus();
  });

  it("InputGroupAddon onClick does not interfere with button clicks", () => {
    // Arrange
    const buttonClickHandler = vitest.fn();

    render(
      <InputGroup>
        <InputGroupAddon data-testid='addon'>
          <button
            type='button'
            onClick={buttonClickHandler}>
            Click me
          </button>
        </InputGroupAddon>
        <InputGroupInput aria-label='Test' />
      </InputGroup>,
    );

    // Act
    const button = screen.getByRole("button", {name: "Click me"});
    fireEvent.click(button);

    // Assert
    expect(buttonClickHandler).toHaveBeenCalledTimes(1);
  });
});
