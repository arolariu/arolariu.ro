import type {Meta, StoryObj} from "@storybook/react";
import {computePriceDistribution} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {PriceDistributionChart} from "./PriceDistributionChart";

/**
 * PriceDistributionChart displays item price distribution in buckets as a vertical bar chart.
 *
 * ## Features
 * - Vertical bar chart with price range buckets
 * - Default buckets: 0-5, 5-10, 10-25, 25-50, 50-100, 100+
 * - Item count per price range
 * - Hover tooltips with count details
 * - Color-coded bars (cycling through 5 chart colors)
 * - Total amount per bucket tracked
 *
 * ## Use Cases
 * - Price pattern analysis
 * - Budget allocation insights
 * - Transaction size distribution
 * - Spending outlier identification
 */
const meta = {
  title: "Invoices/ViewInvoices/Statistics/PriceDistributionChart",
  component: PriceDistributionChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes how items are distributed across price ranges using a vertical bar chart. Groups items into predefined buckets (0-5, 5-10, etc.) showing count and total amount per range. Useful for understanding typical transaction sizes and identifying spending patterns.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of price buckets with range labels, counts, and total amounts",
      control: false,
    },
    currency: {
      description: "Currency code for display (e.g., RON, EUR, USD)",
      control: "text",
    },
  },
} satisfies Meta<typeof PriceDistributionChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with varied distribution.
 * Shows realistic price distribution across all buckets.
 */
export const Default: Story = {
  args: {
    data: computePriceDistribution(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Default price distribution showing items spread across multiple price ranges.",
      },
    },
  },
};

/**
 * Empty state - no items.
 * Shows chart when no invoice items are available.
 */
export const Empty: Story = {
  args: {
    data: computePriceDistribution(emptyInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state when no items exist to distribute across price buckets.",
      },
    },
  },
};

/**
 * Single invoice - minimal data.
 * Shows distribution for one invoice's items.
 */
export const SingleInvoice: Story = {
  args: {
    data: computePriceDistribution(singleInvoice),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal distribution from a single invoice's product prices.",
      },
    },
  },
};

/**
 * Low-price items dominant.
 * Demonstrates scenario with most items in 0-10 range.
 */
export const LowPriceDominant: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.filter((inv) => inv.items.some((item) => item.price < 10))),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows distribution where low-price items (0-10) dominate, typical for grocery shopping.",
      },
    },
  },
};

/**
 * High-price outliers.
 * Shows distribution with significant high-value items (100+).
 */
export const HighPriceOutliers: Story = {
  args: {
    data: computePriceDistribution(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Distribution showing presence of expensive items in the 100+ bucket.",
      },
    },
  },
};

/**
 * EUR currency display.
 * Shows price distribution in euros.
 */
export const EuroCurrency: Story = {
  args: {
    data: computePriceDistribution(mockInvoices),
    currency: "EUR",
  },
  parameters: {
    docs: {
      description: {
        story: "Price distribution displayed in EUR for European users.",
      },
    },
  },
};

/**
 * Mid-range concentration.
 * Demonstrates normal distribution centered around 10-50 range.
 */
export const MidRangeConcentration: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.slice(3, 12)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows distribution where most items fall in the middle price ranges (10-50).",
      },
    },
  },
};

/**
 * Sparse buckets - few items.
 * Shows distribution with only a few items total.
 */
export const SparseBuckets: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.slice(0, 2)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Sparse distribution scenario with very few items across buckets.",
      },
    },
  },
};
