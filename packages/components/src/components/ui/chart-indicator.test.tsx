import {render, screen} from "@testing-library/react";
import type {TooltipContentProps} from "recharts";
import {afterEach, describe, expect, it, vi} from "vitest";

import {ChartContainer, ChartTooltipContent, type ChartConfig} from "./chart";

afterEach(() => vi.restoreAllMocks());

const config: ChartConfig = {
  revenue: {
    color: "#123456",
    label: "Revenue",
  },
};

describe("ChartTooltipContent", () => {
  it("uses prefixed chart indicator CSS variables", () => {
    // Arrange
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 320, 200));
    const tooltipProps = {
      active: true,
      activeIndex: "0",
      accessibilityLayer: true,
      coordinate: {x: 10, y: 20},
      payload: [
        {
          graphicalItemId: "revenue",
          color: "#111111",
          dataKey: "revenue",
          name: "revenue",
          payload: {fill: "#abcdef"},
          value: 42,
        },
      ],
    } satisfies TooltipContentProps;
    const {container} = render(
      <ChartContainer config={config}>
        <ChartTooltipContent {...tooltipProps} />
      </ChartContainer>,
    );

    // Act
    const indicator = container.querySelector("[style*='--ac-chart-indicator-background']");

    // Assert
    if (!(indicator instanceof HTMLElement)) throw new Error("The real chart tooltip indicator was not rendered");
    expect(screen.getByRole("status")).toHaveTextContent("Revenue");
    expect(screen.getByRole("status")).toHaveTextContent("42");
    expect(indicator.getAttribute("style")).toContain("--ac-chart-indicator-background: #abcdef;");
    expect(indicator.getAttribute("style")).toContain("--ac-chart-indicator-border: #abcdef;");
    expect(indicator.getAttribute("style")).not.toContain("--chart-indicator-background");
    expect(indicator.getAttribute("style")).not.toContain("--chart-indicator-border");
  });
});
