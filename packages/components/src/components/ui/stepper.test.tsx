import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";

import {Stepper} from "./stepper";

describe("Stepper", () => {
  it("renders all step labels", () => {
    render(<Stepper steps={["One", "Two", "Three"]} activeStep={0} />);

    expect(screen.getByText("One")).toBeInTheDocument();
    expect(screen.getByText("Two")).toBeInTheDocument();
    expect(screen.getByText("Three")).toBeInTheDocument();
  });

  it("marks active step correctly", () => {
    render(<Stepper steps={["One", "Two"]} activeStep={1} />);

    const items = screen.getAllByRole("listitem");

    expect(items[0]).toHaveAttribute("data-state", "completed");
    expect(items[1]).toHaveAttribute("data-state", "active");
  });

  it("forwards ref", () => {
    const ref = {current: null as HTMLDivElement | null};

    render(<Stepper ref={ref} steps={["One"]} activeStep={0} />);

    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
