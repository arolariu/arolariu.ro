import type {Meta, StoryObj} from "@storybook/react";
import {computeCurrencyDistribution} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, ronOnlyInvoices} from "./__mocks__/mockInvoices";
import {CurrencyDistributionChart} from "./CurrencyDistributionChart";

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
  title: "Invoices/Statistics/CurrencyDistributionChart",
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
    data: {
      description: "Array of currency distribution data with totals and percentages",
      control: false,
    },
  },
} satisfies Meta<typeof CurrencyDistributionChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with multiple currencies (RON, EUR, USD).
 * Shows spending across 3 different currencies with RON conversion.
 */
export const Default: Story = {
  args: {
    data: computeCurrencyDistribution(mockInvoices),
  },
};

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
      mockInvoices.filter((inv) => {
        const code = inv.paymentInformation.currency?.code;
        return code === "EUR" || (code === "RON" && Math.random() < 0.3);
      }),
    ),
  },
};
