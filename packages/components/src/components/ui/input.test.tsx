import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {type ChangeEvent, createRef} from "react";
import {describe, expect, it, vi} from "vitest";

import {Input} from "./input";

describe("Input", () => {
  it("renders without crashing", () => {
    render(<Input aria-label='Email' />);

    expect(screen.getByRole("textbox", {name: "Email"})).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLInputElement>();

    render(
      <Input
        ref={ref}
        aria-label='Email'
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it("applies custom className alongside default styles", () => {
    render(
      <Input
        aria-label='Email'
        className='custom-input'
      />,
    );

    const input = screen.getByRole("textbox", {name: "Email"});

    expect(input).toHaveClass("custom-input");
    expect(input.className).not.toBe("custom-input");
  });

  it("renders the provided value", () => {
    render(
      <Input
        aria-label='First name'
        defaultValue='Alexandru'
      />,
    );

    expect(screen.getByDisplayValue("Alexandru")).toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<(event: ChangeEvent<HTMLInputElement>) => void>();

    render(
      <Input
        aria-label='Email'
        onChange={handleChange}
      />,
    );

    await user.type(screen.getByRole("textbox", {name: "Email"}), "hello");

    expect(handleChange).toHaveBeenCalled();
    const lastCall = handleChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.target.value).toBe("hello");
  });

  it("supports accessible labelling and native attributes", () => {
    render(
      <>
        <label htmlFor='email'>Email address</label>
        <Input
          id='email'
          type='email'
          aria-describedby='email-hint'
        />
        <p id='email-hint'>We will never share your email.</p>
      </>,
    );

    const input = screen.getByLabelText("Email address");

    expect(input).toHaveAttribute("type", "email");
    expect(input).toHaveAttribute("aria-describedby", "email-hint");
  });
});
