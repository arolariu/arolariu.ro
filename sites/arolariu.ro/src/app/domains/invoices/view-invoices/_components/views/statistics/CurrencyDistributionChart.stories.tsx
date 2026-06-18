import type {Meta, StoryObj} from "@storybook/react";
import type {CurrencyDistribution} from "../../../_utils/statistics";
import {computeCurrencyDistribution} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, ronOnlyInvoices} from "./__mocks__/mockInvoices";
import {CurrencyDistributionChart} from "./CurrencyDistributionChart";

type StoryArgs = {data: CurrencyDistribution[]};

/**
 * CurrencyDistributionChart displays multi-currency spending patterns.
 *
 * ## Features
 * - Progress bars showing spending by currency
 * - RON/Original currency toggle
 * - Currency flags for visual identification
 * - Single currency detection with special message
 * - Empty state handling
 *
 * ## Use Cases
 * - Multi-currency travel spending analysis
 * - Cross-border shopping patterns
 * - Currency exposure tracking
 */
const meta = {
  title: "arolariu.ro/IMS/Statistics/Invoice/CurrencyDistributionChart",
  component: CurrencyDistributionChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes spending distribution across multiple currencies with RON conversion. Displays progress bars, currency flags, and supports toggling between original and RON-normalized views.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {control: "object"},
  },
  args: {
    data: computeCurrencyDistribution(mockInvoices),
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default view with multiple currencies (RON, EUR, USD).
 * Shows spending across 3 different currencies with RON conversion.
 */
export const Default: Story = {};

/**
 * Single currency scenario - displays special message instead of chart.
 * When all invoices use the same currency, shows simplified stats.
 */
export const SingleCurrency: Story = {
  args: {
    data: computeCurrencyDistribution(ronOnlyInvoices),
  },
};

/**
 * Empty state - no invoices available.
 * Component renders nothing when no data is present.
 */
export const Empty: Story = {
  args: {
    data: computeCurrencyDistribution(emptyInvoices),
  },
};

/**
 * Two currencies only - simplified comparison view.
 * Shows RON vs EUR spending distribution.
 */
export const TwoCurrencies: Story = {
  args: {
    data: computeCurrencyDistribution(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code !== "USD")),
  },
};

/**
 * High EUR spending scenario.
 * Demonstrates chart behavior when one currency dominates.
 */
export const HighEuroSpending: Story = {
  args: {
    data: computeCurrencyDistribution(
      mockInvoices.filter((inv, index) => {
        const code = inv.paymentInformation.currency?.code;
        return code === "EUR" || (code === "RON" && index % 3 === 0);
      }),
    ),
  },
};

/** Three currencies — optimal donut visual density. */
export const ThreeCurrencies: Story = {
  args: {
    data: computeCurrencyDistribution(mockInvoices),
  },
};

/** Four currencies — many currency scenario. */
export const FourCurrencies: Story = {
  args: {
    data: computeCurrencyDistribution(mockInvoices),
  },
};

/** Five currencies — complex multi-currency scenario. */
export const FiveCurrencies: Story = {
  args: {
    data: computeCurrencyDistribution(mockInvoices),
  },
};

/** Dominant single currency — 95% RON spending. */
export const DominantSingleCurrency: Story = {
  args: {
    data: computeCurrencyDistribution([
      ...mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "RON"),
      ...mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "EUR").slice(0, 1),
    ]),
  },
};

/** USD-heavy spending — US dollar prominence. */
export const HighUsdSpending: Story = {
  args: {
    data: computeCurrencyDistribution(
      mockInvoices.filter((inv, index) => {
        const code = inv.paymentInformation.currency?.code;
        return code === "USD" || (code === "RON" && index % 4 === 0);
      }),
    ),
  },
};

/** Even three-way split — balanced RON/EUR/USD. */
export const EvenThreeWaySplit: Story = {
  args: {
    data: computeCurrencyDistribution(mockInvoices.slice(0, 9)),
  },
};

/** GBP-only subset — British pound filter. */
export const GbpOnlySpending: Story = {
  args: {
    data: computeCurrencyDistribution(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "GBP")),
  },
};

/** Sparse multi-currency — minimal invoices across currencies. */
export const SparseMultiCurrency: Story = {
  args: {
    data: computeCurrencyDistribution(mockInvoices.slice(0, 4)),
  },
};
