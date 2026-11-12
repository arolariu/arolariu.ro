/**
 * @fileoverview Unit tests for the MerchantTrendsChart sparkline table.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/MerchantTrendsChart.test
 *
 * @remarks
 * Merchant display names come from the real IndexedDB-persisted merchants store (backed by `fake-indexeddb`),
 * seeded per test after its persisted state has rehydrated.
 */

import {useMerchantsStore} from "@/stores/merchantsStore";
import type {Merchant} from "@/types/invoices";
import {act, render, screen, within} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {buildMerchant} from "../../../../../../../../tests/helpers/invoiceDomain";
import type {MerchantTrend} from "../../../_utils/statistics";
import {MerchantTrendsChart} from "./MerchantTrendsChart";

const TRENDS_KEY = "cards.invoices.statistics.merchantTrends";
const KNOWN_MERCHANT_ID = "merchant-known";
const LONG_MERCHANT_ID = "merchant-with-a-very-long-identifier";
const SHORT_MERCHANT_ID = "corner-shop";

function buildTrend(merchantId: string, monthlyData: MerchantTrend["monthlyData"]): MerchantTrend {
  return {
    merchantId,
    monthlyData,
    totalSpend: monthlyData.reduce((sum, month) => sum + month.amount, 0),
  };
}

function seedMerchants(entities: ReadonlyArray<Merchant>): void {
  act(() => {
    useMerchantsStore.setState({entities, selectedEntities: [], hasHydrated: true});
  });
}

/** Returns the table row that renders the given merchant display name. */
function getRow(merchantName: string): HTMLElement {
  const row = screen.getByText(merchantName).closest("tr");
  if (row === null) {
    throw new Error(`No table row rendered for ${merchantName}`);
  }
  return row;
}

/** Returns the total-spend cell (last column) of a merchant row. */
function getTotalCell(row: HTMLElement): HTMLElement | undefined {
  return within(row).getAllByRole("cell").at(-1);
}

