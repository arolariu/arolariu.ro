/**
 * @fileoverview Unit tests for the MerchantLeaderboard horizontal bar chart and its custom tooltip.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/MerchantLeaderboard.test
 *
 * @remarks
 * Merchant display names come from the `merchantNamesById` prop or the real IndexedDB-persisted merchants
 * store (backed by `fake-indexeddb`), seeded per test after its persisted state has rehydrated. Recharts
 * renders through the shared `installChartLayout()` measurement shim.
 */

import {useMerchantsStore} from "@/stores/merchantsStore";
import type {Merchant} from "@/types/invoices";
import {act, render, screen} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {hoverChart, installChartLayout} from "../../../../../../../../tests/helpers";
import {buildMerchant} from "../../../../../../../../tests/helpers/invoiceDomain";
import type {MerchantAggregate} from "../../../_utils/statistics";
import {MerchantLeaderboard} from "./MerchantLeaderboard";

const LEADERBOARD_KEY = "cards.invoices.statistics.merchantLeaderboard";
const TOOLTIP_COUNT_KEY = `${LEADERBOARD_KEY}.tooltip.invoiceCount`;
const UNKNOWN_MERCHANT_KEY = `${LEADERBOARD_KEY}.unknownMerchant`;

function buildAggregate(merchantId: string, totalSpend: number, invoiceCount = 1): MerchantAggregate {
  return {merchantId, totalSpend, invoiceCount, averageSpend: totalSpend / invoiceCount};
}

function seedMerchants(entities: ReadonlyArray<Merchant>): void {
  act(() => {
    useMerchantsStore.setState({entities, selectedEntities: [], hasHydrated: true});
  });
}

/** Returns the rendered category-axis tick labels (top to bottom). */
function getAxisLabels(container: HTMLElement): Array<string | null> {
  return Array.from(
    container.querySelectorAll(".recharts-yAxis-tick-labels .recharts-cartesian-axis-tick-value"),
    (tick) => tick.textContent,
  );
}

describe("MerchantLeaderboard", () => {
  beforeEach(async () => {
    installChartLayout();
    await act(async () => {
      await useMerchantsStore.persist.rehydrate();
    });
    seedMerchants([
      buildMerchant({id: "store-merchant", name: "Kaufland"}),
      buildMerchant({id: "long-merchant", name: "HypermarketExtraordinaireRomania"}),
    ]);
  });

  afterEach(() => {
    seedMerchants([]);
  });

  it("renders the empty state without a chart when there is no merchant data", () => {
    const {container} = render(
      <MerchantLeaderboard
        data={[]}
        currency='RON'
      />,
    );

    expect(screen.getByText(`${LEADERBOARD_KEY}.title`)).toBeInTheDocument();
    expect(screen.getByText(`${LEADERBOARD_KEY}.description`)).toBeInTheDocument();
    expect(screen.getByText(`${LEADERBOARD_KEY}.empty`)).toBeInTheDocument();
    expect(container.querySelector(".recharts-wrapper")).toBeNull();
  });

  it("resolves names from the override map, then the store, then the unknown-merchant fallback without truncating a 20-character name", () => {
    const {container} = render(
      <MerchantLeaderboard
        data={[buildAggregate("store-merchant", 300), buildAggregate("story-merchant", 200), buildAggregate("missing-merchant", 100)]}
        currency='RON'
        merchantNamesById={{"story-merchant": "LidlDiscountMarket20", "store-merchant": ""}}
      />,
    );

    expect(screen.getByText(`${LEADERBOARD_KEY}.title`)).toBeInTheDocument();
    expect(screen.queryByText(`${LEADERBOARD_KEY}.empty`)).not.toBeInTheDocument();
    expect(getAxisLabels(container)).toEqual(["Kaufland", "LidlDiscountMarket20", "cards.invoices.st..."]);
  });

  it("sorts merchants by spend, truncates long names, and caps the chart at ten bars", () => {
    const ranked = Array.from({length: 12}, (_, index) => buildAggregate(`merchant-${index}`, (index + 1) * 10));
    const names = Object.fromEntries(ranked.map(({merchantId}) => [merchantId, merchantId.toUpperCase()]));
    const data = [...ranked, buildAggregate("long-merchant", 1000)];

    const {container} = render(
      <MerchantLeaderboard
        data={data}
        currency='RON'
        merchantNamesById={names}
      />,
    );

    expect(getAxisLabels(container)).toEqual([
      "HypermarketExtrao...",
      "MERCHANT-11",
      "MERCHANT-10",
      "MERCHANT-9",
      "MERCHANT-8",
      "MERCHANT-7",
      "MERCHANT-6",
      "MERCHANT-5",
      "MERCHANT-4",
      "MERCHANT-3",
    ]);
    expect(screen.queryByText("MERCHANT-2")).not.toBeInTheDocument();
    expect(screen.queryByText("MERCHANT-0")).not.toBeInTheDocument();
  });

  it("does not render tooltip content before the pointer enters the chart", () => {
    render(
      <MerchantLeaderboard
        data={[buildAggregate("store-merchant", 300, 4)]}
        currency='RON'
      />,
    );

    expect(screen.queryByText(TOOLTIP_COUNT_KEY)).not.toBeInTheDocument();
  });

  it("shows the hovered merchant's full name, spend, and invoice count in the tooltip", async () => {
    const {container} = render(
      <MerchantLeaderboard
        data={[buildAggregate("long-merchant", 450.5, 3)]}
        currency='EUR'
      />,
    );

    await hoverChart(container);

    expect(screen.getByText(TOOLTIP_COUNT_KEY)).toBeInTheDocument();
    expect(screen.getByText("HypermarketExtraordinaireRomania")).toBeInTheDocument();
    expect(screen.getByText("450.50 EUR")).toBeInTheDocument();
  });

  it("shows the unknown-merchant fallback in the tooltip for an unresolved merchant", async () => {
    const {container} = render(
      <MerchantLeaderboard
        data={[buildAggregate("missing-merchant", 99, 1)]}
        currency='RON'
      />,
    );

    await hoverChart(container);

    expect(screen.getByText(UNKNOWN_MERCHANT_KEY)).toBeInTheDocument();
    expect(screen.getByText("99.00 RON")).toBeInTheDocument();
  });
});
