import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Textarea} from "./textarea";

describe("Textarea", () => {
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
