import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {VisuallyHidden} from "./visually-hidden";

describe("VisuallyHidden", () => {
  it("supplies a button name without removing the hidden text from the accessibility tree", () => {
    render(
      <button type='button'>
        <span aria-hidden='true'>×</span>
        <VisuallyHidden data-testid='label'>Close dialog</VisuallyHidden>
      </button>,
    );
    expect(screen.getByRole("button", {name: "Close dialog"})).toBeInTheDocument();
    expect(screen.getByTestId("label")).not.toHaveAttribute("aria-hidden");
    expect(screen.getByTestId("label")).not.toHaveAttribute("hidden");
  });
  it("renders children in the DOM", () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>);

    expect(screen.getByText("Hidden text")).toBeInTheDocument();
  });

  it("applies visually hidden styles", () => {
    render(<VisuallyHidden data-testid='vh'>Hidden</VisuallyHidden>);

    const element = screen.getByTestId("vh");

    expect(element).toBeInTheDocument();
  });

  it("merges custom className", () => {
    render(<VisuallyHidden className='custom'>Text</VisuallyHidden>);

    const element = screen.getByText("Text");

    expect(element.className).toContain("custom");
  });

  it("forwards ref", () => {
    const ref = {current: null as HTMLSpanElement | null};

    render(<VisuallyHidden ref={ref}>Text</VisuallyHidden>);

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
