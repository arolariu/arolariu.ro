import {render} from "@testing-library/react";
import * as React from "react";
import {describe, expect, it, vi} from "vitest";

vi.mock("recharts", async (importActual) => {
  const actual = await importActual<typeof import("recharts")>();

  return {
    ...actual,
    ResponsiveContainer: ({children}: Readonly<{children?: React.ReactNode}>): React.JSX.Element => (
      <div data-testid='responsive-container'>{children}</div>
    ),
  };
});

import {ChartContainer, ChartTooltipContent, type ChartConfig} from "./chart";

const config: ChartConfig = {
  revenue: {
    color: "#123456",
    label: "Revenue",
  },
};

describe("ChartTooltipContent", () => {
  it("uses prefixed chart indicator CSS variables", () => {
    // Arrange
    const {container} = render(
      <ChartContainer config={config}>
        <ChartTooltipContent
          active
          payload={[
            {
              color: "#111111",
              dataKey: "revenue",
              name: "revenue",
              payload: {fill: "#abcdef"},
              value: 42,
            },
          ]}
        />
      </ChartContainer>,
    );

    // Act
    const indicator = container.querySelector("[style*='--ac-chart-indicator-background']");

    // Assert
    expect(indicator).not.toBeNull();
    expect(indicator?.getAttribute("style")).toContain("--ac-chart-indicator-background: #abcdef;");
    expect(indicator?.getAttribute("style")).toContain("--ac-chart-indicator-border: #abcdef;");
    expect(indicator?.getAttribute("style")).not.toContain("--chart-indicator-background");
    expect(indicator?.getAttribute("style")).not.toContain("--chart-indicator-border");
  });
});
