import type {Meta, StoryObj} from "@storybook/react";
import {computeTopProducts} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {TopProductsChart} from "./TopProductsChart";

/**
 * TopProductsChart displays most purchased products in leaderboard format.
 *
 * ## Features
 * - Table layout with rank badges
 * - Gold/silver/bronze medals for top 3
 * - Shows quantity, spending, purchase count, and average price
 * - Responsive horizontal scroll
 * - Empty state handling
 *
 * ## Use Cases
 * - Identify most purchased items
 * - Track spending on specific products
 * - Shopping habit analysis
 */
const meta = {
  title: "Invoices/Statistics/TopProductsChart",
  component: TopProductsChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Displays top products by spending in a leaderboard-style table. Shows rank badges (trophies for top 3), quantity purchased, total spent, purchase count, and average price per unit.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of top products sorted by total spending",
      control: false,
    },
    currency: {
      description: "Currency code for display (always RON for normalized data)",
      control: "text",
    },
  },
} satisfies Meta<typeof TopProductsChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view showing top 10 products.
 * Displays most purchased items across all invoices.
 */
export const Default: Story = {
  args: {
    data: computeTopProducts(mockInvoices),
    currency: "lei",
  },
};

/**
 * Empty state - no products available.
 * Displays friendly message when no product data exists.
 */
export const Empty: Story = {
  args: {
    data: computeTopProducts(emptyInvoices),
    currency: "lei",
  },
};

/**
 * Single invoice - minimal products.
 * Shows leaderboard for one invoice's items.
 */
export const SingleInvoice: Story = {
  args: {
    data: computeTopProducts(singleInvoice),
    currency: "lei",
  },
};

/**
 * Top 5 only - compact view.
 * Limited to top 5 products for quick overview.
 */
export const TopFive: Story = {
  args: {
    data: computeTopProducts(mockInvoices, 5),
    currency: "lei",
  },
};

/**
 * Top 3 only - podium view.
 * Shows only the top 3 products with medal badges.
 */
export const TopThree: Story = {
  args: {
    data: computeTopProducts(mockInvoices, 3),
    currency: "lei",
  },
};

/**
 * Extended list - top 20 products.
 * Shows more products for detailed analysis.
 */
export const TopTwenty: Story = {
  args: {
    data: computeTopProducts(mockInvoices, 20),
    currency: "lei",
  },
};

/**
 * Grocery products only.
 * Filters to show only grocery category products.
 */
export const GroceryOnly: Story = {
  args: {
    data: computeTopProducts(
      mockInvoices.filter((inv) => inv.category === 100), // GROCERY enum value
    ),
    currency: "lei",
  },
};

/**
 * EUR currency display.
 * Demonstrates leaderboard with Euro as currency.
 */
export const EuroCurrency: Story = {
  args: {
    data: computeTopProducts(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "EUR")),
    currency: "€",
  },
};
