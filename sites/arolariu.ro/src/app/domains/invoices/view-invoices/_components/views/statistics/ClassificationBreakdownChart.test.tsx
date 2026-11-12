/**
 * @fileoverview Unit tests for the ClassificationBreakdownChart donut chart, legend, total, and tooltip.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/ClassificationBreakdownChart.test
 */

import {fireEvent, render, screen} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, installChartLayout} from "../../../../../../../../tests/helpers";
import type {ClassificationGroupAggregate} from "../../../_utils/statistics";
import {ClassificationBreakdownChart} from "./ClassificationBreakdownChart";

const TOTAL_LABEL_KEY = "cards.invoices.statistics.categoryBreakdown.totalLabel";
const TOOLTIP_COUNT_KEY = "cards.invoices.statistics.categoryBreakdown.tooltip.invoiceCount";

const groups: ClassificationGroupAggregate[] = [
  {category: "Food", amount: 600, count: 9, percentage: 48.6},
  {category: "Transport", amount: 300.5, count: 4, percentage: 24.34},
  {category: "Housing", amount: 150, count: 2, percentage: 12.15},
  {category: "Health", amount: 100, count: 2, percentage: 8.1},
  {category: "Leisure", amount: 50, count: 1, percentage: 4.05},
  {category: "Education", amount: 34, count: 1, percentage: 2.76},
];

/**
 * Reports `prefers-reduced-motion: reduce` so Recharts skips its entry animation and renders
 * every pie sector at its final geometry immediately.
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

async function hoverSector(container: HTMLElement, index: number): Promise<void> {
  const sector = container.querySelectorAll(".recharts-pie-sector")[index];
  if (sector === undefined) throw new Error(`Pie sector ${index} did not render.`);
  fireEvent.mouseEnter(sector);
  await act(async () => {
    await new Promise((resolve) => {
      setTimeout(resolve, 50);
    });
  });
}

function getLegendLabel(category: string): HTMLElement {
  const label = screen.getAllByText(category).find((element) => element.previousElementSibling !== null);
  if (label === undefined) throw new Error(`Legend entry "${category}" did not render.`);
  return label;
}

function getTooltip(): HTMLElement {
  const tooltip = screen.getByText(TOOLTIP_COUNT_KEY).parentElement;
  if (tooltip === null) throw new Error("Tooltip content did not render.");
  return tooltip;
}

describe("ClassificationBreakdownChart", () => {
  beforeEach(() => {
    installChartLayout();
    preferReducedMotion();
  });

  it("renders the translated title, description, and total label", () => {
    render(
      <ClassificationBreakdownChart
        data={groups}
        currency='RON'
      />,
    );

    expect(screen.getByText("cards.invoices.statistics.categoryBreakdown.title")).toBeInTheDocument();
    expect(screen.getByText("cards.invoices.statistics.categoryBreakdown.description")).toBeInTheDocument();
    expect(screen.getByText(TOTAL_LABEL_KEY)).toBeInTheDocument();
  });

  it("sums every group amount into the formatted total", () => {
    render(
      <ClassificationBreakdownChart
        data={groups}
        currency='EUR'
      />,
    );

    expect(screen.getByText("1,234.50 EUR")).toBeInTheDocument();
  });

  it("renders a zero total when there are no groups", () => {
    render(
      <ClassificationBreakdownChart
        data={[]}
        currency='RON'
      />,
    );

    expect(screen.getByText("0.00 RON")).toBeInTheDocument();
    expect(screen.queryByText("Food")).not.toBeInTheDocument();
  });

  it("renders a legend entry per group with palette colours that wrap after five groups", () => {
    render(
      <ClassificationBreakdownChart
        data={groups}
        currency='RON'
      />,
    );

    const dotColour = (category: string): string | undefined =>
      (getLegendLabel(category).previousElementSibling as HTMLElement | null)?.style.backgroundColor;

    expect(dotColour("Food")).toBe("var(--ac-chart-1)");
    expect(dotColour("Transport")).toBe("var(--ac-chart-2)");
    expect(dotColour("Leisure")).toBe("var(--ac-chart-5)");
    expect(dotColour("Education")).toBe("var(--ac-chart-1)");
  });

  it("does not render tooltip content before a sector is hovered", () => {
    render(
      <ClassificationBreakdownChart
        data={groups}
        currency='RON'
      />,
    );

    expect(screen.queryByText(TOOLTIP_COUNT_KEY)).not.toBeInTheDocument();
    expect(screen.queryByText(/%$/u)).not.toBeInTheDocument();
  });

  it("shows the hovered group's amount, share, and invoice count in the tooltip", async () => {
    const {container} = render(
      <ClassificationBreakdownChart
        data={groups}
        currency='EUR'
      />,
    );

    await hoverSector(container, 1);

    expect(getTooltip().textContent).toBe(`Transport300.50 EUR24.3%${TOOLTIP_COUNT_KEY}`);
    expect(screen.queryByText("600.00 EUR")).not.toBeInTheDocument();
  });

  it("updates the tooltip to the sector under the pointer", async () => {
    const {container} = render(
      <ClassificationBreakdownChart
        data={groups}
        currency='EUR'
      />,
    );

    await hoverSector(container, 5);

    expect(getTooltip().textContent).toBe(`Education34.00 EUR2.8%${TOOLTIP_COUNT_KEY}`);
    expect(screen.queryByText("300.50 EUR")).not.toBeInTheDocument();
  });
});
