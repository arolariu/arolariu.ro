/**
 * @fileoverview Unit tests for the CurrencyDistributionChart multi-currency breakdown.
 * @module app/domains/invoices/view-invoices/_components/views/statistics/CurrencyDistributionChart.test
 */

import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {afterAll, beforeAll, describe, expect, it} from "vitest";
import type {CurrencyDistribution} from "../../../_utils/statistics";
import {CurrencyDistributionChart} from "./CurrencyDistributionChart";

const CURRENCY_KEY = "cards.invoices.statistics.currencyDistribution";
const TOGGLE_LABEL = `${CURRENCY_KEY}.toggleLabel`;

function buildDistribution(overrides: Partial<CurrencyDistribution> = {}): CurrencyDistribution {
  return {
    currencyCode: "RON",
    currencySymbol: "lei",
    invoiceCount: 5,
    totalOriginal: 500,
    totalInRON: 500,
    percentage: 50,
    ...overrides,
  };
}

const ron = buildDistribution();
const eur = buildDistribution({
  currencyCode: "EUR",
  currencySymbol: "€",
  invoiceCount: 2,
  totalOriginal: 60,
  totalInRON: 300,
  percentage: 30,
});
const unmapped = buildDistribution({
  currencyCode: "XYZ",
  currencySymbol: "¤",
  invoiceCount: 1,
  totalOriginal: 40,
  totalInRON: 200,
  percentage: 20,
});
const multiCurrency = [ron, eur, unmapped];

describe("CurrencyDistributionChart", () => {
  beforeAll(() => {
    MotionGlobalConfig.skipAnimations = true;
  });

  afterAll(() => {
    MotionGlobalConfig.skipAnimations = false;
  });

  describe("empty and single-currency states", () => {
    it("renders nothing when there is no currency data", () => {
      const {container} = render(<CurrencyDistributionChart data={[]} />);

      expect(container).toBeEmptyDOMElement();
    });

    it("renders nothing when the only entry is a hole in a sparse array", () => {
      const {container} = render(<CurrencyDistributionChart data={new Array<CurrencyDistribution>(1)} />);

      expect(container).toBeEmptyDOMElement();
    });

    it("shows the single-currency summary with the currency flag, total, and invoice count", () => {
      render(<CurrencyDistributionChart data={[eur]} />);

      expect(screen.getByText(`${CURRENCY_KEY}.title`)).toBeInTheDocument();
      expect(screen.getByText(`${CURRENCY_KEY}.singleCurrency`)).toBeInTheDocument();
      expect(screen.getByText("🇪🇺")).toBeInTheDocument();
      expect(screen.getByText("60.00 €")).toBeInTheDocument();
      expect(screen.getByText(`${CURRENCY_KEY}.totalAmount`)).toBeInTheDocument();
      expect(screen.getByText(`${CURRENCY_KEY}.invoiceCount`)).toBeInTheDocument();
      expect(screen.getByText("2")).toBeInTheDocument();
      expect(screen.queryByRole("button", {name: TOGGLE_LABEL})).not.toBeInTheDocument();
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("falls back to the globe flag for a single unmapped currency", () => {
      render(<CurrencyDistributionChart data={[unmapped]} />);

      expect(screen.getByText("🌐")).toBeInTheDocument();
      expect(screen.queryByText("🇪🇺")).not.toBeInTheDocument();
      expect(screen.getByText("40.00 ¤")).toBeInTheDocument();
    });
  });

  describe("multi-currency breakdown", () => {
    it("renders one flagged row per currency with its original amount and percentage", () => {
      render(<CurrencyDistributionChart data={multiCurrency} />);

      expect(screen.getByLabelText("RON flag")).toHaveTextContent("🇷🇴");
      expect(screen.getByLabelText("EUR flag")).toHaveTextContent("🇪🇺");
      expect(screen.getByLabelText("XYZ flag")).toHaveTextContent("🌐");
      expect(screen.getByText("500.00 lei")).toBeInTheDocument();
      expect(screen.getByText("60.00 €")).toBeInTheDocument();
      expect(screen.getByText("40.00 ¤")).toBeInTheDocument();
      expect(screen.getByText("50.0%")).toBeInTheDocument();
      expect(screen.getByText("30.0%")).toBeInTheDocument();
      expect(screen.getByText("20.0%")).toBeInTheDocument();
      expect(screen.getAllByText(`${CURRENCY_KEY}.invoiceCount`)).toHaveLength(multiCurrency.length);
    });

    it("labels each progress bar with its currency share", () => {
      render(<CurrencyDistributionChart data={multiCurrency} />);

      expect(screen.getByRole("progressbar", {name: "RON spending: 50%"})).toHaveAttribute("aria-valuenow", "50");
      expect(screen.getByRole("progressbar", {name: "EUR spending: 30%"})).toHaveAttribute("aria-valuenow", "30");
      expect(screen.getByRole("progressbar", {name: "XYZ spending: 20%"})).toHaveAttribute("aria-valuenow", "20");
    });

    it("shows the RON equivalent only for foreign currencies in the original view", () => {
      render(<CurrencyDistributionChart data={multiCurrency} />);

      expect(screen.getByText(`${CURRENCY_KEY}.ronEquivalent: 300.00 lei`)).toBeInTheDocument();
      expect(screen.getByText(`${CURRENCY_KEY}.ronEquivalent: 200.00 lei`)).toBeInTheDocument();
      expect(screen.queryByText(`${CURRENCY_KEY}.ronEquivalent: 500.00 lei`)).not.toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`${CURRENCY_KEY}\\.originalAmount`, "u"))).not.toBeInTheDocument();
    });

    it("summarizes the number of currencies and the total RON spending", () => {
      render(<CurrencyDistributionChart data={multiCurrency} />);

      expect(screen.getByText(`${CURRENCY_KEY}.totalCurrencies`)).toBeInTheDocument();
      expect(screen.getByText("3")).toBeInTheDocument();
      expect(screen.getByText(`${CURRENCY_KEY}.totalSpending`)).toBeInTheDocument();
      expect(screen.getByText("1,000.00 lei")).toBeInTheDocument();
    });

    it("switches to RON amounts with original secondary amounts and back when toggled", async () => {
      const user = userEvent.setup();
      render(<CurrencyDistributionChart data={multiCurrency} />);
      const toggle = screen.getByRole("button", {name: TOGGLE_LABEL});
      expect(toggle).toHaveTextContent(`${CURRENCY_KEY}.showRON`);

      await user.click(toggle);

      expect(toggle).toHaveTextContent(`${CURRENCY_KEY}.showOriginal`);
      expect(screen.getByText("300.00 lei")).toBeInTheDocument();
      expect(screen.getByText("200.00 lei")).toBeInTheDocument();
      expect(screen.queryByText("60.00 €")).not.toBeInTheDocument();
      expect(screen.getByText(`${CURRENCY_KEY}.originalAmount: 60.00 €`)).toBeInTheDocument();
      expect(screen.getByText(`${CURRENCY_KEY}.originalAmount: 40.00 ¤`)).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`${CURRENCY_KEY}\\.ronEquivalent`, "u"))).not.toBeInTheDocument();

      await user.click(toggle);

      expect(toggle).toHaveTextContent(`${CURRENCY_KEY}.showRON`);
      expect(screen.getByText("60.00 €")).toBeInTheDocument();
      expect(screen.queryByText(new RegExp(`${CURRENCY_KEY}\\.originalAmount`, "u"))).not.toBeInTheDocument();
    });
  });
});
