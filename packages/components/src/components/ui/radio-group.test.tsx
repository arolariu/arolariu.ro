import {Field} from "@base-ui/react/field";
import {Radio} from "@base-ui/react/radio";
import {RadioGroup as BaseRadioGroup} from "@base-ui/react/radio-group";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, expectTypeOf, it, vi} from "vitest";

import {
  RadioGroup,
  RadioGroupItem,
  type RadioGroupProps,
  type RadioGroupItemProps,
  type RadioGroupState,
  type RadioGroupItemState,
} from "./radio-group";

describe("RadioGroup", () => {
  it("exports generic named props and exact primitive state for group and items", () => {
    expect(RadioGroup.displayName).toBe("RadioGroup");
    expect(RadioGroupItem.displayName).toBe("RadioGroupItem");
    expectTypeOf<RadioGroupProps<number>>().toEqualTypeOf<RadioGroup.Props<number>>();
    expectTypeOf<RadioGroupItemProps<number>>().toEqualTypeOf<RadioGroupItem.Props<number>>();
    expectTypeOf<RadioGroupState>().toEqualTypeOf<BaseRadioGroup.State>();
    expectTypeOf<RadioGroupItemState>().toEqualTypeOf<Radio.Root.State>();
    expectTypeOf<RadioGroup.State>().toEqualTypeOf<RadioGroupState>();
    expectTypeOf<RadioGroupItem.State>().toEqualTypeOf<RadioGroupItemState>();
    expectTypeOf<NonNullable<RadioGroupProps<number>["onValueChange"]>>().parameter(0).toEqualTypeOf<number>();
  });

  it("uses React 19 functions without exotic ref boundaries", () => {
    expect(typeof RadioGroup).toBe("function");
    expect(typeof RadioGroupItem).toBe("function");
  });

  it("passes actual group Field state and checked item state to render and class callbacks", async () => {
    const user = userEvent.setup();
    render(
      <Field.Root
        invalid
        dirty
        touched>
        <RadioGroup
          aria-label='State group'
          defaultValue='a'
          required
          className={(state) => (state.dirty ? "dirty-group" : "clean-group")}
          render={(props, state) => (
            <section
              {...props}
              data-valid={String(state.valid)}
              data-required={String(state.required)}
            />
          )}>
          <RadioGroupItem
            value='a'
            aria-label='State A'
            className={(state) => (state.checked ? "selected-radio" : "unselected-radio")}
            render={(props, state) => (
              <span
                {...props}
                data-current={String(state.checked)}
                data-touched={String(state.touched)}
              />
            )}
          />
          <RadioGroupItem
            value='b'
            aria-label='State B'
            render={(props, state) => (
              <span
                {...props}
                data-current={String(state.checked)}
              />
            )}
          />
        </RadioGroup>
      </Field.Root>,
    );
    const group = screen.getByRole("radiogroup", {name: "State group"});
    const first = screen.getByRole("radio", {name: "State A"});
    expect(group).toHaveClass("dirty-group");
    expect(group).toHaveAttribute("data-valid", "false");
    expect(group).toHaveAttribute("data-required", "true");
    expect(first).toHaveAttribute("data-current", "true");
    expect(first).toHaveAttribute("data-touched", "true");
    expect(first).toHaveClass("selected-radio");
    await user.click(screen.getByRole("radio", {name: "State B"}));
    expect(first).toHaveAttribute("data-current", "false");
    expect(first).toHaveClass("unselected-radio");
  });

  it("retains the default span contract and named native radio inputs", async () => {
    const user = userEvent.setup();
    const inputRef = React.createRef<HTMLInputElement>();
    const {container} = render(
      <form>
        <RadioGroup
          name='choice'
          defaultValue='a'>
          <RadioGroupItem
            inputRef={inputRef}
            value='a'
            aria-label='Form A'
          />
          <RadioGroupItem
            value='b'
            aria-label='Form B'
          />
        </RadioGroup>
      </form>,
    );
    const form = container.querySelector("form");
    if (!form) throw new Error("Expected form");
    const first = screen.getByRole("radio", {name: "Form A"});
    expect(first.tagName).toBe("SPAN");
    expect(inputRef.current).toHaveAttribute("name", "choice");
    expect(inputRef.current).toHaveAttribute("type", "radio");
    expect(new FormData(form).get("choice")).toBe("a");
    await user.click(screen.getByRole("radio", {name: "Form B"}));
    expect(new FormData(form).get("choice")).toBe("b");
  });

  it("supports native item targets, merged refs/handlers, and change cancellation", async () => {
    const user = userEvent.setup();
    const outerRef = React.createRef<HTMLButtonElement>();
    const childRef = React.createRef<HTMLButtonElement>();
    const childClick = vi.fn();
    const outerClick = vi.fn();
    const onValueChange = vi.fn<NonNullable<RadioGroup.Props<string>["onValueChange"]>>((_value, details) => details.cancel());
    render(
      <RadioGroup
        defaultValue='a'
        onValueChange={onValueChange}>
        <RadioGroupItem
          value='a'
          aria-label='Native A'
        />
        <RadioGroupItem
          ref={outerRef}
          nativeButton
          value='b'
          aria-label='Native B'
          onClick={outerClick}
          render={
            <button
              ref={childRef}
              onClick={childClick}
              data-child='kept'>
              Radio label
            </button>
          }
        />
      </RadioGroup>,
    );
    const second = screen.getByRole("radio", {name: "Native B"});
    expect(second).toHaveAttribute("type", "button");
    expect(second).toHaveAttribute("data-child", "kept");
    expect(second).toHaveTextContent("Radio label");
    expect(childRef.current).toBe(second);
    expect(outerRef.current).toBe(second);
    await user.click(second);
    expect(childClick).toHaveBeenCalledTimes(1);
    expect(outerClick).toHaveBeenCalledTimes(1);
    expect(onValueChange).toHaveBeenCalledWith("b", expect.objectContaining({reason: "none", isCanceled: true}));
    expect(second).toHaveAttribute("aria-checked", "false");
  });

  it("respects consumer handler cancellation on composed radio targets", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <RadioGroup onValueChange={change}>
        <RadioGroupItem
          value='cancel'
          aria-label='Cancel selection'
          render={<span onClick={(event) => event.preventDefault()} />}
        />
      </RadioGroup>,
    );
    await user.click(screen.getByRole("radio", {name: "Cancel selection"}));
    expect(change).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", {name: "Cancel selection"})).toHaveAttribute("aria-checked", "false");
  });

  it("moves arrow focus past disabled items without selecting them", async () => {
    const user = userEvent.setup();
    render(
      <RadioGroup defaultValue='a'>
        <RadioGroupItem
          value='a'
          aria-label='Keyboard A'
        />
        <RadioGroupItem
          value='b'
          aria-label='Keyboard B'
          disabled
        />
        <RadioGroupItem
          value='c'
          aria-label='Keyboard C'
        />
      </RadioGroup>,
    );
    await user.tab();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", {name: "Keyboard C"})).toHaveFocus();
    expect(screen.getByRole("radio", {name: "Keyboard C"})).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", {name: "Keyboard B"})).toHaveAttribute("aria-checked", "false");
  });

  it("passes group-disabled state to item callbacks and prevents mouse/space selection", async () => {
    const user = userEvent.setup();
    const change = vi.fn();
    render(
      <RadioGroup
        disabled
        onValueChange={change}>
        <RadioGroupItem
          value='blocked'
          aria-label='Blocked radio'
          className={(state) => (state.disabled ? "disabled-radio" : "enabled-radio")}
          render={(props, state) => (
            <span
              {...props}
              data-disabled-state={String(state.disabled)}
            />
          )}
        />
      </RadioGroup>,
    );
    const radio = screen.getByRole("radio", {name: "Blocked radio"});
    expect(radio).toHaveClass("disabled-radio");
    expect(radio).toHaveAttribute("data-disabled-state", "true");
    await user.click(radio);
    radio.focus();
    await user.keyboard(" ");
    expect(change).not.toHaveBeenCalled();
  });

  it("reflects controlled rerenders while preserving typed numeric values and details", async () => {
    const user = userEvent.setup();
    const change = vi.fn<NonNullable<RadioGroup.Props<number>["onValueChange"]>>();
    const view = (value: number): React.JSX.Element => (
      <RadioGroup
        value={value}
        onValueChange={change}>
        <RadioGroupItem
          value={1}
          aria-label='One'
          render={(props, state) => (
            <span
              {...props}
              data-current={String(state.checked)}
            />
          )}
        />
        <RadioGroupItem
          value={2}
          aria-label='Two'
        />
      </RadioGroup>
    );
    const {rerender} = render(view(1));
    const first = screen.getByRole("radio", {name: "One"});
    await user.click(screen.getByRole("radio", {name: "Two"}));
    expect(change).toHaveBeenCalledWith(2, expect.objectContaining({reason: "none"}));
    expect(first).toHaveAttribute("data-current", "true");
    rerender(view(2));
    expect(first).toHaveAttribute("data-current", "false");
    expect(screen.getByRole("radio", {name: "Two"})).toHaveAttribute("aria-checked", "true");
  });

  it("renders without crashing", () => {
    // Arrange
    render(
      <RadioGroup aria-label='Plan'>
        <RadioGroupItem
          value='starter'
          aria-label='Starter'
        />
        <RadioGroupItem
          value='pro'
          aria-label='Pro'
        />
      </RadioGroup>,
    );

    // Assert
    expect(screen.getByRole("radiogroup", {name: "Plan"})).toBeInTheDocument();
    expect(screen.getByRole("radio", {name: "Starter"})).toBeInTheDocument();
    expect(screen.getByRole("radio", {name: "Pro"})).toBeInTheDocument();
  });

  it("forwards refs to the group and radio item DOM elements", () => {
    // Arrange
    const groupRef = React.createRef<HTMLDivElement>();
    const itemRef = React.createRef<HTMLButtonElement>();

    render(
      <RadioGroup
        ref={groupRef}
        aria-label='Forwarded plans'>
        <RadioGroupItem
          ref={itemRef}
          value='starter'
          aria-label='Starter ref'
        />
      </RadioGroup>,
    );

    // Assert
    expect(groupRef.current).toBe(screen.getByRole("radiogroup", {name: "Forwarded plans"}));
    expect(itemRef.current).toBe(screen.getByRole("radio", {name: "Starter ref"}));
  });

  it("merges custom class names for the group and items", () => {
    // Arrange
    render(
      <RadioGroup
        aria-label='Styled plans'
        className='custom-radio-group'>
        <RadioGroupItem
          value='starter'
          aria-label='Styled radio'
          className='custom-radio-item'
        />
      </RadioGroup>,
    );

    // Assert
    expect(screen.getByRole("radiogroup", {name: "Styled plans"})).toHaveClass("custom-radio-group");
    expect(screen.getByRole("radio", {name: "Styled radio"})).toHaveClass("custom-radio-item");
  });

  it("updates selection state when a radio is chosen", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string) => void>();

    render(
      <RadioGroup
        aria-label='Billing plan'
        defaultValue='starter'
        onValueChange={handleValueChange}>
        <RadioGroupItem
          value='starter'
          aria-label='Starter plan'
        />
        <RadioGroupItem
          value='pro'
          aria-label='Pro plan'
        />
      </RadioGroup>,
    );

    const starterRadio = screen.getByRole("radio", {name: "Starter plan"});
    const proRadio = screen.getByRole("radio", {name: "Pro plan"});

    // Assert
    expect(starterRadio).toHaveAttribute("aria-checked", "true");
    expect(proRadio).toHaveAttribute("aria-checked", "false");

    // Act
    await user.click(proRadio);

    // Assert
    expect(starterRadio).toHaveAttribute("aria-checked", "false");
    expect(proRadio).toHaveAttribute("aria-checked", "true");
    expect(handleValueChange.mock.calls.at(-1)?.[0]).toBe("pro");
  });

  it("marks disabled radio items with data-disabled", () => {
    // Arrange
    render(
      <RadioGroup aria-label='Disabled plan group'>
        <RadioGroupItem
          value='enterprise'
          aria-label='Enterprise plan'
          disabled
        />
      </RadioGroup>,
    );

    // Assert
    expect(screen.getByRole("radio", {name: "Enterprise plan"})).toHaveAttribute("data-disabled");
  });

  it("supports keyboard selection with arrow keys", async () => {
    // Arrange
    const user = userEvent.setup();

    render(
      <RadioGroup
        aria-label='Keyboard plan'
        defaultValue='starter'>
        <RadioGroupItem
          value='starter'
          aria-label='Starter keyboard plan'
        />
        <RadioGroupItem
          value='pro'
          aria-label='Pro keyboard plan'
        />
      </RadioGroup>,
    );

    const proRadio = screen.getByRole("radio", {name: "Pro keyboard plan"});

    // Act
    await user.tab();
    await user.keyboard("{ArrowRight}");

    // Assert
    expect(proRadio).toHaveAttribute("aria-checked", "true");
  });

  it("exposes accessible radio roles and checked state", () => {
    // Arrange
    render(
      <RadioGroup
        aria-label='Accessible plan'
        defaultValue='starter'>
        <RadioGroupItem
          value='starter'
          aria-label='Starter accessible plan'
        />
        <RadioGroupItem
          value='pro'
          aria-label='Pro accessible plan'
        />
      </RadioGroup>,
    );

    // Assert
    expect(screen.getByRole("radiogroup", {name: "Accessible plan"})).toBeInTheDocument();
    expect(screen.getByRole("radio", {name: "Starter accessible plan"})).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", {name: "Pro accessible plan"})).toHaveAttribute("aria-checked", "false");
  });

  it("works in controlled mode", async () => {
    // Arrange
    const user = userEvent.setup();
    const handleValueChange = vi.fn<(value: string) => void>();

    function ControlledRadioGroup(): React.JSX.Element {
      const [value, setValue] = React.useState("starter");

      return (
        <RadioGroup
          aria-label='Controlled plan'
          value={value}
          onValueChange={(nextValue) => {
            setValue(nextValue);
            handleValueChange(nextValue);
          }}>
          <RadioGroupItem
            value='starter'
            aria-label='Starter controlled plan'
          />
          <RadioGroupItem
            value='pro'
            aria-label='Pro controlled plan'
          />
        </RadioGroup>
      );
    }

    render(<ControlledRadioGroup />);

    const starterRadio = screen.getByRole("radio", {name: "Starter controlled plan"});
    const proRadio = screen.getByRole("radio", {name: "Pro controlled plan"});

    expect(starterRadio).toHaveAttribute("aria-checked", "true");
    expect(proRadio).toHaveAttribute("aria-checked", "false");

    // Act
    await user.click(proRadio);

    // Assert
    expect(handleValueChange).toHaveBeenCalledWith("pro");
    expect(starterRadio).toHaveAttribute("aria-checked", "false");
    expect(proRadio).toHaveAttribute("aria-checked", "true");
  });
});
