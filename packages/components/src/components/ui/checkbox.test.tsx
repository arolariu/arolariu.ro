import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Checkbox} from "./checkbox";

describe("Checkbox", () => {
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
