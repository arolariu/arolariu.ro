import {fireEvent, render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {ButtonGroup, ButtonGroupSeparator, ButtonGroupText} from "./button-group";
import {Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle} from "./empty";
import {Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSeparator, FieldSet} from "./field";
import {InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea} from "./input-group";
import {Item, ItemActions, ItemContent, ItemDescription, ItemGroup, ItemHeader, ItemMedia, ItemTitle} from "./item";
import {Kbd, KbdGroup} from "./kbd";

describe("Batch 7 layout components", () => {
  it("renders Empty compound components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const emptyRef = {current: null as HTMLDivElement | null};
    const contentRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <Empty
        ref={emptyRef}
        className='empty-class'
        data-testid='empty-root'>
        <EmptyHeader data-testid='empty-header'>
          <EmptyMedia data-testid='empty-media'>📦</EmptyMedia>
          <EmptyTitle>Nothing here yet</EmptyTitle>
          <EmptyDescription>Add your first item to get started.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent
          ref={contentRef}
          className='empty-content-class'
          data-testid='empty-content'>
          Action area
        </EmptyContent>
      </Empty>,
    );

    // Assert
    const emptyRoot = screen.getByTestId("empty-root");
    const emptyContent = screen.getByTestId("empty-content");

    expect(emptyRoot).toHaveClass("empty-class");
    expect(screen.getByText("Nothing here yet")).toBeInTheDocument();
    expect(screen.getByText("Add your first item to get started.")).toBeInTheDocument();
    expect(emptyContent).toHaveTextContent("Action area");
    expect(emptyContent).toHaveClass("empty-content-class");
    expect(emptyRef.current).toBe(emptyRoot);
    expect(contentRef.current).toBe(emptyContent);
  });

  it("renders Field compound components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const fieldSetRef = {current: null as HTMLFieldSetElement | null};
    const fieldRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <FieldSet
        ref={fieldSetRef}
        className='fieldset-class'
        data-testid='field-set'>
        <FieldLegend>Profile</FieldLegend>
        <FieldGroup>
          <Field
            ref={fieldRef}
            className='field-class'
            data-testid='field'
            orientation='horizontal'>
            <FieldLabel htmlFor='field-input'>Name</FieldLabel>
            <FieldContent>
              <input
                id='field-input'
                aria-label='Name'
              />
              <FieldDescription>Used on invoices and documents.</FieldDescription>
            </FieldContent>
          </Field>
          <FieldSeparator>or</FieldSeparator>
          <FieldError errors={[{message: "Name is required"}]} />
        </FieldGroup>
      </FieldSet>,
    );

    // Assert
    const fieldSet = screen.getByTestId("field-set");
    const field = screen.getByTestId("field");

    expect(fieldSet).toHaveClass("fieldset-class");
    expect(field).toHaveClass("field-class");
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByText("Used on invoices and documents.")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Name is required");
    expect(fieldSetRef.current).toBe(fieldSet);
    expect(fieldRef.current).toBe(field);
  });

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

  it("renders Item compound components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const itemGroupRef = {current: null as HTMLDivElement | null};
    const itemRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <ItemGroup
        ref={itemGroupRef}
        className='item-group-class'
        data-testid='item-group'>
        <Item
          ref={itemRef}
          className='item-class'
          data-testid='item'>
          <ItemMedia>👤</ItemMedia>
          <ItemContent>
            <ItemHeader>
              <ItemTitle>Alex Olariu</ItemTitle>
            </ItemHeader>
            <ItemDescription>Frontend Engineer</ItemDescription>
          </ItemContent>
          <ItemActions>
            <button type='button'>Invite</button>
          </ItemActions>
        </Item>
      </ItemGroup>,
    );

    // Assert
    const itemGroup = screen.getByTestId("item-group");
    const item = screen.getByTestId("item");

    expect(itemGroup).toHaveClass("item-group-class");
    expect(item).toHaveClass("item-class");
    expect(screen.getByText("Alex Olariu")).toBeInTheDocument();
    expect(screen.getByText("Frontend Engineer")).toBeInTheDocument();
    expect(screen.getByRole("button", {name: "Invite"})).toBeInTheDocument();
    expect(itemGroupRef.current).toBe(itemGroup);
    expect(itemRef.current).toBe(item);
  });

  it("renders Kbd components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const groupRef = {current: null as HTMLElement | null};
    const keyRef = {current: null as HTMLElement | null};

    // Act
    render(
      <KbdGroup
        ref={groupRef}
        className='kbd-group-class'
        data-testid='kbd-group'>
        <Kbd
          ref={keyRef}
          className='kbd-class'
          data-testid='kbd-key'>
          ⌘K
        </Kbd>
      </KbdGroup>,
    );

    // Assert
    const keyGroup = screen.getByTestId("kbd-group");
    const key = screen.getByTestId("kbd-key");

    expect(keyGroup).toHaveClass("kbd-group-class");
    expect(key).toHaveClass("kbd-class");
    expect(key).toHaveTextContent("⌘K");
    expect(groupRef.current).toBe(keyGroup);
    expect(keyRef.current).toBe(key);
  });

  it("renders ButtonGroup components with children, custom classes, and forwarded refs", () => {
    // Arrange
    const groupRef = {current: null as HTMLDivElement | null};
    const textRef = {current: null as HTMLDivElement | null};

    // Act
    render(
      <ButtonGroup
        ref={groupRef}
        className='button-group-class'
        data-testid='button-group'>
        <button type='button'>Previous</button>
        <ButtonGroupSeparator />
        <ButtonGroupText
          ref={textRef}
          className='button-group-text-class'
          data-testid='button-group-text'>
          Navigation
        </ButtonGroupText>
      </ButtonGroup>,
    );

    // Assert
    const buttonGroup = screen.getByTestId("button-group");
    const buttonGroupText = screen.getByTestId("button-group-text");

    expect(buttonGroup).toHaveClass("button-group-class");
    expect(buttonGroupText).toHaveClass("button-group-text-class");
    expect(screen.getByRole("button", {name: "Previous"})).toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByTestId("button-group").querySelector("[data-slot='button-group-separator']")).toBeInTheDocument();
    expect(groupRef.current).toBe(buttonGroup);
    expect(textRef.current).toBe(buttonGroupText);
  });
});
