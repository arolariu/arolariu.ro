/**
 * @fileoverview Unit tests for the SpendingOverTimeChart area chart, axis formatting, and invoice tooltip.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/SpendingOverTimeChart.test
 */

import {render, screen, within} from "@testing-library/react";
import {beforeEach, describe, expect, it} from "vitest";
import {hoverChart, installChartLayout} from "../../../../../../../../tests/helpers";
import type {MonthlySpending} from "../../../_utils/statistics";
import {SpendingOverTimeChart} from "./SpendingOverTimeChart";

const TOOLTIP_COUNT_KEY = "cards.invoices.statistics.spendingOverTime.tooltip.invoiceCount";
const TOOLTIP_MORE_KEY = "cards.invoices.statistics.spendingOverTime.tooltip.andMore";

/** Next.js `Link` normalizes the trailing slash, so accept the invoice route with or without it. */
const INVOICE_HREF = (id: string): RegExp => new RegExp(`^/domains/invoices/view-invoice/${id}/?$`, "u");

type InvoiceSummary = MonthlySpending["invoices"][number];

function makeInvoices(prefix: string, count: number, amount: number): InvoiceSummary[] {
  return Array.from({length: count}, (_, index) => ({id: `${prefix}-${index + 1}`, name: `${prefix} receipt ${index + 1}`, amount}));
}

const months: MonthlySpending[] = [
  {month: "Jan 2025", monthKey: "2025-01", amount: 1250.75, invoiceCount: 2, invoices: makeInvoices("jan", 2, 625.375)},
  {month: "Feb 2025", monthKey: "2025-02", amount: 2400, invoiceCount: 12, invoices: makeInvoices("feb", 12, 200)},
  {month: "Mar 2025", monthKey: "2025-03", amount: 980, invoiceCount: 0, invoices: []},
];

function getTooltip(): HTMLElement {
  const tooltip = screen.getByText(TOOLTIP_COUNT_KEY).parentElement;
  if (tooltip === null) throw new Error("Tooltip content did not render.");
  return tooltip;
}

describe("SpendingOverTimeChart", () => {
  beforeEach(() => {
    installChartLayout();
  });

  it("renders the translated card title and description", () => {
    render(
      <SpendingOverTimeChart
        data={months}
        currency='RON'
      />,
    );

    expect(screen.getByText("cards.invoices.statistics.spendingOverTime.title")).toBeInTheDocument();
    expect(screen.getByText("cards.invoices.statistics.spendingOverTime.description")).toBeInTheDocument();
  });

  it("formats y-axis ticks as whole numbers with thousands grouping", () => {
    const {container} = render(
      <SpendingOverTimeChart
        data={months}
        currency='RON'
      />,
    );

    const yTicks = [...container.querySelectorAll(".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value")].map(
      (tick) => tick.textContent,
    );
    expect(yTicks).toContain("2,400");
    expect(yTicks).not.toContain("2400");
    for (const tick of yTicks) {
      expect(tick).toMatch(/^\d{1,3}(,\d{3})*$/u);
    }
  });

  it("does not render tooltip content before the pointer enters the chart", () => {
    render(
      <SpendingOverTimeChart
        data={months}
        currency='RON'
      />,
    );

    expect(screen.queryByText(TOOLTIP_COUNT_KEY)).not.toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("lists every invoice of a small month as a link without an overflow note", async () => {
    const {container} = render(
      <SpendingOverTimeChart
        data={months}
        currency='EUR'
      />,
    );

    await hoverChart(container, {x: 30, y: 133});

    const tooltip = getTooltip();
    expect(within(tooltip).getByText("Jan 2025")).toBeInTheDocument();
    expect(within(tooltip).getByText("1,250.75 EUR")).toBeInTheDocument();
    const links = within(tooltip).getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      expect.stringMatching(INVOICE_HREF("jan-1")),
      expect.stringMatching(INVOICE_HREF("jan-2")),
    ]);
    expect(links[0]).toHaveTextContent("jan receipt 1 — 625.38 EUR");
    expect(within(tooltip).queryByText(TOOLTIP_MORE_KEY)).not.toBeInTheDocument();
  });

  it("caps the invoice list at ten links and adds an overflow note for busy months", async () => {
    const {container} = render(
      <SpendingOverTimeChart
        data={months}
        currency='EUR'
      />,
    );

    await hoverChart(container, {x: 300, y: 133});

    const tooltip = getTooltip();
    expect(within(tooltip).getByText("Feb 2025")).toBeInTheDocument();
    const links = within(tooltip).getAllByRole("link");
    expect(links).toHaveLength(10);
    expect(links.at(-1)?.getAttribute("href")).toMatch(INVOICE_HREF("feb-10"));
    expect(within(tooltip).queryByText(/feb receipt 11/u)).not.toBeInTheDocument();
    expect(within(tooltip).getByText(TOOLTIP_MORE_KEY)).toBeInTheDocument();
  });

  it("omits the invoice list for a month without invoice summaries", async () => {
    const {container} = render(
      <SpendingOverTimeChart
        data={months}
        currency='EUR'
      />,
    );

    await hoverChart(container, {x: 590, y: 133});

    const tooltip = getTooltip();
    expect(within(tooltip).getByText("Mar 2025")).toBeInTheDocument();
    expect(within(tooltip).getByText("980.00 EUR")).toBeInTheDocument();
    expect(within(tooltip).queryAllByRole("link")).toHaveLength(0);
    expect(within(tooltip).queryByRole("list")).not.toBeInTheDocument();
  });
});
