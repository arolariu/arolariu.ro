import type {Meta, StoryObj} from "@storybook/react";
import {computeMerchantTrends} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {MerchantTrendsChart} from "./MerchantTrendsChart";

/**
 * MerchantTrendsChart displays spending trends for top merchants over time.
 *
 * ## Features
 * - Table layout with inline sparkline visualizations
 * - Shows last 6 months of spending
 * - Merchant name display with fallback
 * - Total spend per merchant
 * - Responsive month labels
 *
 * ## Use Cases
 * - Track spending patterns per merchant
 * - Identify shopping frequency changes
 * - Compare merchant visit trends
 */
const meta = {
  title: "Invoices/Statistics/MerchantTrendsChart",
  component: MerchantTrendsChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes monthly spending patterns for top merchants using sparkline-style bar charts. Shows total spend and trend bars scaled relative to maximum monthly amount across all merchants.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of merchant trend data sorted by total spend",
      control: false,
    },
    currency: {
      description: "Currency display label or symbol",
      control: "text",
    },
  },
} satisfies Meta<typeof MerchantTrendsChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view showing top 5 merchants.
 * Displays spending trends for most frequented stores.
 */
export const Default: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices),
    currency: "lei",
  },
};

/**
 * Empty state - no merchant data.
 * Displays message when no invoices are available.
 */
export const Empty: Story = {
  args: {
    data: computeMerchantTrends(emptyInvoices),
    currency: "lei",
  },
};

/**
 * Single invoice - minimal trend.
 * Shows trend visualization for one invoice.
 */
export const SingleInvoice: Story = {
  args: {
    data: computeMerchantTrends(singleInvoice),
    currency: "lei",
  },
};

/**
 * Top 3 merchants only.
 * Limited to top 3 for compact display.
 */
export const TopThree: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices, 3),
    currency: "lei",
  },
};

/**
 * Extended list - top 10 merchants.
 * Shows more merchants for comprehensive analysis.
 */
export const TopTen: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices, 10),
    currency: "lei",
  },
};

/**
 * Single merchant trends.
 * Focuses on one merchant's spending pattern.
 */
export const SingleMerchant: Story = {
  args: {
    data: computeMerchantTrends(
      mockInvoices.filter((inv) => inv.merchantReference === "merchant-lidl-001"),
      1,
    ),
    currency: "lei",
  },
};

/**
 * Grocery merchants only.
 * Filters to show only grocery store trends.
 */
export const GroceryMerchantsOnly: Story = {
  args: {
    data: computeMerchantTrends(
      mockInvoices.filter((inv) => inv.category === 100), // GROCERY enum value
    ),
    currency: "lei",
  },
};

/**
 * Fast food merchants.
 * Shows trends for fast food establishments.
 */
export const FastFoodMerchants: Story = {
  args: {
    data: computeMerchantTrends(
      mockInvoices.filter((inv) => inv.category === 200), // FAST_FOOD enum value
    ),
    currency: "lei",
  },
};

/**
 * EUR currency display.
 * Demonstrates trends with Euro as currency.
 */
export const EuroCurrency: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "EUR")),
    currency: "€",
  },
};
