import type {Meta, StoryObj} from "@storybook/react";
import {computeMerchantVisitPatterns} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {MerchantVisitChart} from "./MerchantVisitChart";

/**
 * MerchantVisitChart displays visit patterns and shopping behavior per merchant.
 *
 * ## Features
 * - Card grid layout for merchants
 * - Visit count and frequency metrics
 * - Average basket size
 * - Preferred shopping day
 * - Average spend per visit
 *
 * ## Use Cases
 * - Shopping behavior analysis
 * - Identify preferred merchants
 * - Track visit frequency patterns
 * - Analyze basket size trends
 */
const meta = {
  title: "Invoices/Statistics/MerchantVisitChart",
  component: MerchantVisitChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Displays visit patterns for top merchants in a card grid. Shows total visits, visits per month, average basket size, preferred shopping day, and average spending per visit.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of merchant visit pattern data sorted by total visits",
      control: false,
    },
    currency: {
      description: "Currency code for display",
      control: "text",
    },
    topN: {
      description: "Number of merchants to display (default: 6)",
      control: "number",
    },
  },
} satisfies Meta<typeof MerchantVisitChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view showing top 6 merchants.
 * Displays visit patterns for most frequented stores.
 */
export const Default: Story = {
  args: {
    data: computeMerchantVisitPatterns(mockInvoices),
    currency: "lei",
    topN: 6,
  },
};

/**
 * Empty state - no merchant data.
 * Displays message when no invoices are available.
 */
export const Empty: Story = {
  args: {
    data: computeMerchantVisitPatterns(emptyInvoices),
    currency: "lei",
    topN: 6,
  },
};

/**
 * Single invoice - minimal visit data.
 * Shows visit pattern for one invoice.
 */
export const SingleInvoice: Story = {
  args: {
    data: computeMerchantVisitPatterns(singleInvoice),
    currency: "lei",
    topN: 6,
  },
};

/**
 * Top 3 merchants only - compact view.
 * Limited to top 3 for quick overview.
 */
export const TopThree: Story = {
  args: {
    data: computeMerchantVisitPatterns(mockInvoices),
    currency: "lei",
    topN: 3,
  },
};

/**
 * Top 4 merchants - 2x2 grid.
 * Shows 4 merchants in balanced grid layout.
 */
export const TopFour: Story = {
  args: {
    data: computeMerchantVisitPatterns(mockInvoices),
    currency: "lei",
    topN: 4,
  },
};

/**
 * Extended list - top 9 merchants.
 * Shows more merchants for comprehensive analysis.
 */
export const TopNine: Story = {
  args: {
    data: computeMerchantVisitPatterns(mockInvoices),
    currency: "lei",
    topN: 9,
  },
};

/**
 * Single merchant pattern.
 * Focuses on one merchant's visit behavior.
 */
export const SingleMerchant: Story = {
  args: {
    data: computeMerchantVisitPatterns(mockInvoices.filter((inv) => inv.merchantReference === "merchant-lidl-001")),
    currency: "lei",
    topN: 1,
  },
};

/**
 * Grocery merchants only.
 * Filters to show only grocery store visit patterns.
 */
export const GroceryMerchantsOnly: Story = {
  args: {
    data: computeMerchantVisitPatterns(
      mockInvoices.filter((inv) => inv.category === 100), // GROCERY enum value
    ),
    currency: "lei",
    topN: 6,
  },
};

/**
 * Fast food merchants.
 * Shows visit patterns for fast food establishments.
 */
export const FastFoodMerchants: Story = {
  args: {
    data: computeMerchantVisitPatterns(
      mockInvoices.filter((inv) => inv.category === 200), // FAST_FOOD enum value
    ),
    currency: "lei",
    topN: 6,
  },
};

/**
 * High visit frequency.
 * Shows merchants with many visits (multiple invoices).
 */
export const HighVisitFrequency: Story = {
  args: {
    data: computeMerchantVisitPatterns(mockInvoices),
    currency: "lei",
    topN: 3,
  },
};

/**
 * EUR currency display.
 * Demonstrates visit patterns with Euro as currency.
 */
export const EuroCurrency: Story = {
  args: {
    data: computeMerchantVisitPatterns(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "EUR")),
    currency: "€",
    topN: 6,
  },
};

/**
 * All available merchants.
 * Shows visit patterns for all unique merchants in dataset.
 */
export const AllMerchants: Story = {
  args: {
    data: computeMerchantVisitPatterns(mockInvoices),
    currency: "lei",
    topN: 20,
  },
};
