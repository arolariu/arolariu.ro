import {Field} from "@base-ui/react/field";
import {Switch as BaseSwitch} from "@base-ui/react/switch";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import * as React from "react";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {Switch, type SwitchProps, type SwitchState, type SwitchSize} from "./switch";
import styles from "./switch.module.css";

describe("Switch", () => {
  it("applies distinct small/default track metrics through its CSS Module size selectors", () => {
    const rootClass = styles.root;
    if (!rootClass) throw new Error("Expected switch CSS class");
    const sheet = document.createElement("style");
    sheet.textContent = readFileSync(join(import.meta.dirname, "switch.module.css"), "utf8").replaceAll(".root", `.${rootClass}`);
    document.head.append(sheet);
    try {
      const {rerender} = render(<Switch aria-label='Sized CSS' />);
      const control = screen.getByRole("switch", {name: "Sized CSS"});
      expect(window.getComputedStyle(control).getPropertyValue("--switch-inline-size")).toBe("2rem");
      expect(window.getComputedStyle(control).getPropertyValue("--switch-block-size")).toBe("1.125rem");
      rerender(
        <Switch
          aria-label='Sized CSS'
          size='sm'
        />,
      );
      expect(window.getComputedStyle(control).getPropertyValue("--switch-inline-size")).toBe("1.5rem");
      expect(window.getComputedStyle(control).getPropertyValue("--switch-block-size")).toBe("0.875rem");
    } finally {
      sheet.remove();
    }
  });

  it("exports readonly named props, size, and exact primitive state", () => {
    expect(Switch.displayName).toBe("Switch");
    expectTypeOf<SwitchProps>().toEqualTypeOf<Switch.Props>();
    expectTypeOf<SwitchSize>().toEqualTypeOf<"sm" | "default">();
    expectTypeOf<SwitchState>().toEqualTypeOf<BaseSwitch.Root.State>();
    expectTypeOf<Switch.State>().toEqualTypeOf<SwitchState>();
    expectTypeOf<React.ComponentRef<typeof Switch>>().toEqualTypeOf<HTMLElement>();
  });

  it("renders actual checked state and state classes at both supported sizes", async () => {
    const user = userEvent.setup();
    const view = (size?: "sm" | "default"): React.JSX.Element => (
      <Switch
        aria-label='Sized switch'
        size={size}
        className={(state) => (state.checked ? "on" : "off")}
        render={(props, state) => (
          <span
            {...props}
            data-current={String(state.checked)}
          />
        )}
      />
    );
    const {rerender} = render(view());
    const control = screen.getByRole("switch", {name: "Sized switch"});
    expect(control).toHaveAttribute("data-size", "default");
    expect(control).toHaveAttribute("data-current", "false");
    expect(control).toHaveClass("off");
    await user.click(control);
    expect(control).toHaveAttribute("data-current", "true");
    expect(control).toHaveClass("on");
    rerender(view("sm"));
    expect(control).toHaveAttribute("data-size", "sm");
    expect(control.querySelector("[data-slot=switch-thumb]")).toBeInTheDocument();
  });

  it("keeps the primitive span and hidden input ref/form values without a button mismatch", async () => {
    const user = userEvent.setup();
    const rootRef = React.createRef<HTMLElement>();
    const inputRef = React.createRef<HTMLInputElement>();
    const {container} = render(
      <form>
        <Switch
          ref={rootRef}
          inputRef={inputRef}
          name='setting'
          value='enabled'
          uncheckedValue='disabled'
          aria-label='Setting'
        />
        <Switch
          name='default'
          defaultChecked
          aria-label='Default switch'
        />
        <Switch
          name='excluded'
          disabled
          defaultChecked
          aria-label='Excluded switch'
        />
      </form>,
    );
    const form = container.querySelector("form");
    if (!form) throw new Error("Expected form");
    const control = screen.getByRole("switch", {name: "Setting"});
    expect(control.tagName).toBe("SPAN");
    expect(rootRef.current).toBe(control);
    expect(inputRef.current).toHaveAttribute("name", "setting");
    expect(new FormData(form).get("setting")).toBe("disabled");
    expect(new FormData(form).get("default")).toBe("on");
    expect(new FormData(form).has("excluded")).toBe(false);
    await user.click(control);
    expect(new FormData(form).get("setting")).toBe("enabled");
  });

  it("delivers cancellable boolean/details changes on native button composition", async () => {
    const user = userEvent.setup();
    const rootRef = React.createRef<HTMLButtonElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const rootClick = vi.fn();
    const childClick = vi.fn();
    const change = vi.fn<NonNullable<Switch.Props["onCheckedChange"]>>((_checked, details) => details.cancel());
    render(
      <Switch
        nativeButton
        ref={rootRef}
        aria-label='Native switch'
        onClick={rootClick}
        onCheckedChange={change}
        render={
          <button
            ref={childRef}
            onClick={childClick}
            data-child='kept'>
            Switch label
          </button>
        }
      />,
    );
    const control = screen.getByRole("switch", {name: "Native switch"});
    expect(control.tagName).toBe("BUTTON");
    expect(control).toHaveAttribute("type", "button");
    expect(rootRef.current).toBe(control);
    expect(childRef.current).toBe(control);
    expect(control).toHaveAttribute("data-child", "kept");
    expect(control).toHaveTextContent("Switch label");
    await user.click(control);
    expect(rootClick).toHaveBeenCalledTimes(1);
    expect(childClick).toHaveBeenCalledTimes(1);
    expect(change).toHaveBeenCalledWith(true, expect.objectContaining({reason: "none", isCanceled: true}));
    expect(control).toHaveAttribute("aria-checked", "false");
  });

  it("respects composed consumer cancellation before primitive activation", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <Switch
        aria-label='Cancel switch'
        onCheckedChange={change}
        onClick={(event) => event.preventBaseUIHandler()}
        render={<span />}
      />,
    );
    await user.click(screen.getByRole("switch", {name: "Cancel switch"}));
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole("switch", {name: "Cancel switch"})).toHaveAttribute("aria-checked", "false");
  });

  it("receives live disabled and Field state in render/class callbacks", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <Field.Root
        disabled
        invalid
        dirty
        touched>
        <Switch
          aria-label='Field switch'
          onCheckedChange={change}
          className={(state) => (state.disabled ? "disabled-field" : "enabled-field")}
          render={(props, state) => (
            <span
              {...props}
              data-field={JSON.stringify({
                disabled: state.disabled,
                valid: state.valid,
                dirty: state.dirty,
                touched: state.touched,
              })}
            />
          )}
        />
      </Field.Root>,
    );
    const control = screen.getByRole("switch", {name: "Field switch"});
    expect(control).toHaveClass("disabled-field");
    expect(JSON.parse(control.getAttribute("data-field") ?? "{}")).toMatchObject({
      disabled: true,
      valid: false,
      dirty: true,
      touched: true,
    });
    await user.click(control);
    control.focus();
    await user.keyboard(" ");
    expect(change).not.toHaveBeenCalled();
  });

  it("keeps read-only switches unchanged under pointer and keyboard activation", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <Switch
        readOnly
        aria-label='Read only'
        onCheckedChange={change}
      />,
    );
    const control = screen.getByRole("switch", {name: "Read only"});
    await user.click(control);
    await user.keyboard(" ");
    expect(control).toHaveAttribute("aria-readonly", "true");
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(change).not.toHaveBeenCalled();
  });

  it("passes focused/filled Field state and reflects controlled checked rerenders", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    const view = (checked: boolean): React.JSX.Element => (
      <Field.Root>
        <Switch
          checked={checked}
          aria-label='Controlled state'
          onCheckedChange={change}
          render={(props, state) => (
            <span
              {...props}
              data-current={String(state.checked)}
              data-filled={String(state.filled)}
              data-focused={String(state.focused)}
            />
          )}
        />
      </Field.Root>
    );
    const {rerender} = render(view(false));
    const control = screen.getByRole("switch", {name: "Controlled state"});
    await user.click(control);
    expect(change).toHaveBeenCalledWith(true, expect.objectContaining({reason: "none"}));
    expect(control).toHaveAttribute("data-focused", "true");
    expect(control).toHaveAttribute("data-current", "false");
    rerender(view(true));
    expect(control).toHaveAttribute("data-current", "true");
    expect(control).toHaveAttribute("data-filled", "true");
  });

  it("renders without crashing", () => {
    // Arrange
    render(<Switch aria-label='Dark mode' />);

    // Assert
    expect(screen.getByRole("switch", {name: "Dark mode"})).toBeInTheDocument();
  });

  it("forwards its ref to the switch DOM element", () => {
    // Arrange
    const ref = React.createRef<HTMLButtonElement>();

    render(
      <Switch
        ref={ref}
        aria-label='Forwarded switch'
      />,
    );

    // Assert
    expect(ref.current).toBe(screen.getByRole("switch", {name: "Forwarded switch"}));
  });

  it("merges custom class names", () => {
    // Arrange
    render(
      <Switch
        aria-label='Styled switch'
        className='custom-switch'
      />,
    );

    // Assert
    expect(screen.getByRole("switch", {name: "Styled switch"})).toHaveClass("custom-switch");
  });

  it("updates checked state when clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleCheckedChange = vi.fn<(checked: boolean) => void>();

    render(
      <Switch
        aria-label='Notifications'
        onCheckedChange={handleCheckedChange}
      />,
    );

    const switchElement = screen.getByRole("switch", {name: "Notifications"});

    // Assert
    expect(switchElement).toHaveAttribute("aria-checked", "false");

    // Act
    await user.click(switchElement);

    // Assert
    expect(switchElement).toHaveAttribute("aria-checked", "true");
    expect(handleCheckedChange.mock.calls.at(-1)?.[0]).toBe(true);

    // Act
    await user.click(switchElement);

    // Assert
    expect(switchElement).toHaveAttribute("aria-checked", "false");
    expect(handleCheckedChange.mock.calls.at(-1)?.[0]).toBe(false);
  });

  it("marks disabled switches with data-disabled", () => {
    // Arrange
    render(
      <Switch
        aria-label='Disabled switch'
        disabled
      />,
    );

    // Assert
    expect(screen.getByRole("switch", {name: "Disabled switch"})).toHaveAttribute("data-disabled");
  });

  it("supports keyboard toggling with the space key", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Switch aria-label='Keyboard switch' />);

    const switchElement = screen.getByRole("switch", {name: "Keyboard switch"});
    switchElement.focus();

    // Act
    await user.keyboard(" ");

    // Assert
    expect(switchElement).toHaveAttribute("aria-checked", "true");
  });

  it("exposes accessible switch semantics", () => {
    // Arrange
    render(
      <Switch
        aria-label='Accessible switch'
        checked
      />,
    );

    // Assert
    expect(screen.getByRole("switch", {name: "Accessible switch"})).toHaveAttribute("aria-checked", "true");
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleCheckedChange = vi.fn<(checked: boolean) => void>();

    function ControlledSwitch(): React.JSX.Element {
      const [checked, setChecked] = React.useState(false);

      return (
        <Switch
          checked={checked}
          aria-label='Controlled switch'
          onCheckedChange={(nextChecked) => {
            setChecked(nextChecked);
            handleCheckedChange(nextChecked);
          }}
        />
      );
    }

    render(<ControlledSwitch />);

    const switchElement = screen.getByRole("switch", {name: "Controlled switch"});

    expect(switchElement).toHaveAttribute("aria-checked", "false");

    // Act
    await user.click(switchElement);

    // Assert
    expect(handleCheckedChange).toHaveBeenCalledWith(true);
    expect(switchElement).toHaveAttribute("aria-checked", "true");
  });
});
