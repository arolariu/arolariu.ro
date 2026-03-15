import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

import {Switch} from "./switch";

describe("Switch", () => {
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
