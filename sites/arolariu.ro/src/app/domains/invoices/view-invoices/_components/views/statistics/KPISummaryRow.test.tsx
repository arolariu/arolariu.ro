/**
 * @fileoverview Unit tests for the KPISummaryRow statistics cards.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/KPISummaryRow.test
 */

import {render, screen} from "@testing-library/react";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import type {KPIData} from "../../../_utils/statistics";
import {KPISummaryRow} from "./KPISummaryRow";

const KPI_KEY = "cards.invoices.statistics.kpi";

function buildKpis(overrides: Partial<KPIData> = {}): KPIData {
  return {
    totalSpending: 1234.5,
    invoiceCount: 4,
    averagePerInvoice: 308.63,
    mostFrequentMerchant: {id: "merchant-abcdefghijklmnop", count: 3},
    averageItemsPerInvoice: 2.5,
    totalItems: 10,
    currency: "RON",
    ...overrides,
  };
}

describe("KPISummaryRow", () => {
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  it("renders the four KPI card labels", () => {
    render(
      <KPISummaryRow
        data={buildKpis()}
        currency='RON'
      />,
    );

    for (const label of ["totalSpending", "invoiceCount", "topMerchant", "averageItems"]) {
      expect(screen.getByText(`${KPI_KEY}.${label}`)).toBeInTheDocument();
    }
  });

  it("formats total spending with the currency, invoice count, and average items", () => {
    render(
      <KPISummaryRow
        data={buildKpis()}
        currency='EUR'
      />,
    );

    expect(screen.getByText("1,234.50 EUR")).toBeInTheDocument();
    expect(screen.getByText("4 invoices")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("2.5")).toBeInTheDocument();
    expect(screen.getByText(`${KPI_KEY}.avgPerInvoice`)).toBeInTheDocument();
    expect(screen.getByText(`${KPI_KEY}.acrossInvoices`)).toBeInTheDocument();
  });

  it("shows the truncated top merchant identifier and its visit count when a merchant exists", () => {
    render(
      <KPISummaryRow
        data={buildKpis()}
        currency='RON'
      />,
    );

    expect(screen.getByText("merchant-abc")).toBeInTheDocument();
    expect(screen.queryByText("merchant-abcdefghijklmnop")).not.toBeInTheDocument();
    expect(screen.getByText(`${KPI_KEY}.visits`)).toBeInTheDocument();
    expect(screen.queryByText(`${KPI_KEY}.noneYet`)).not.toBeInTheDocument();
  });

  it("falls back to the none-yet copy without a visits subtitle when no merchant exists", () => {
    render(
      <KPISummaryRow
        data={buildKpis({totalSpending: 0, invoiceCount: 0, averagePerInvoice: 0, mostFrequentMerchant: null, averageItemsPerInvoice: 0})}
        currency='RON'
      />,
    );

    expect(screen.getByText(`${KPI_KEY}.noneYet`)).toBeInTheDocument();
    expect(screen.queryByText(`${KPI_KEY}.visits`)).not.toBeInTheDocument();
    expect(screen.getByText("0.00 RON")).toBeInTheDocument();
    expect(screen.getByText("0 invoices")).toBeInTheDocument();
    expect(screen.getByText(`${KPI_KEY}.avgPerInvoice`)).toBeInTheDocument();
  });

  it("never renders a trend percentage because every KPI card is built without a trend", () => {
    const {container} = render(
      <KPISummaryRow
        data={buildKpis()}
        currency='RON'
      />,
    );

    expect(container.textContent).not.toMatch(/\d%/u);
  });
});
