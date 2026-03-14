import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

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
