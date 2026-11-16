/**
 * @fileoverview Unit tests for the PriceDistributionChart bar chart and its custom tooltip.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/PriceDistributionChart.test
 */

import {render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {hoverChart, installChartLayout} from "../../../../../../../../tests/helpers";
import type {PriceBucket} from "../../../_utils/statistics";
import {PriceDistributionChart} from "./PriceDistributionChart";

const TOOLTIP_COUNT_KEY = "cards.invoices.statistics.priceDistribution.tooltip.itemCount";

function makeBucket(range: string, min: number, max: number, count: number): PriceBucket {
  return {range, min, max, count, totalAmount: count * max};
}

const buckets: PriceBucket[] = [
  makeBucket("0-10", 0, 10, 14),
  makeBucket("10-25", 10, 25, 9),
  makeBucket("25-50", 25, 50, 6),
  makeBucket("50-100", 50, 100, 3),
  makeBucket("100-250", 100, 250, 2),
  makeBucket("250+", 250, 1000, 1),
];

/**
 * Reports `prefers-reduced-motion: reduce` so Recharts skips its entry animation and renders
 * every bar at its final geometry immediately.
 */
function preferReducedMotion(): void {
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(() => false),
      }) satisfies MediaQueryList,
  );
}

describe("PriceDistributionChart", () => {
  beforeEach(() => {
    installChartLayout();
  });

  it("renders the translated card title and description", () => {
    render(
      <PriceDistributionChart
        data={buckets}
        currency='RON'
      />,
    );

    expect(screen.getByText("cards.invoices.statistics.priceDistribution.title")).toBeInTheDocument();
    expect(screen.getByText("cards.invoices.statistics.priceDistribution.description")).toBeInTheDocument();
  });

  it("renders one bar per bucket with palette colours that wrap after five buckets", () => {
    preferReducedMotion();
    const {container} = render(
      <PriceDistributionChart
        data={buckets}
        currency='RON'
      />,
    );

    const fills = [...container.querySelectorAll(".recharts-bar-rectangle path")].map((bar) => bar.getAttribute("fill"));
    expect(fills).toEqual([
      "var(--ac-chart-1)",
      "var(--ac-chart-2)",
      "var(--ac-chart-3)",
      "var(--ac-chart-4)",
      "var(--ac-chart-5)",
      "var(--ac-chart-1)",
    ]);
  });

  it("labels the x-axis with bucket ranges", () => {
    const {container} = render(
      <PriceDistributionChart
        data={buckets}
        currency='RON'
      />,
    );

    const ticks = [...container.querySelectorAll(".recharts-xAxis-tick-labels .recharts-cartesian-axis-tick-value")].map(
      (tick) => tick.textContent,
    );
    expect(ticks.length).toBeGreaterThan(0);
    expect(buckets.map(({range}) => range)).toEqual(expect.arrayContaining(ticks));
  });

  it("does not render tooltip content before the pointer enters the chart", () => {
    render(
      <PriceDistributionChart
        data={buckets}
        currency='RON'
      />,
    );

    expect(screen.queryByText(TOOLTIP_COUNT_KEY)).not.toBeInTheDocument();
    expect(screen.queryByText(/ RON$/u)).not.toBeInTheDocument();
  });

  it("shows the hovered bucket range with the currency and the item count in the tooltip", async () => {
    const {container} = render(
      <PriceDistributionChart
        data={buckets}
        currency='EUR'
      />,
    );

    await hoverChart(container, {x: 40, y: 133});

    expect(screen.getByText("0-10 EUR")).toBeInTheDocument();
    expect(screen.getByText(TOOLTIP_COUNT_KEY)).toBeInTheDocument();
    expect(screen.queryByText("250+ EUR")).not.toBeInTheDocument();
  });

  it("updates the tooltip to the bucket under the pointer", async () => {
    const {container} = render(
      <PriceDistributionChart
        data={buckets}
        currency='EUR'
      />,
    );

    await hoverChart(container, {x: 580, y: 133});

    expect(screen.getByText("250+ EUR")).toBeInTheDocument();
    expect(screen.queryByText("0-10 EUR")).not.toBeInTheDocument();
  });
});
