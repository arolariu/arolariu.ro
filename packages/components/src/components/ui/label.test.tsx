import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Label} from "./label";

describe("Label", () => {
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
