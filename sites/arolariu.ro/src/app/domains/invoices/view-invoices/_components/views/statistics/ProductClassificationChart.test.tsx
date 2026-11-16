/**
 * @fileoverview Unit tests for the ProductClassificationChart horizontal bar chart and its custom tooltip.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/ProductClassificationChart.test
 */

import {render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {hoverChart, installChartLayout} from "../../../../../../../../tests/helpers";
import type {ProductClassificationSpending} from "../../../_utils/statistics";
import {ProductClassificationChart} from "./ProductClassificationChart";

const TITLE_KEY = "cards.invoices.statistics.productClassification.title";
const DESCRIPTION_KEY = "cards.invoices.statistics.productClassification.description";
const EMPTY_KEY = "cards.invoices.statistics.productClassification.empty";
const TOOLTIP_COUNT_KEY = "cards.invoices.statistics.productClassification.tooltip.productCount";

const spending: ProductClassificationSpending[] = [
  {category: "Food", totalSpent: 1234.5, productCount: 18, percentage: 61.234},
  {category: "Household", totalSpent: 500, productCount: 6, percentage: 24.8},
  {category: "Personal care", totalSpent: 280.25, productCount: 4, percentage: 13.966},
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

function getTooltip(): HTMLElement {
  const tooltip = screen.getByText(TOOLTIP_COUNT_KEY).parentElement;
  if (tooltip === null) throw new Error("Tooltip content did not render.");
  return tooltip;
}

describe("ProductClassificationChart", () => {
  beforeEach(() => {
    installChartLayout();
  });

  it("renders the empty state without a chart when there is no spending", () => {
    const {container} = render(
      <ProductClassificationChart
        data={[]}
        currency='RON'
      />,
    );

    expect(screen.getByText(TITLE_KEY)).toBeInTheDocument();
    expect(screen.getByText(DESCRIPTION_KEY)).toBeInTheDocument();
    expect(screen.getByText(EMPTY_KEY)).toBeInTheDocument();
    expect(container.querySelector(".recharts-wrapper")).toBeNull();
  });

  it("renders one coloured bar per classification group instead of the empty state", () => {
    preferReducedMotion();
    const sixGroups: ProductClassificationSpending[] = [
      ...spending,
      {category: "Electronics", totalSpent: 90, productCount: 1, percentage: 3},
      {category: "Clothing", totalSpent: 60, productCount: 1, percentage: 2},
      {category: "Garden", totalSpent: 30, productCount: 1, percentage: 1},
    ];

    const {container} = render(
      <ProductClassificationChart
        data={sixGroups}
        currency='RON'
      />,
    );

    expect(screen.getByText(TITLE_KEY)).toBeInTheDocument();
    expect(screen.queryByText(EMPTY_KEY)).not.toBeInTheDocument();
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

  it("does not render tooltip content before the pointer enters the chart", () => {
    render(
      <ProductClassificationChart
        data={spending}
        currency='RON'
      />,
    );

    expect(screen.queryByText(TOOLTIP_COUNT_KEY)).not.toBeInTheDocument();
    expect(screen.queryByText(/%$/u)).not.toBeInTheDocument();
  });

  it("shows the hovered group's spending, share, and product count in the tooltip", async () => {
    const {container} = render(
      <ProductClassificationChart
        data={spending}
        currency='EUR'
      />,
    );

    await hoverChart(container, {x: 300, y: 40});

    const tooltip = getTooltip();
    expect(tooltip.textContent).toBe(`Food1,234.50 EUR61.2%${TOOLTIP_COUNT_KEY}`);
    expect(screen.queryByText("280.25 EUR")).not.toBeInTheDocument();
  });

  it("updates the tooltip to the group under the pointer", async () => {
    const {container} = render(
      <ProductClassificationChart
        data={spending}
        currency='EUR'
      />,
    );

    await hoverChart(container, {x: 300, y: 330});

    const tooltip = getTooltip();
    expect(tooltip.textContent).toBe(`Personal care280.25 EUR14.0%${TOOLTIP_COUNT_KEY}`);
    expect(screen.queryByText("1,234.50 EUR")).not.toBeInTheDocument();
  });
});
