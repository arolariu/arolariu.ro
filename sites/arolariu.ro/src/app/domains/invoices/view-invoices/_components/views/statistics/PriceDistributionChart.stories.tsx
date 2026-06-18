import type {Meta, StoryObj} from "@storybook/react";
import type {Invoice, Product} from "../../../../../../../types/invoices";
import type {PriceBucket} from "../../../_utils/statistics";
import {computePriceDistribution} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {PriceDistributionChart} from "./PriceDistributionChart";

type StoryArgs = {data: PriceBucket[]; currency: string};

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
  title: "arolariu.ro/IMS/Statistics/Products/PriceDistributionChart",
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
    data: {control: "object"},
    currency: {control: "text"},
  },
  args: {
    data: computePriceDistribution(mockInvoices),
    currency: "RON",
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default view with varied distribution.
 * Shows realistic price distribution across several buckets.
 */
export const Default: Story = {
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
    data: computePriceDistribution(mockInvoices.filter((inv: Invoice) => inv.items.some((item: Product) => item.price < 10))),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Shows distribution from invoices containing at least one low-price item. Note: computePriceDistribution buckets by invoice total, not individual item prices.",
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

/** Two invoices — minimal distribution for comparison. */
export const TwoInvoices: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.slice(0, 2)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal distribution with exactly two invoices in the dataset.",
      },
    },
  },
};

/** Three invoices — early user scenario. */
export const ThreeInvoices: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.slice(0, 3)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Early user distribution from exactly three invoices.",
      },
    },
  },
};

/** Four invoices — minimal active user. */
export const FourInvoices: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.slice(0, 4)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal active user distribution from four invoices.",
      },
    },
  },
};

/** Five invoices — growing dataset. */
export const FiveInvoices: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.slice(0, 5)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Growing user distribution from exactly five invoices.",
      },
    },
  },
};

/** Low-price bucket focus — 0-10 range. */
export const LowPriceFocus: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.slice(0, 8)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Distribution showing concentration in low-price buckets (0-10 RON).",
      },
    },
  },
};

/** Mid-range bucket focus — 25-100 range. */
export const MidRangeFocus: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.slice(5, 15)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Distribution showing concentration in mid-range buckets (25-100 RON).",
      },
    },
  },
};

/** EUR currency distribution — Euro price buckets. */
export const EurCurrencyDistribution: Story = {
  args: {
    data: computePriceDistribution(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "EUR")),
    currency: "EUR",
  },
  parameters: {
    docs: {
      description: {
        story: "Price distribution with EUR currency for Euro-based invoices.",
      },
    },
  },
};

/** Dense distribution — many invoices across all buckets. */
export const DenseDistribution: Story = {
  args: {
    data: computePriceDistribution(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Dense distribution showing invoices spread evenly across all price buckets.",
      },
    },
  },
};
