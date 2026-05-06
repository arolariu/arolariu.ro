import {render, screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import {BarChartHorizontal} from "./BarChartHorizontal";

describe("BarChartHorizontal", () => {
  it("renders one bar per item with correct labels", () => {
    render(<BarChartHorizontal bars={[{label: "Lidl", value: 5}, {label: "Mega", value: 3}]} />);
    expect(screen.getByText("Lidl")).toBeInTheDocument();
    expect(screen.getByText("Mega")).toBeInTheDocument();
    expect(screen.getByTestId("viz-bar-chart-horizontal")).toBeInTheDocument();
  });
});