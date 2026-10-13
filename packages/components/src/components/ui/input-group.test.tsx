import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {createRef} from "react";
import {describe, expect, it, vi as vitest} from "vitest";

import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea} from "./input-group";

describe("InputGroup", () => {
  it("passes compact size to the real Button state and composes anchor refs", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLElement>();
    let renderedSize: string | undefined;
    render(
      <InputGroupButton
        ref={ref}
        nativeButton={false}
        size='icon-xs'
        aria-label='Open search'
        render={(props, state) => {
          renderedSize = state.size;
          return (
            <a
              {...props}
              href='#search'
            />
          );
        }}
      />,
    );
    const link = screen.getByRole("button", {name: "Open search"});
    expect(renderedSize).toBe("icon-xs");
    expect(link).toHaveAttribute("data-size", "icon-xs");
    expect(link).toHaveAttribute("data-slot", "input-group-button");
    expect(ref.current).toBe(link);
    await user.tab();
    expect(link).toHaveFocus();
  });

  it.each(["default", "xs", "sm", "lg", "icon", "icon-xs", "icon-sm", "icon-lg"] as const)(
    "inherits Button's %s size and resolved render state",
    (size) => {
      let renderedSize: string | undefined;
      render(
        <InputGroupButton
          size={size}
          render={(props, state) => {
            renderedSize = state.size;
            return <button {...props} />;
          }}>
          Action
        </InputGroupButton>,
      );
      expect(renderedSize).toBe(size);
      expect(screen.getByRole("button", {name: "Action"})).toHaveAttribute("data-size", size);
      expect(screen.getByRole("button")).toHaveAttribute("type", "button");
    },
  );

  it("preserves composed button child content, handlers and callback ref cleanup", async () => {
    const user = userEvent.setup();
    const cleanup = vitest.fn();
    const childRef = vitest.fn((_element: HTMLAnchorElement | null) => cleanup);
    const ref = createRef<HTMLElement>();
    const wrapperClick = vitest.fn();
    const childClick = vitest.fn();
    const {unmount} = render(
      <InputGroupButton
        ref={ref}
        nativeButton={false}
        onClick={wrapperClick}
        render={
          <a
            href='#docs'
            ref={childRef}
            onClick={childClick}>
            Documentation
          </a>
        }
      />,
    );
    const link = screen.getByRole("button", {name: "Documentation"});
    expect(ref.current).toBe(link);
    expect(childRef).toHaveBeenCalledWith(link);
    await user.click(link);
    expect(wrapperClick).toHaveBeenCalledTimes(1);
    expect(childClick).toHaveBeenCalledTimes(1);
    unmount();
    expect(ref.current).toBeNull();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("does not redirect focus from a composed addon action", async () => {
    const user = userEvent.setup();
    render(
      <InputGroup>
        <InputGroupInput aria-label='Query' />
        <InputGroupAddon align='inline-end'>
          <InputGroupButton
            nativeButton={false}
            render={<a href='#documentation' />}>
            <span>Docs</span>
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>,
    );
    await user.click(screen.getByText("Docs"));
    expect(screen.getByRole("button", {name: "Docs"})).toHaveFocus();
    expect(screen.getByRole("textbox")).not.toHaveFocus();
  });

  it("passes primitive input class and render callbacks inside group chrome", () => {
    render(
      <InputGroup>
        <InputGroupInput
          aria-label='Composed grouped input'
          disabled
          className={(state) => (state.disabled ? "disabled-control" : "enabled-control")}
          render={(props) => <input {...props} />}
        />
      </InputGroup>,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("textbox")).toHaveClass("disabled-control");
    expect(screen.getByRole("textbox")).toHaveAttribute("data-slot", "input-group-control");
  });

  it("focuses multiline controls but honors cancellation and nested button focus", async () => {
    const user = userEvent.setup();
    const onAddonClick = vitest.fn();
    render(
      <InputGroup>
        <InputGroupTextarea aria-label='Message' />
        <InputGroupAddon
          align='block-end'
          onClick={onAddonClick}>
          <InputGroupText>Compose</InputGroupText>
          <InputGroupButton>
            <span>Send</span>
          </InputGroupButton>
        </InputGroupAddon>
        <InputGroupAddon onClick={(event) => event.preventDefault()}>Cancelled</InputGroupAddon>
      </InputGroup>,
    );
    await user.click(screen.getByText("Compose"));
    expect(screen.getByRole("textbox")).toHaveFocus();
    await user.click(screen.getByText("Send"));
    expect(screen.getByRole("button", {name: "Send"})).toHaveFocus();
    expect(onAddonClick).toHaveBeenCalledTimes(2);
    await user.click(screen.getByText("Cancelled"));
    expect(screen.getByRole("textbox")).not.toHaveFocus();
  });
  it("renders InputGroup components with children, custom classes, and forwarded refs", async () => {
    // Arrange
    const user = userEvent.setup();
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

    await user.click(screen.getByTestId("input-group-addon"));
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

  it("InputGroupAddon onClick focuses related input when clicking non-button content", async () => {
    // Arrange
    const user = userEvent.setup();
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

    await user.click(addon);

    // Assert
    expect(input).toHaveFocus();
  });

  it("InputGroupAddon onClick does not interfere with button clicks", async () => {
    // Arrange
    const user = userEvent.setup();
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
    await user.click(button);

    // Assert
    expect(buttonClickHandler).toHaveBeenCalledTimes(1);
  });

  it("renders InputGroupAddon with default onClick that prevents default when event is prevented", async () => {
    // Arrange
    const user = userEvent.setup();
    const onClickMock = vitest.fn((e) => e.preventDefault());

    render(
      <InputGroup>
        <InputGroupAddon
          data-testid='addon'
          onClick={onClickMock}>
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

    await user.click(addon);

    // Assert
    expect(onClickMock).toHaveBeenCalledTimes(1);
    expect(input).not.toHaveFocus();
  });
});
