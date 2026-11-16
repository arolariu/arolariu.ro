/**
 * @fileoverview Unit tests for the invoices statistics dashboard view.
 * @module app/domains/invoices/view-invoices/_components/views/StatisticsView.test
 *
 * @remarks
 * Renders the real dashboard with the real statistics utilities and chart components. Assertions focus on the
 * view's own orchestration: the empty-state branch, the header, the KPI data derived from the invoices, and the
 * presence of every analytics section. Individual chart internals are covered by their own colocated tests.
 * Only the `Date` clock is faked so month-relative statistics are deterministic.
 */

import {render, screen} from "@testing-library/react";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {buildInvoice, buildPaymentInformation, buildProduct} from "../../../../../../../tests/helpers/invoiceDomain";
import RenderStatisticsView from "./StatisticsView";

const STATS_KEY = "cards.invoices.statistics";
const NOW = new Date("2026-03-20T12:00:00.000Z");

const SECTION_TITLES = [
  "spendingOverTime",
  "categoryBreakdown",
  "merchantLeaderboard",
  "merchantTrends",
  "merchantVisit",
  "calendarHeatmap",
  "comparison",
  "currencyDistribution",
  "priceDistribution",
  "timeOfDay",
  "productClassification",
  "topProducts",
  "allergenSummary",
] as const;

const invoices = [
  buildInvoice({
    id: "11111111-1111-4111-8111-111111111111",
    name: "Weekly groceries",
    merchantReference: "merchant-lidl-0001",
    paymentInformation: buildPaymentInformation({transactionDate: new Date("2026-03-05T10:00:00.000Z"), totalCostAmount: 120}),
    items: [buildProduct({name: "Milk", price: 6, quantity: 2, totalPrice: 12})],
  }),
  buildInvoice({
    id: "22222222-2222-4222-8222-222222222222",
    name: "Pantry restock",
    merchantReference: "merchant-lidl-0001",
    paymentInformation: buildPaymentInformation({transactionDate: new Date("2026-02-14T18:30:00.000Z"), totalCostAmount: 80}),
    items: [buildProduct({name: "Bread", price: 4, totalPrice: 4})],
  }),
  buildInvoice({
    id: "33333333-3333-4333-8333-333333333333",
    name: "Lunch",
    merchantReference: "merchant-kfc-0001",
    paymentInformation: buildPaymentInformation({transactionDate: new Date("2026-03-12T13:15:00.000Z"), totalCostAmount: 45}),
    items: [buildProduct({name: "Burger", price: 45, totalPrice: 45})],
  }),
];

describe("RenderStatisticsView", () => {
  // happy-dom leaves cancelled Web Animations `finished` promises unhandled when motion elements unmount.
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  beforeEach(() => {
    vi.useFakeTimers({toFake: ["Date"]});
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the dashboard header and an upload prompt instead of analytics when there are no invoices", () => {
    // Arrange & Act
    render(<RenderStatisticsView invoices={[]} />);

    // Assert
    expect(screen.getByRole("heading", {level: 1, name: `${STATS_KEY}.title`})).toBeInTheDocument();
    expect(screen.getByText(`${STATS_KEY}.subtitle`)).toBeInTheDocument();
    expect(screen.getByRole("heading", {level: 2, name: `${STATS_KEY}.empty.title`})).toBeInTheDocument();
    expect(screen.getByText(`${STATS_KEY}.empty.subtitle`)).toBeInTheDocument();

    expect(screen.queryByText(`${STATS_KEY}.kpi.totalSpending`)).not.toBeInTheDocument();
    expect(screen.queryByText(`${STATS_KEY}.productAnalytics.title`)).not.toBeInTheDocument();
    for (const section of SECTION_TITLES) {
      expect(screen.queryByText(`${STATS_KEY}.${section}.title`)).not.toBeInTheDocument();
    }
  });

  it("summarizes the provided invoices in the KPI row without showing the empty state", () => {
    // Arrange & Act
    render(<RenderStatisticsView invoices={invoices} />);

    // Assert
    expect(screen.getByRole("heading", {level: 1, name: `${STATS_KEY}.title`})).toBeInTheDocument();
    expect(screen.getByText(`${STATS_KEY}.kpi.totalSpending`)).toBeInTheDocument();
    expect(screen.getByText("3 invoices")).toBeInTheDocument();
    // The most frequent merchant (two visits) is summarized by its truncated reference.
    expect(screen.getByText("merchant-lid")).toBeInTheDocument();
    expect(screen.queryByText(`${STATS_KEY}.kpi.noneYet`)).not.toBeInTheDocument();
    expect(screen.queryByText(`${STATS_KEY}.empty.title`)).not.toBeInTheDocument();
  });

  it("renders every analytics section, including the product analytics heading", () => {
    // Arrange & Act
    render(<RenderStatisticsView invoices={invoices} />);

    // Assert
    for (const section of SECTION_TITLES) {
      expect(screen.getAllByText(`${STATS_KEY}.${section}.title`).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("heading", {level: 2, name: `${STATS_KEY}.productAnalytics.title`})).toBeInTheDocument();
    expect(screen.getByText(`${STATS_KEY}.productAnalytics.subtitle`)).toBeInTheDocument();
  });

  it("switches to the empty state when the invoice list is cleared after rendering analytics", () => {
    // Arrange
    const {rerender} = render(<RenderStatisticsView invoices={invoices} />);
    expect(screen.getByText("3 invoices")).toBeInTheDocument();

    // Act
    rerender(<RenderStatisticsView invoices={[]} />);

    // Assert
    expect(screen.getByText(`${STATS_KEY}.empty.title`)).toBeInTheDocument();
    expect(screen.queryByText("3 invoices")).not.toBeInTheDocument();
    expect(screen.queryByText(`${STATS_KEY}.productAnalytics.title`)).not.toBeInTheDocument();
  });
});
