import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {RadioGroup, RadioGroupItem} from "./radio-group";

describe("RadioGroup", () => {
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
