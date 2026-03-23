import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Checkbox} from "./checkbox";
import {CheckboxGroup} from "./checkbox-group";

describe("CheckboxGroup", () => {
  it("renders without crashing", () => {
    // Arrange
    render(
      <CheckboxGroup
        role='group'
        aria-label='Notification channels'>
        <Checkbox
          value='email'
          aria-label='Email notifications'
        />
        <Checkbox
          value='sms'
          aria-label='SMS notifications'
        />
      </CheckboxGroup>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Notification channels"})).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: "Email notifications"})).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: "SMS notifications"})).toBeInTheDocument();
  });

  it("forwards its ref to the group DOM element", () => {
    // Arrange
    const ref = React.createRef<HTMLDivElement>();

    render(
      <CheckboxGroup
        ref={ref}
        role='group'
        aria-label='Forwarded checkbox group'>
        <Checkbox
          value='email'
          aria-label='Email ref option'
        />
      </CheckboxGroup>,
    );

    // Assert
    expect(ref.current).toBe(screen.getByRole("group", {name: "Forwarded checkbox group"}));
  });

  it("merges custom class names", () => {
    // Arrange
    render(
      <CheckboxGroup
        role='group'
        aria-label='Styled checkbox group'
        className='custom-checkbox-group'>
        <Checkbox
          value='email'
          aria-label='Styled checkbox option'
        />
      </CheckboxGroup>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Styled checkbox group"})).toHaveClass("custom-checkbox-group");
  });

  it("updates selected values when checkboxes are toggled", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string[]) => void>();

    render(
      <CheckboxGroup
        role='group'
        aria-label='Delivery preferences'
        defaultValue={["sms"]}
        onValueChange={handleValueChange}>
        <Checkbox
          value='email'
          aria-label='Email delivery'
        />
        <Checkbox
          value='sms'
          aria-label='SMS delivery'
        />
      </CheckboxGroup>,
    );

    const emailCheckbox = screen.getByRole("checkbox", {name: "Email delivery"});
    const smsCheckbox = screen.getByRole("checkbox", {name: "SMS delivery"});

    // Assert
    expect(emailCheckbox).toHaveAttribute("aria-checked", "false");
    expect(smsCheckbox).toHaveAttribute("aria-checked", "true");

    // Act
    await user.click(emailCheckbox);

    // Assert
    expect(emailCheckbox).toHaveAttribute("aria-checked", "true");
    expect(handleValueChange.mock.calls.at(-1)?.[0]).toEqual(expect.arrayContaining(["email", "sms"]));
  });

  it("marks disabled groups with data-disabled", () => {
    // Arrange
    render(
      <CheckboxGroup
        role='group'
        aria-label='Disabled notification group'
        disabled>
        <Checkbox
          value='email'
          aria-label='Disabled email option'
        />
      </CheckboxGroup>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Disabled notification group"})).toHaveAttribute("data-disabled");
  });

  it("supports keyboard toggling with the space key", async () => {
    // Arrange
    const user = userEvent.setup();

    render(
      <CheckboxGroup
        role='group'
        aria-label='Keyboard notifications'>
        <Checkbox
          value='push'
          aria-label='Push notifications'
        />
      </CheckboxGroup>,
    );

    const checkbox = screen.getByRole("checkbox", {name: "Push notifications"});
    checkbox.focus();

    // Act
    await user.keyboard(" ");

    // Assert
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("exposes accessible grouping and checkbox semantics", () => {
    // Arrange
    render(
      <CheckboxGroup
        role='group'
        aria-label='Accessible notifications'
        defaultValue={["email"]}>
        <Checkbox
          value='email'
          aria-label='Accessible email option'
        />
        <Checkbox
          value='sms'
          aria-label='Accessible sms option'
        />
      </CheckboxGroup>,
    );

    // Assert
    expect(screen.getByRole("group", {name: "Accessible notifications"})).toBeInTheDocument();
    expect(screen.getByRole("checkbox", {name: "Accessible email option"})).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("checkbox", {name: "Accessible sms option"})).toHaveAttribute("aria-checked", "false");
  });
});