/** Returns the visible month axis labels of a row, excluding the per-bar tooltip copies. */
function getMonthAxisLabels(row: HTMLElement): Array<string | null> {
  return within(row)
    .getAllByText(/^[A-Z][a-z]{2} '\d{2}$/u)
    .filter((element) => element.closest("[role='tooltip']") === null)
    .map((element) => element.textContent);
}

/** Returns the bar container labelled with the given month and amount. */
function getBarFill(row: HTMLElement, label: string): HTMLElement {
  const bar = within(row).getByLabelText(label);
  const fill = bar.firstElementChild;
  if (!(fill instanceof HTMLElement)) {
    throw new Error(`No bar fill rendered for ${label}`);
  }
  return fill;
}

describe("MerchantTrendsChart", () => {
  beforeEach(async () => {
    await act(async () => {
      await useMerchantsStore.persist.rehydrate();
    });
    seedMerchants([buildMerchant({id: KNOWN_MERCHANT_ID, name: "Mega Image"})]);
  });

  afterEach(() => {
    seedMerchants([]);
  });

  it("renders the empty state without a table when there is no trend data", () => {
    render(
      <MerchantTrendsChart
        data={[]}
        currency='RON'
      />,
    );

    expect(screen.getByText(`${TRENDS_KEY}.title`)).toBeInTheDocument();
    expect(screen.getByText(`${TRENDS_KEY}.description`)).toBeInTheDocument();
    expect(screen.getByText(`${TRENDS_KEY}.empty`)).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("renders the table headers and one row per merchant with its total spend", () => {
    render(
      <MerchantTrendsChart
        data={[
          buildTrend(KNOWN_MERCHANT_ID, [{monthKey: "2026-01", amount: 120}]),
          buildTrend(SHORT_MERCHANT_ID, [{monthKey: "2026-01", amount: 30}]),
        ]}
        currency='RON'
      />,
    );

    expect(screen.getByRole("columnheader", {name: `${TRENDS_KEY}.labels.merchant`})).toBeInTheDocument();
    expect(screen.getByRole("columnheader", {name: `${TRENDS_KEY}.labels.trend`})).toBeInTheDocument();
    expect(screen.getByRole("columnheader", {name: `${TRENDS_KEY}.labels.totalSpend`})).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3);
    expect(getTotalCell(getRow("Mega Image"))).toHaveTextContent("120.00 RON");
    expect(getTotalCell(getRow(SHORT_MERCHANT_ID))).toHaveTextContent("30.00 RON");
  });

  it("resolves merchant names from the store and falls back to the (truncated) merchant id", () => {
    render(
      <MerchantTrendsChart
        data={[
          buildTrend(KNOWN_MERCHANT_ID, [{monthKey: "2026-01", amount: 10}]),
          buildTrend(LONG_MERCHANT_ID, [{monthKey: "2026-01", amount: 20}]),
          buildTrend(SHORT_MERCHANT_ID, [{monthKey: "2026-01", amount: 30}]),
        ]}
        currency='RON'
      />,
    );

    expect(screen.getByText("Mega Image")).toBeInTheDocument();
    expect(screen.queryByText(KNOWN_MERCHANT_ID)).not.toBeInTheDocument();
    expect(screen.getByText("merchant-with-a-v...")).toBeInTheDocument();
    expect(screen.queryByText(LONG_MERCHANT_ID)).not.toBeInTheDocument();
    expect(screen.getByText(SHORT_MERCHANT_ID)).toBeInTheDocument();
    expect(screen.getAllByLabelText(`${TRENDS_KEY}.aria.sparkline`)).toHaveLength(3);
  });

  it("shows only the six most recent months across all merchants in chronological order", () => {
    const months = ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01", "2026-02", "2026-03"];
    render(
      <MerchantTrendsChart
        data={[
          buildTrend(
            KNOWN_MERCHANT_ID,
            months.slice(0, 5).map((monthKey) => ({monthKey, amount: 10})),
          ),
          buildTrend(
            SHORT_MERCHANT_ID,
            months
              .slice(3)
              .toReversed()
              .map((monthKey) => ({monthKey, amount: 20})),
          ),
        ]}
        currency='RON'
      />,
    );

    const expectedLabels = ["Oct '25", "Nov '25", "Dec '25", "Jan '26", "Feb '26", "Mar '26"];
    expect(getMonthAxisLabels(getRow("Mega Image"))).toEqual(expectedLabels);
    expect(getMonthAxisLabels(getRow(SHORT_MERCHANT_ID))).toEqual(expectedLabels);
    expect(screen.queryByText("Aug '25")).not.toBeInTheDocument();
    expect(screen.queryByText("Sep '25")).not.toBeInTheDocument();
  });

  it("scales bar heights to the largest monthly amount and renders missing months as empty bars", () => {
    render(
      <MerchantTrendsChart
        data={[
          buildTrend(KNOWN_MERCHANT_ID, [
            {monthKey: "2026-01", amount: 200},
            {monthKey: "2026-02", amount: 50},
          ]),
          buildTrend(SHORT_MERCHANT_ID, [{monthKey: "2026-02", amount: 100}]),
        ]}
        currency='USD'
      />,
    );

    const knownRow = getRow("Mega Image");
    const shortRow = getRow(SHORT_MERCHANT_ID);
    expect(getBarFill(knownRow, "Jan '26: 200.00 USD")).toHaveStyle({height: "100%"});
    expect(getBarFill(knownRow, "Feb '26: 50.00 USD")).toHaveStyle({height: "25%"});
    expect(getBarFill(shortRow, "Jan '26: 0.00 USD")).toHaveStyle({height: "0%"});
    expect(getBarFill(shortRow, "Feb '26: 100.00 USD")).toHaveStyle({height: "50%"});
  });

  it("renders a month tooltip with the formatted month and amount for every bar", () => {
    render(
      <MerchantTrendsChart
        data={[
          buildTrend(KNOWN_MERCHANT_ID, [
            {monthKey: "2026-01", amount: 200},
            {monthKey: "2026-02", amount: 50},
          ]),
        ]}
        currency='RON'
      />,
    );

    const tooltips = screen.getAllByRole("tooltip");
    expect(tooltips).toHaveLength(2);
    expect(tooltips[0]).toHaveTextContent("Jan '26200.00 RON");
    expect(tooltips[1]).toHaveTextContent("Feb '2650.00 RON");
  });

  it("keeps every bar flat when all monthly amounts are zero", () => {
    render(
      <MerchantTrendsChart
        data={[
          buildTrend(SHORT_MERCHANT_ID, [
            {monthKey: "2026-01", amount: 0},
            {monthKey: "2026-02", amount: 0},
          ]),
        ]}
        currency='RON'
      />,
    );

    const row = getRow(SHORT_MERCHANT_ID);
    expect(getBarFill(row, "Jan '26: 0.00 RON")).toHaveStyle({height: "0%"});
    expect(getBarFill(row, "Feb '26: 0.00 RON")).toHaveStyle({height: "0%"});
    expect(getTotalCell(row)).toHaveTextContent("0.00 RON");
  });
});
