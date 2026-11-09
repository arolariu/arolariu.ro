import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {type ChangeEvent, createRef, type JSX, useState} from "react";
import {describe, expect, it, vi} from "vitest";

import {Textarea} from "./textarea";

describe("Textarea", () => {
  it("identifies a native multiline control without replacing its form contract", async () => {
    function Controlled(): JSX.Element {
      const [value, setValue] = useState("");
      return (
        <form aria-label='Notes form'>
          <Textarea
            name='notes'
            aria-label='Notes'
            rows={4}
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
        </form>
      );
    }
    const user = userEvent.setup();
    render(<Controlled />);
    const textarea = screen.getByRole("textbox", {name: "Notes"});
    expect(textarea).toHaveAttribute("data-slot", "textarea");
    expect(textarea).toHaveAttribute("rows", "4");
    await user.type(textarea, "First{Enter}Second");
    expect(textarea).toHaveValue("First\nSecond");
    const form = screen.getByRole("form", {name: "Notes form"});
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a form");
    expect(new FormData(form).get("notes")).toBe("First\nSecond");
  });

  it("preserves readOnly, disabled, invalid state and callback ref cleanup", async () => {
    const user = userEvent.setup();
    const cleanup = vi.fn();
    const ref = vi.fn((_element: HTMLTextAreaElement | null) => cleanup);
    const {rerender, unmount} = render(
      <Textarea
        ref={ref}
        aria-label='Read only'
        readOnly
        value='Fixed'
        aria-invalid='true'
      />,
    );
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "Ignored");
    expect(textarea).toHaveValue("Fixed");
    expect(textarea).toHaveAttribute("aria-invalid", "true");
    rerender(
      <Textarea
        ref={ref}
        aria-label='Disabled'
        disabled
        defaultValue='Fixed'
      />,
    );
    expect(screen.getByRole("textbox")).toBeDisabled();
    unmount();
    expect(cleanup).toHaveBeenCalled();
  });

  it("allows opt-in content sizing while retaining native rows and form association", () => {
    render(
      <>
        <form
          id='external-notes'
          aria-label='External notes form'
        />
        <Textarea
          aria-label='Content notes'
          data-sizing='content'
          form='external-notes'
          name='notes'
          rows={3}
          defaultValue='Saved notes'
        />
      </>,
    );
    const textarea = screen.getByRole("textbox", {name: "Content notes"});
    expect(textarea).toHaveAttribute("data-sizing", "content");
    expect(textarea).toHaveAttribute("rows", "3");
    const form = screen.getByRole("form", {name: "External notes form"});
    if (!(form instanceof HTMLFormElement)) throw new Error("Expected a form");
    expect(new FormData(form).get("notes")).toBe("Saved notes");
  });
  it("renders without crashing", () => {
    render(<Textarea aria-label='Message' />);

    expect(screen.getByRole("textbox", {name: "Message"})).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<HTMLTextAreaElement>();

    render(
      <Textarea
        ref={ref}
        aria-label='Message'
      />,
    );

    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("applies custom className alongside default styles", () => {
    render(
      <Textarea
        aria-label='Message'
        className='custom-textarea'
      />,
    );

    const textarea = screen.getByRole("textbox", {name: "Message"});

    expect(textarea).toHaveClass("custom-textarea");
    expect(textarea.className).not.toBe("custom-textarea");
  });

  it("renders the provided value", () => {
    render(
      <Textarea
        aria-label='Notes'
        defaultValue='Initial notes'
      />,
    );

    expect(screen.getByDisplayValue("Initial notes")).toBeInTheDocument();
  });

  it("calls onChange when user types", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn<(event: ChangeEvent<HTMLTextAreaElement>) => void>();

    render(
      <Textarea
        aria-label='Message'
        onChange={handleChange}
      />,
    );

    await user.type(screen.getByRole("textbox", {name: "Message"}), "hello");

    expect(handleChange).toHaveBeenCalled();
    const lastCall = handleChange.mock.calls.at(-1)?.[0];
    expect(lastCall?.target.value).toBe("hello");
  });

  it("supports accessible labelling and aria attributes", () => {
    render(
      <>
        <label htmlFor='message'>Message</label>
        <Textarea
          id='message'
          aria-describedby='message-hint'
        />
        <p id='message-hint'>Add supporting context.</p>
      </>,
    );

    const textarea = screen.getByLabelText("Message");

    expect(textarea).toHaveAttribute("aria-describedby", "message-hint");
  });
});
