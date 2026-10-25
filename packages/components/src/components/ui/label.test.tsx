import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Label} from "./label";

describe("Label", () => {
  it("exposes a label slot and retains native click association", async () => {
    const user = userEvent.setup();
    render(
      <>
        <Label htmlFor='native-label'>Name</Label>
        <input id='native-label' />
      </>,
    );
    expect(screen.getByText("Name")).toHaveAttribute("data-slot", "label");
    await user.click(screen.getByText("Name"));
    expect(screen.getByRole("textbox", {name: "Name"})).toHaveFocus();
  });

  it("does not turn a disabled fieldset label into an enabled control", async () => {
    const user = userEvent.setup();
    render(
      <fieldset disabled>
        <Label htmlFor='disabled-label'>Disabled name</Label>
        <input id='disabled-label' />
      </fieldset>,
    );
    await user.click(screen.getByText("Disabled name"));
    expect(screen.getByRole("textbox", {name: "Disabled name"})).toBeDisabled();
    expect(screen.getByRole("textbox")).not.toHaveFocus();
  });
  it("renders without crashing", () => {
    render(<Label>Content</Label>);

    expect(screen.getByText("Content")).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLLabelElement>();

    render(<Label ref={ref}>Content</Label>);

    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });

  it("applies custom className alongside default styles", () => {
    render(<Label className='custom-label'>Content</Label>);

    const label = screen.getByText("Content");

    expect(label).toHaveClass("custom-label");
    expect(label.className).not.toBe("custom-label");
  });

  it("renders children", () => {
    render(
      <Label>
        <span>Email address</span>
      </Label>,
    );

    expect(screen.getByText("Email address")).toBeInTheDocument();
  });

  it("associates with the related form control", () => {
    render(
      <>
        <Label htmlFor='email'>Email</Label>
        <input id='email' />
      </>,
    );

    expect(screen.getByLabelText("Email")).toHaveAttribute("id", "email");
  });
});
