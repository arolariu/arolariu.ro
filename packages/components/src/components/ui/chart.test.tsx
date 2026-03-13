import {render, screen} from "@testing-library/react";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

vi.mock("recharts", async (importActual) => {
  const actual = await importActual<typeof import("recharts")>();

  return {
    ...actual,
    Line: (): React.JSX.Element => <path data-testid='chart-line' />,
    LineChart: ({children}: Readonly<{children?: React.ReactNode}>): React.JSX.Element => <svg data-testid='line-chart'>{children}</svg>,
    ResponsiveContainer: ({children}: Readonly<{children?: React.ReactNode}>): React.JSX.Element => (
      <div data-testid='responsive-container'>{children}</div>
    ),
  };
});

import {Line, LineChart} from "recharts";

import {ChartContainer, type ChartConfig} from "./chart";

const config: ChartConfig = {
  revenue: {
    color: "#123456",
    label: "Revenue",
  },
};

describe("ChartContainer", () => {
  function renderChart(className?: string): ReturnType<typeof render> {
    return render(
      <ChartContainer
        className={className}
        config={config}
        style={{height: 300, width: 400}}>
        <LineChart data={[{name: "Jan", revenue: 42}]}>
          <Line
            dataKey='revenue'
            stroke='var(--color-revenue)'
            type='monotone'
          />
        </LineChart>
      </ChartContainer>,
    );
  }

  it("renders without crashing", () => {
    // Arrange
    renderChart();

    // Assert
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
  });

  it("renders chart content with config styles", () => {
    // Arrange
    const {container} = renderChart();

    // Assert
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
    expect(container.querySelector("style")?.textContent).toContain("--color-revenue: #123456;");
  });

  it("merges the root className", () => {
    // Arrange
    const {container} = renderChart("custom-chart");

    // Assert
    expect(container.querySelector("[data-slot='chart']")).toHaveClass("custom-chart");
  });

  it("renders children inside the responsive container", () => {
    // Arrange
    const {container} = renderChart();

    // Assert
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("chart-line")).toBeInTheDocument();
  });
});
