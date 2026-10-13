import {Field as BaseField} from "@base-ui/react/field";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {type ChangeEvent, createRef, type JSX, useState} from "react";
import {describe, expect, it, vi} from "vitest";

import {Input} from "./input";

describe("Input", () => {
  it("passes actual primitive state to render and class callbacks", async () => {
    const user = userEvent.setup();
    let renderState: Input.State | undefined;
    let classState: Input.State | undefined;
    render(
      <BaseField.Root
        invalid
        dirty
        touched>
        <Input
          aria-label='Composed'
          className={(state) => {
            classState = state;
            return state.valid === false ? "invalid-control" : "valid-control";
          }}
          render={(props, state) => {
            renderState = state;
            return <input {...props} />;
          }}
        />
      </BaseField.Root>,
    );
    const input = screen.getByRole("textbox", {name: "Composed"});
    expect(renderState).toMatchObject({valid: false, dirty: true, touched: true, disabled: false});
    expect(classState).toMatchObject({valid: false, dirty: true, touched: true, disabled: false});
    expect(input).toHaveClass("invalid-control");
    expect(input).toHaveAttribute("data-slot", "input");
    await user.click(input);
    expect(renderState?.focused).toBe(true);
  });

  it("merges composed input handlers, ARIA and callback refs with cleanup", async () => {
    const user = userEvent.setup();
    const ref = createRef<HTMLElement>();
    const cleanup = vi.fn();
    const childRef = vi.fn((_element: HTMLInputElement | null) => cleanup);
    const childClick = vi.fn();
    const wrapperClick = vi.fn();
    const {unmount} = render(
      <Input
        ref={ref}
        onClick={wrapperClick}
        aria-label='Composed input'
        render={
          <input
            ref={childRef}
            onClick={childClick}
            className='child-input'
          />
        }
      />,
    );
    const input = screen.getByRole("textbox", {name: "Composed input"});
    expect(ref.current).toBe(input);
    expect(childRef).toHaveBeenCalledWith(input);
    expect(input).toHaveClass("child-input");
    await user.click(input);
    expect(wrapperClick).toHaveBeenCalledTimes(1);
    expect(childClick).toHaveBeenCalledTimes(1);
    unmount();
    expect(ref.current).toBeNull();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("keeps controlled onValueChange and native form values", async () => {
    function Controlled(): JSX.Element {
      const [value, setValue] = useState("");
      return (
        <form aria-label='Profile'>
          <Input
            aria-label='Nickname'
            name='nickname'
            value={value}
            onValueChange={setValue}
          />
        </form>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    await user.type(screen.getByRole("textbox", {name: "Nickname"}), "Alex");
    const form = screen.getByRole("form", {name: "Profile"});
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a form");
    expect(new FormData(form).get("nickname")).toBe("Alex");
  });
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
