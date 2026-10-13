import {Checkbox as BaseCheckbox} from "@base-ui/react/checkbox";
import {Field} from "@base-ui/react/field";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {Checkbox, type CheckboxProps, type CheckboxState} from "./checkbox";

describe("Checkbox", () => {
  it("exports the component and precise named primitive types", () => {
    expect(Checkbox.displayName).toBe("Checkbox");
    expectTypeOf<CheckboxProps>().toEqualTypeOf<Checkbox.Props>();
    expectTypeOf<CheckboxState>().toEqualTypeOf<BaseCheckbox.Root.State>();
    expectTypeOf<Checkbox.State>().toEqualTypeOf<CheckboxState>();
    expectTypeOf<React.ComponentRef<typeof Checkbox>>().toEqualTypeOf<HTMLElement>();
    expectTypeOf<NonNullable<CheckboxProps["onCheckedChange"]>>().toEqualTypeOf<NonNullable<BaseCheckbox.Root.Props["onCheckedChange"]>>();
  });

  it("renders with the actual Checkbox checked state", () => {
    render(
      <Checkbox
        checked
        aria-label='Consent'
        render={(props, state) => (
          <span
            {...props}
            data-contract-checked={String(state.checked)}
          />
        )}
      />,
    );
    expect(screen.getByRole("checkbox", {name: "Consent"})).toHaveAttribute("data-contract-checked", "true");
  });

  it("preserves the primitive span contract and both root and hidden input refs", async () => {
    const user = userEvent.setup();
    const rootRef = React.createRef<HTMLElement>();
    const inputRef = React.createRef<HTMLInputElement>();
    render(
      <Checkbox
        ref={rootRef}
        inputRef={inputRef}
        aria-label='Span contract'
      />,
    );
    const control = screen.getByRole("checkbox", {name: "Span contract"});
    expect(control.tagName).toBe("SPAN");
    expect(rootRef.current).toBe(control);
    expect(inputRef.current).toHaveAttribute("type", "checkbox");
    expect(control).not.toHaveAttribute("type");
    await user.click(control);
    expect(inputRef.current?.checked).toBe(true);
  });

  it("preserves explicit indeterminate state without normalizing boolean checked values", () => {
    const {rerender} = render(
      <Checkbox
        checked={false}
        indeterminate
        aria-label='Mixed'
        className={(state) => (state.indeterminate ? "mixed" : "settled")}
        render={(props, state) => (
          <span
            {...props}
            data-checked={String(state.checked)}
            data-mixed={String(state.indeterminate)}
          />
        )}
      />,
    );
    const control = screen.getByRole("checkbox", {name: "Mixed"});
    expect(control).toHaveClass("mixed");
    expect(control).toHaveAttribute("data-checked", "false");
    expect(control).toHaveAttribute("data-mixed", "true");
    expect(control).toHaveAttribute("aria-checked", "mixed");
    rerender(
      <Checkbox
        checked
        aria-label='Mixed'
      />,
    );
    expect(control).toHaveAttribute("aria-checked", "true");
    expect(control).not.toHaveAttribute("data-indeterminate");
  });

  it("sends boolean changes and cancellable primitive details through the legacy mixed mapping", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<NonNullable<Checkbox.Props["onCheckedChange"]>>((_checked, details) => details.cancel());
    render(
      <Checkbox
        checked='indeterminate'
        aria-label='Legacy mixed'
        onCheckedChange={handleChange}
      />,
    );
    await user.click(screen.getByRole("checkbox", {name: "Legacy mixed"}));
    expect(handleChange).toHaveBeenCalledWith(false, expect.objectContaining({reason: "none", isCanceled: true}));
    expect(screen.getByRole("checkbox", {name: "Legacy mixed"})).toHaveAttribute("aria-checked", "mixed");
  });

  it("submits named form values, unchecked fallback values, and excludes disabled fields", async () => {
    const user = userEvent.setup();
    const {container} = render(
      <form aria-label='Consent form'>
        <Checkbox
          name='consent'
          value='yes'
          uncheckedValue='no'
          aria-label='Named consent'
        />
        <Checkbox
          name='default'
          defaultChecked
          aria-label='Default value'
        />
        <Checkbox
          name='disabled'
          disabled
          defaultChecked
          aria-label='Excluded'
        />
      </form>,
    );
    const form = container.querySelector("form");
    if (!form) throw new Error("Expected form");
    expect(new FormData(form).get("consent")).toBe("no");
    expect(new FormData(form).get("default")).toBe("on");
    expect(new FormData(form).has("disabled")).toBe(false);
    await user.click(screen.getByRole("checkbox", {name: "Named consent"}));
    expect(new FormData(form).get("consent")).toBe("yes");
  });

  it("passes live Field state to render and class callbacks", async () => {
    const user = userEvent.setup();
    render(
      <Field.Root
        invalid
        dirty
        touched>
        <Checkbox
          aria-label='Field consent'
          className={(state) => (state.focused ? "focused-field" : "idle-field")}
          render={(props, state) => (
            <span
              {...props}
              data-field={JSON.stringify({
                valid: state.valid,
                dirty: state.dirty,
                touched: state.touched,
                filled: state.filled,
                focused: state.focused,
              })}
            />
          )}
        />
      </Field.Root>,
    );
    const control = screen.getByRole("checkbox", {name: "Field consent"});
    expect(JSON.parse(control.getAttribute("data-field") ?? "{}")).toMatchObject({valid: false, dirty: true, touched: true});
    await user.click(control);
    expect(control).toHaveClass("focused-field");
    expect(JSON.parse(control.getAttribute("data-field") ?? "{}")).toMatchObject({filled: true, focused: true});
  });

  it("supports native button composition and consumer cancellation without submitting the form", async () => {
    const user = userEvent.setup();
    const rootRef = React.createRef<HTMLButtonElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const childClick = vi.fn();
    const rootClick = vi.fn<NonNullable<Checkbox.Props["onClick"]>>((event) => event.preventBaseUIHandler());
    const submit = vi.fn<React.FormEventHandler<HTMLFormElement>>((event) => event.preventDefault());
    render(
      <form onSubmit={submit}>
        <Checkbox
          nativeButton
          ref={rootRef}
          aria-label='Native consent'
          onClick={rootClick}
          render={
            <button
              ref={childRef}
              onClick={childClick}
              data-child='kept'>
              Consent label
            </button>
          }
        />
      </form>,
    );
    const control = screen.getByRole("checkbox", {name: "Native consent"});
    expect(control.tagName).toBe("BUTTON");
    expect(control).toHaveAttribute("type", "button");
    expect(control).toHaveAttribute("data-child", "kept");
    expect(control).toHaveTextContent("Consent label");
    expect(childRef.current).toBe(control);
    expect(rootRef.current).toBe(control);
    await user.click(control);
    expect(childClick).toHaveBeenCalledTimes(1);
    expect(rootClick).toHaveBeenCalledTimes(1);
    expect(control).toHaveAttribute("aria-checked", "false");
    expect(submit).not.toHaveBeenCalled();
  });

  it("receives disabled and read-only primitive state in custom render targets", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const {rerender} = render(
      <Checkbox
        aria-label='Guarded'
        disabled
        onCheckedChange={handleChange}
        render={(props, state) => (
          <span
            {...props}
            data-disabled-state={String(state.disabled)}
          />
        )}
      />,
    );
    const control = screen.getByRole("checkbox", {name: "Guarded"});
    expect(control).toHaveAttribute("aria-disabled", "true");
    expect(control).toHaveAttribute("data-disabled-state", "true");
    await user.click(control);
    control.focus();
    await user.keyboard(" ");
    expect(handleChange).not.toHaveBeenCalled();
    rerender(
      <Checkbox
        aria-label='Guarded'
        readOnly
        onCheckedChange={handleChange}
      />,
    );
    await user.click(control);
    expect(control).toHaveAttribute("aria-readonly", "true");
    expect(handleChange).not.toHaveBeenCalled();
  });

  it("reflects controlled rerenders in primitive callbacks without committing user changes", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const view = (checked: boolean): React.JSX.Element => (
      <Checkbox
        checked={checked}
        aria-label='Controlled render'
        onCheckedChange={handleChange}
        className={(state) => (state.checked ? "selected" : "unselected")}
        render={(props, state) => (
          <span
            {...props}
            data-current={String(state.checked)}
          />
        )}
      />
    );
    const {rerender} = render(view(false));
    const control = screen.getByRole("checkbox", {name: "Controlled render"});
    await user.click(control);
    expect(handleChange).toHaveBeenCalledWith(true, expect.objectContaining({reason: "none"}));
    expect(control).toHaveAttribute("data-current", "false");
    rerender(view(true));
    expect(control).toHaveAttribute("data-current", "true");
    expect(control).toHaveClass("selected");
  });

  it("renders without crashing", () => {
    // Arrange
    render(<Checkbox aria-label='Accept terms' />);

    // Assert
    expect(screen.getByRole("checkbox", {name: "Accept terms"})).toBeInTheDocument();
  });

  it("forwards its ref to the checkbox DOM element", () => {
    // Arrange
    const ref = React.createRef<HTMLButtonElement>();

    render(
      <Checkbox
        ref={ref}
        aria-label='Forwarded checkbox'
      />,
    );

    // Assert
    expect(ref.current).toBe(screen.getByRole("checkbox", {name: "Forwarded checkbox"}));
  });

  it("merges custom class names", () => {
    // Arrange
    render(
      <Checkbox
        aria-label='Styled checkbox'
        className='custom-checkbox'
      />,
    );

    // Assert
    expect(screen.getByRole("checkbox", {name: "Styled checkbox"})).toHaveClass("custom-checkbox");
  });

  it("updates checked state when clicked", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleCheckedChange = vi.fn<(checked: boolean | "indeterminate") => void>();

    render(
      <Checkbox
        aria-label='Marketing emails'
        onCheckedChange={handleCheckedChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox", {name: "Marketing emails"});

    // Assert
    expect(checkbox).toHaveAttribute("aria-checked", "false");

    // Act
    await user.click(checkbox);

    // Assert
    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(handleCheckedChange.mock.calls.at(-1)?.[0]).toBe(true);

    // Act
    await user.click(checkbox);

    // Assert
    expect(checkbox).toHaveAttribute("aria-checked", "false");
    expect(handleCheckedChange.mock.calls.at(-1)?.[0]).toBe(false);
  });

  it("marks disabled checkboxes with data-disabled", () => {
    // Arrange
    render(
      <Checkbox
        aria-label='Disabled checkbox'
        disabled
      />,
    );

    // Assert
    expect(screen.getByRole("checkbox", {name: "Disabled checkbox"})).toHaveAttribute("data-disabled");
  });

  it("does not call onCheckedChange when disabled", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleCheckedChange = vi.fn<(checked: boolean | "indeterminate") => void>();

    render(
      <Checkbox
        aria-label='Disabled callback checkbox'
        disabled
        onCheckedChange={handleCheckedChange}
      />,
    );

    const checkbox = screen.getByRole("checkbox", {name: "Disabled callback checkbox"});

    // Act
    await user.click(checkbox);

    // Assert
    expect(handleCheckedChange).not.toHaveBeenCalled();
    expect(checkbox).toHaveAttribute("aria-checked", "false");
  });

  it("supports keyboard toggling with the space key", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Checkbox aria-label='Keyboard checkbox' />);

    const checkbox = screen.getByRole("checkbox", {name: "Keyboard checkbox"});
    checkbox.focus();

    // Act
    await user.keyboard(" ");

    // Assert
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });

  it("exposes accessible checkbox semantics for indeterminate state", () => {
    // Arrange
    render(
      <Checkbox
        aria-label='Select all rows'
        checked='indeterminate'
      />,
    );

    // Assert
    expect(screen.getByRole("checkbox", {name: "Select all rows"})).toHaveAttribute("aria-checked", "mixed");
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleCheckedChange = vi.fn<(checked: boolean | "indeterminate") => void>();

    function ControlledCheckbox(): React.JSX.Element {
      const [checked, setChecked] = React.useState(false);

      return (
        <Checkbox
          checked={checked}
          aria-label='Controlled checkbox'
          onCheckedChange={(nextChecked) => {
            setChecked(nextChecked === true);
            handleCheckedChange(nextChecked);
          }}
        />
      );
    }

    render(<ControlledCheckbox />);

    const checkbox = screen.getByRole("checkbox", {name: "Controlled checkbox"});

    expect(checkbox).toHaveAttribute("aria-checked", "false");

    // Act
    await user.click(checkbox);

    // Assert
    expect(handleCheckedChange).toHaveBeenCalledWith(true);
    expect(checkbox).toHaveAttribute("aria-checked", "true");
  });
});
