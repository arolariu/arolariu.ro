import {render, screen} from "@testing-library/react";
import {createRef} from "react";
import {describe, expect, it} from "vitest";

import {Spinner} from "./spinner";

describe("Spinner", () => {
  it("renders without crashing", () => {
    render(<Spinner />);

    expect(screen.getByRole("status", {name: "Loading"})).toBeInTheDocument();
  });

  it("forwards ref", () => {
    const ref = createRef<SVGSVGElement>();

    render(<Spinner ref={ref} />);

    expect(ref.current).toBeInstanceOf(SVGSVGElement);
  });

  it("applies custom className alongside default styles", () => {
    render(<Spinner className='custom-spinner' />);

    const spinner = screen.getByRole("status", {name: "Loading"});

    expect(spinner).toHaveClass("custom-spinner");
    expect(spinner.className.baseVal || spinner.getAttribute("class")).not.toBe("custom-spinner");
  });

  it("renders children", () => {
    render(
      <Spinner>
        <title>Loading dashboard</title>
      </Spinner>,
    );

    expect(screen.getByText("Loading dashboard")).toBeInTheDocument();
  });

  it("forwards accessibility attributes", () => {
    render(
      <Spinner
        aria-label='Saving changes'
        aria-live='polite'
      />,
    );

    const spinner = screen.getByRole("status", {name: "Saving changes"});

    expect(spinner).toHaveAttribute("aria-live", "polite");
  });
});
