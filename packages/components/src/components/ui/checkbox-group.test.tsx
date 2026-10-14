import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Checkbox} from "./checkbox";
import {CheckboxGroup} from "./checkbox-group";

describe("CheckboxGroup", () => {
  it("supplies inherited disabled state to render and className callbacks", () => {
    render(
      <CheckboxGroup
        disabled
        role='group'
        aria-label='Stateful notifications'
        className={(state) => (state.disabled ? "disabled-group" : "enabled-group")}
        render={(props, state) => (
          <div
            {...props}
            data-contract-disabled={String(state.disabled)}
          />
        )}>
        <Checkbox
          value='email'
          aria-label='Email'
        />
      </CheckboxGroup>,
    );

    const group = screen.getByRole("group", {name: "Stateful notifications"});
    expect(group).toHaveAttribute("data-contract-disabled", "true");
    expect(group).toHaveClass("disabled-group");
  });

  it("retains controlled values, inherited disabled behavior, keyboard input and native form values", async () => {
    const user = userEvent.setup();
    const changes: string[][] = [];
    const fixture = (value: string[], disabled: boolean): React.ReactElement => (
      <form aria-label='Preferences'>
        <CheckboxGroup
          value={value}
          disabled={disabled}
          role='group'
          aria-label='Channels'
          onValueChange={(nextValue) => changes.push(nextValue)}
          className={(state) => (state.disabled ? "unavailable" : "available")}
          render={(props, state) => (
            <div
              {...props}
              data-contract-disabled={String(state.disabled)}
            />
          )}>
          <Checkbox
            name='channels'
            value='email'
            aria-label='Email'
          />
          <Checkbox
            name='channels'
            value='sms'
            aria-label='SMS'
          />
        </CheckboxGroup>
      </form>
    );
    const {rerender} = render(fixture(["email"], false));
    const email = screen.getByRole("checkbox", {name: "Email"});
    const sms = screen.getByRole("checkbox", {name: "SMS"});
    const form = screen.getByRole<HTMLFormElement>("form", {name: "Preferences"});

    expect(email.tagName).toBe("SPAN");
    expect(sms.tagName).toBe("SPAN");
    expect(new FormData(form).getAll("channels")).toEqual(["email"]);
    await user.tab();
    expect(email).toHaveFocus();
    await user.tab();
    expect(sms).toHaveFocus();
    await user.keyboard(" ");
    expect(changes).toEqual([["email", "sms"]]);
    expect(sms).toHaveAttribute("aria-checked", "false");

    rerender(fixture(["sms"], true));
    expect(email).toHaveAttribute("aria-checked", "false");
    expect(sms).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("group")).toHaveClass("unavailable");
    expect(screen.getByRole("group")).toHaveAttribute("data-contract-disabled", "true");
    expect(new FormData(form).getAll("channels")).toEqual([]);
    await user.click(email);
    email.focus();
    await user.keyboard(" ");
    expect(changes).toHaveLength(1);
  });

  it.each(["element", "callback"] as const)("preserves %s render content, merged events and React 19 ref cleanup", async (mode) => {
    const user = userEvent.setup();
    const nodes: HTMLElement[] = [];
    const forwardedCleanup = vi.fn<(node: HTMLElement) => void>();
    const renderedCleanup = vi.fn<(node: HTMLElement) => void>();
    const forwardedRef = (node: HTMLElement | null): (() => void) | undefined => {
      if (!node) return undefined;
      nodes.push(node);
      return () => forwardedCleanup(node);
    };
    const renderedRef = (node: HTMLDivElement | null): (() => void) | undefined => (node ? () => renderedCleanup(node) : undefined);
    const events: string[] = [];
    const {unmount} = render(
      <CheckboxGroup
        ref={forwardedRef}
        role='group'
        aria-label='Composed channels'
        className='wrapper-class'
        onClick={() => events.push("wrapper")}
        render={
          mode === "element" ? (
            <div
              ref={renderedRef}
              className='render-class'
              onClick={() => events.push("render")}
            />
          ) : (
            (props) => <div {...props} />
          )
        }>
        <span>Group content</span>
      </CheckboxGroup>,
    );
    const group = screen.getByRole("group", {name: "Composed channels"});
    expect(nodes).toContain(group);
    expect(group).toHaveClass("wrapper-class");
    expect(group).toHaveTextContent("Group content");
    if (mode === "element") expect(group).toHaveClass("render-class");
    await user.click(group);
    expect(events).toEqual(mode === "element" ? ["render", "wrapper"] : ["wrapper"]);

    unmount();
    expect(forwardedCleanup).toHaveBeenCalledExactlyOnceWith(group);
    if (mode === "element") expect(renderedCleanup).toHaveBeenCalledExactlyOnceWith(group);
  });

  it("allows value-change cancellation", async () => {
    const user = userEvent.setup();
    const changes: string[][] = [];
    render(
      <CheckboxGroup
        defaultValue={[]}
        onValueChange={(value, details) => {
          changes.push(value);
          details.cancel();
        }}>
        <Checkbox
          value='email'
          aria-label='Email'
        />
      </CheckboxGroup>,
    );
    await user.click(screen.getByRole("checkbox", {name: "Email"}));
    expect(changes).toEqual([["email"]]);
    expect(screen.getByRole("checkbox", {name: "Email"})).toHaveAttribute("aria-checked", "false");
  });

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
