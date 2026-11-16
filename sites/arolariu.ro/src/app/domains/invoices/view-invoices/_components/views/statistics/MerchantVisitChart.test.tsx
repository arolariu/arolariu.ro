/**
 * @fileoverview Unit tests for the MerchantVisitChart merchant visit-pattern card grid.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/MerchantVisitChart.test
 *
 * @remarks
 * Merchant names come from the real `useMerchantsStore` (persisted to the global fake IndexedDB),
 * seeded per test and cleared afterwards.
 */

import {useMerchantsStore} from "@/stores/merchantsStore";
import {act, render, screen, within} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {buildMerchant} from "../../../../../../../../tests/helpers/invoiceDomain";
import type {MerchantVisitPattern} from "../../../_utils/statistics";
import {MerchantVisitChart} from "./MerchantVisitChart";

const TITLE_KEY = "cards.invoices.statistics.merchantVisit.title";
const DESCRIPTION_KEY = "cards.invoices.statistics.merchantVisit.description";
const EMPTY_KEY = "cards.invoices.statistics.merchantVisit.empty";
const METRIC_KEYS = ["totalVisits", "visitsPerMonth", "basketSize", "preferredDay", "avgSpend"].map(
  (metric) => `cards.invoices.statistics.merchantVisit.metrics.${metric}`,
);

function makePattern(merchantId: string, overrides: Partial<MerchantVisitPattern> = {}): MerchantVisitPattern {
  return {
    merchantId,
    totalVisits: 3,
    averageVisitsPerMonth: 1,
    mostCommonDayOfWeek: 2,
    averageBasketSize: 2,
    averageSpendPerVisit: 50,
    ...overrides,
  };
}

const sevenPatterns: MerchantVisitPattern[] = Array.from({length: 7}, (_, index) => makePattern(`merchant-${index + 1}`));

function getMerchantCard(name: string): HTMLElement {
  const card = screen.getByRole("heading", {level: 3, name}).parentElement?.parentElement;
  if (card === null || card === undefined) throw new Error(`Merchant card "${name}" did not render.`);
  return card;
}

function seedMerchants(...merchants: ReturnType<typeof buildMerchant>[]): void {
  act(() => {
    useMerchantsStore.getState().setEntities(merchants);
  });
}

describe("MerchantVisitChart", () => {
  beforeEach(async () => {
    await useMerchantsStore.persist.rehydrate();
    act(() => {
      useMerchantsStore.getState().clearEntities();
    });
  });

  afterEach(() => {
    act(() => {
      useMerchantsStore.getState().clearEntities();
    });
  });

  it("renders the empty state when there are no visit patterns", () => {
    render(
      <MerchantVisitChart
        data={[]}
        currency='RON'
      />,
    );

    expect(screen.getByText(TITLE_KEY)).toBeInTheDocument();
    expect(screen.getByText(DESCRIPTION_KEY)).toBeInTheDocument();
    expect(screen.getByText(EMPTY_KEY)).toBeInTheDocument();
    expect(screen.queryAllByRole("heading", {level: 3})).toHaveLength(0);
  });

  it("renders the empty state when topN excludes every merchant", () => {
    render(
      <MerchantVisitChart
        data={sevenPatterns}
        currency='RON'
        topN={0}
      />,
    );

    expect(screen.getByText(EMPTY_KEY)).toBeInTheDocument();
    expect(screen.queryByRole("heading", {level: 3, name: "merchant-1"})).not.toBeInTheDocument();
  });

  it("shows the first six merchants by default", () => {
    render(
      <MerchantVisitChart
        data={sevenPatterns}
        currency='RON'
      />,
    );

    const names = screen.getAllByRole("heading", {level: 3}).map((heading) => heading.textContent);
    expect(names).toEqual(["merchant-1", "merchant-2", "merchant-3", "merchant-4", "merchant-5", "merchant-6"]);
    expect(screen.queryByRole("heading", {level: 3, name: "merchant-7"})).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_KEY)).not.toBeInTheDocument();
  });

  it("limits the grid to an explicit topN", () => {
    render(
      <MerchantVisitChart
        data={sevenPatterns}
        currency='RON'
        topN={2}
      />,
    );

    const names = screen.getAllByRole("heading", {level: 3}).map((heading) => heading.textContent);
    expect(names).toEqual(["merchant-1", "merchant-2"]);
  });

  it("uses the stored merchant name and falls back to a truncated or raw merchant id", () => {
    const longId = "merchant-with-a-very-long-identifier";
    seedMerchants(buildMerchant({id: "known-merchant", name: "Corner Bakery"}));

    render(
      <MerchantVisitChart
        data={[makePattern("known-merchant"), makePattern(longId), makePattern("short-id")]}
        currency='RON'
      />,
    );

    const names = screen.getAllByRole("heading", {level: 3}).map((heading) => heading.textContent);
    expect(names).toEqual(["Corner Bakery", `${longId.slice(0, 22)}...`, "short-id"]);
    expect(screen.queryByRole("heading", {level: 3, name: "known-merchant"})).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", {level: 3, name: longId})).not.toBeInTheDocument();
  });

  it("keeps a merchant id of exactly 25 characters untruncated", () => {
    const boundaryId = "abcdefghijklmnopqrstuvwxy";

    render(
      <MerchantVisitChart
        data={[makePattern(boundaryId)]}
        currency='RON'
      />,
    );

    expect(boundaryId).toHaveLength(25);
    expect(screen.getByRole("heading", {level: 3, name: boundaryId})).toBeInTheDocument();
  });

  it("renders every labelled metric with locale formatting and the currency code", () => {
    render(
      <MerchantVisitChart
        data={[
          makePattern("merchant-a", {
            totalVisits: 12,
            averageVisitsPerMonth: 2.46,
            averageBasketSize: 4.33,
            averageSpendPerVisit: 1087.6,
          }),
        ]}
        currency='EUR'
      />,
    );

    const card = getMerchantCard("merchant-a");
    for (const key of METRIC_KEYS) {
      expect(within(card).getByText(key)).toBeInTheDocument();
    }
    expect(within(card).getByText("12")).toBeInTheDocument();
    expect(within(card).getByText("2.5")).toBeInTheDocument();
    expect(within(card).getByText("4.3")).toBeInTheDocument();
    expect(within(card).getByText("1,087.60 EUR")).toBeInTheDocument();
    expect(within(card).queryByText(/RON/u)).not.toBeInTheDocument();
  });

  it("renders the preferred day using the Date#getDay index (0 = Sunday)", () => {
    render(
      <MerchantVisitChart
        data={[
          makePattern("merchant-a", {mostCommonDayOfWeek: 0}),
          makePattern("merchant-b", {mostCommonDayOfWeek: 3}),
          makePattern("merchant-c", {mostCommonDayOfWeek: 6}),
        ]}
        currency='RON'
      />,
    );

    expect(within(getMerchantCard("merchant-a")).getByText("Sunday")).toBeInTheDocument();
    expect(within(getMerchantCard("merchant-b")).getByText("Wednesday")).toBeInTheDocument();
    expect(within(getMerchantCard("merchant-c")).getByText("Saturday")).toBeInTheDocument();
    expect(within(getMerchantCard("merchant-a")).queryByText("Monday")).not.toBeInTheDocument();
  });
});
