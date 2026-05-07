import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {Donut} from "./Donut";

describe("Donut", () => {
  it("renders a slice per item", () => {
    render(<Donut slices={[{label: "Grocery", value: 100, color: "#3b82f6"}, {label: "Fast food", value: 50, color: "#10b981"}]} />);
    expect(screen.getByText("Grocery")).toBeInTheDocument();
    expect(screen.getByText("Fast food")).toBeInTheDocument();
    expect(screen.getByTestId("viz-donut")).toBeInTheDocument();
  });
});