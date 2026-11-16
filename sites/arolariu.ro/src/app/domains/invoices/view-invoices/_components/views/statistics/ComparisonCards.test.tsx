/**
 * @fileoverview Unit tests for the ComparisonCards month-over-month metrics.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/ComparisonCards.test
 */

import {render, screen} from "@testing-library/react";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import type {MonthComparison} from "../../../_utils/statistics";
import {ComparisonCards} from "./ComparisonCards";

const COMPARISON_KEY = "cards.invoices.statistics.comparison";
const TREND_CLASSES = ["trendPositive", "trendNegative", "trendNeutral"] as const;

type TrendClass = (typeof TREND_CLASSES)[number];

function buildComparison(overrides: Partial<MonthComparison> = {}): MonthComparison {
  return {
    currentMonth: {month: "Mar 2026", monthKey: "2026-03", amount: 750, invoiceCount: 6, invoices: []},
    previousMonth: {month: "Feb 2026", monthKey: "2026-02", amount: 600, invoiceCount: 3, invoices: []},
    spendingDelta: 150,
    spendingDeltaPercent: 25,
    invoiceCountDelta: 3,
    newMerchantCount: 2,
    ...overrides,
  };
}

/** Matches a CSS-module class name as a whole token so the assertion holds for any naming strategy. */
function hasClassToken(element: Element, name: string): boolean {
  return new RegExp(`(^|[\\s_])${name}([\\s_]|$)`, "u").test(element.className);
}

/** Returns the trend container (icon + delta text) for the rendered delta label. */
function getTrend(delta: string): HTMLElement {
  const trend = screen.getByText(delta).parentElement;
  if (trend === null) {
    throw new Error(`No trend container rendered for ${delta}`);
  }
  return trend;
}

function expectTrendClass(delta: string, expected: TrendClass): void {
  const trend = getTrend(delta);
  expect(hasClassToken(trend, expected)).toBe(true);
  for (const other of TREND_CLASSES.filter((name) => name !== expected)) {
    expect(hasClassToken(trend, other)).toBe(false);
  }
}

function getProgressValues(): string[] {
  return screen.getAllByRole("progressbar").map((bar) => bar.getAttribute("aria-valuenow") ?? "");
}

describe("ComparisonCards", () => {
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  it("renders the section title and the three metric labels", () => {
    render(
      <ComparisonCards
        data={buildComparison()}
        currency='RON'
      />,
    );

    expect(screen.getByRole("heading", {name: `${COMPARISON_KEY}.title`})).toBeInTheDocument();
    expect(screen.getByText(`${COMPARISON_KEY}.spendingDelta`)).toBeInTheDocument();
    expect(screen.getByText(`${COMPARISON_KEY}.invoiceCount`)).toBeInTheDocument();
    expect(screen.getByText(`${COMPARISON_KEY}.newMerchants`)).toBeInTheDocument();
  });

  it("marks higher spending as negative and more invoices and new merchants as positive", () => {
    render(
      <ComparisonCards
        data={buildComparison()}
        currency='RON'
      />,
    );

    expect(screen.getByText("150.00 RON")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expectTrendClass("+25.0%", "trendNegative");
    expectTrendClass("+3", "trendPositive");
    expectTrendClass(`${COMPARISON_KEY}.discovered`, "trendPositive");
    expect(screen.queryByText(`${COMPARISON_KEY}.none`)).not.toBeInTheDocument();
    expect(getProgressValues()).toEqual(["25", "30", "40"]);
  });

  it("marks lower spending as positive, fewer invoices as negative, and no new merchants as neutral", () => {
    render(
      <ComparisonCards
        data={buildComparison({spendingDelta: -80, spendingDeltaPercent: -40, invoiceCountDelta: -2, newMerchantCount: 0})}
        currency='EUR'
      />,
    );

    expect(screen.getByText("80.00 EUR")).toBeInTheDocument();
    expect(screen.queryByText("-80.00 EUR")).not.toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
    expectTrendClass("-40.0%", "trendPositive");
    expectTrendClass("-2", "trendNegative");
    expectTrendClass(`${COMPARISON_KEY}.none`, "trendNeutral");
    expect(screen.queryByText(`${COMPARISON_KEY}.discovered`)).not.toBeInTheDocument();
    expect(getProgressValues()).toEqual(["40", "20", "0"]);
  });

  it("treats an unchanged month as flat spending and a non-negative invoice delta", () => {
    render(
      <ComparisonCards
        data={buildComparison({spendingDelta: 0, spendingDeltaPercent: 0, invoiceCountDelta: 0, newMerchantCount: 0})}
        currency='RON'
      />,
    );

    expect(screen.getByText("0.00 RON")).toBeInTheDocument();
    expectTrendClass("+0.0%", "trendNegative");
    expectTrendClass("+0", "trendPositive");
    expect(getProgressValues()).toEqual(["0", "0", "0"]);
  });

  it("caps every progress bar at 100 for large changes", () => {
    render(
      <ComparisonCards
        data={buildComparison({spendingDelta: 900, spendingDeltaPercent: 250, invoiceCountDelta: -15, newMerchantCount: 7})}
        currency='RON'
      />,
    );

    expect(screen.getByText("+250.0%")).toBeInTheDocument();
    expect(screen.getByText("-15")).toBeInTheDocument();
    expect(getProgressValues()).toEqual(["100", "100", "100"]);
  });
});
