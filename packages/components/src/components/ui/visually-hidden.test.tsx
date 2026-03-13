import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {VisuallyHidden} from "./visually-hidden";

describe("VisuallyHidden", () => {
  it("renders children in the DOM", () => {
    render(<VisuallyHidden>Hidden text</VisuallyHidden>);

    expect(screen.getByText("Hidden text")).toBeInTheDocument();
  });

  it("applies visually hidden styles", () => {
    render(<VisuallyHidden data-testid="vh">Hidden</VisuallyHidden>);

    const element = screen.getByTestId("vh");

    expect(element).toBeInTheDocument();
  });

  it("merges custom className", () => {
    render(<VisuallyHidden className="custom">Text</VisuallyHidden>);

    const element = screen.getByText("Text");

    expect(element.className).toContain("custom");
  });

  it("forwards ref", () => {
    const ref = {current: null as HTMLSpanElement | null};

    render(<VisuallyHidden ref={ref}>Text</VisuallyHidden>);

    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });
});
