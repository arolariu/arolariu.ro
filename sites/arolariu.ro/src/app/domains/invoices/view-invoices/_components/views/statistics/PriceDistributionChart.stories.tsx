import type {Meta, StoryObj} from "@storybook/react";
import {computePriceDistribution} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {PriceDistributionChart} from "./PriceDistributionChart";

/**
 * PriceDistributionChart displays invoice total distribution in buckets as a vertical bar chart.
 *
 * ## Features
 * - Vertical bar chart with price range buckets
 * - Default buckets: 0-5, 5-10, 10-25, 25-50, 50-100, 100+
 * - Invoice count per price range (based on invoice totals)
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
          "Visualizes how invoice totals are distributed across price ranges using a vertical bar chart. Groups invoices into predefined buckets (0-5, 5-10, etc.) showing count and total amount per range. Useful for understanding typical transaction sizes and identifying spending patterns.",
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
      description: "Currency code for display (RON). Aggregate data is RON-normalized.",
      control: "text",
    },
  },
} satisfies Meta<typeof PriceDistributionChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with varied distribution.
 * Shows realistic price distribution across several buckets.
 */
export const Default: Story = {
  args: {
    data: computePriceDistribution(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Default price distribution showing invoices spread across multiple price ranges.",
      },
    },
  },
};

/**
 * Empty state - no invoices.
 * Shows chart when no invoices are available.
 */
export const Empty: Story = {
  args: {
    data: computePriceDistribution(emptyInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state when no invoices exist to distribute across price buckets.",
      },
    },
  },
};

/**
 * Single invoice - minimal data.
 * Shows distribution for one invoice total.
 */
export const SingleInvoice: Story = {
  args: {
    data: computePriceDistribution(singleInvoice),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal distribution from a single invoice total.",
      },
    },
  },
};

/**
 * Filtered invoice subset.
 * Demonstrates distribution from invoices with low-price items present.
 */
export const FilteredSubset: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.filter((inv) => inv.items.some((item) => item.price < 10))),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows distribution from invoices containing at least one low-price item. Note: computePriceDistribution buckets by invoice total, not individual item prices.",
      },
    },
  },
};

/**
 * High-price outliers.
 * Shows distribution with significant high-value invoices (100+).
 */
export const HighPriceOutliers: Story = {
  args: {
    data: computePriceDistribution(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Distribution showing presence of high-value invoices in the 100+ bucket.",
      },
    },
  },
};

/**
 * RON currency display (explicit label variant).
 * Shows price distribution with explicit RON currency label.
 */
export const ExplicitRONCurrency: Story = {
  args: {
    data: computePriceDistribution(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Price distribution with explicit RON label. Note: computePriceDistribution returns RON-normalized bucket amounts.",
      },
    },
  },
};

/**
 * Invoice subset (3-12).
 * Shows distribution from invoices 3-12 in the dataset.
 */
export const InvoiceSubset: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.slice(3, 12)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows price distribution computed from invoices 3-12 in the mock dataset.",
      },
    },
  },
};

/**
 * Sparse buckets - few invoices.
 * Shows distribution with only a few invoices total.
 */
export const SparseBuckets: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.slice(0, 2)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Sparse distribution scenario with very few invoices across buckets.",
      },
    },
  },
};
