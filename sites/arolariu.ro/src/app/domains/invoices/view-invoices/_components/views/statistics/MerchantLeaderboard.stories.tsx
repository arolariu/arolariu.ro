import type {Meta, StoryObj} from "@storybook/react";
import {computeMerchantAggregates} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {MerchantLeaderboard} from "./MerchantLeaderboard";

/**
 * MerchantLeaderboard displays top merchants by spending as horizontal bars.
 *
 * ## Features
 * - Horizontal bar chart sorted by total spending
 * - Merchant name labels (truncated if long)
 * - Hover tooltips with spending and invoice count
 * - Empty state with icon and message
 * - Integrates with merchant store for name resolution
 * - Top 10 merchants by default
 *
 * ## Use Cases
 * - Merchant spending analysis
 * - Loyalty program insights
 * - Budget allocation by vendor
 * - Shopping pattern awareness
 */
const meta = {
  title: "Invoices/ViewInvoices/Statistics/MerchantLeaderboard",
  component: MerchantLeaderboard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes top merchants ranked by total spending using a horizontal bar chart. Shows merchant names (or IDs if names unavailable) with total spend and invoice counts. Integrates with the merchant store to resolve display names.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of merchant aggregates sorted by total spending (descending)",
      control: false,
    },
    currency: {
      description: "Currency code for display (e.g., RON, EUR, USD)",
      control: "text",
    },
  },
} satisfies Meta<typeof MerchantLeaderboard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with top merchants.
 * Shows realistic leaderboard with diverse merchant spending.
 */
export const Default: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices).slice(0, 10),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Default leaderboard showing top 10 merchants ranked by total spending.",
      },
    },
  },
};

/**
 * Empty state - no merchants.
 * Shows empty state when no merchant data is available.
 */
export const Empty: Story = {
  args: {
    data: computeMerchantAggregates(emptyInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state displayed when no merchant data exists. Shows icon and placeholder message.",
      },
    },
  },
};

/**
 * Single merchant - minimal data.
 * Shows leaderboard with only one merchant.
 */
export const SingleMerchant: Story = {
  args: {
    data: computeMerchantAggregates(singleInvoice),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal state with only one merchant in the leaderboard.",
      },
    },
  },
};

/**
 * Few merchants - sparse leaderboard.
 * Shows leaderboard with 2-3 merchants only.
 */
export const FewMerchants: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices.slice(0, 3)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Sparse leaderboard scenario with only a few merchants represented.",
      },
    },
  },
};

/**
 * Dominant merchant - one outlier.
 * Demonstrates scenario where one merchant has significantly higher spending.
 */
export const DominantMerchant: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices).slice(0, 10),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows leaderboard where one merchant dominates total spending (e.g., primary grocery store).",
      },
    },
  },
};

/**
 * RON currency display (explicit label variant).
 * Shows merchant leaderboard with explicit RON currency label.
 */
export const ExplicitRONCurrency: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices).slice(0, 10),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Merchant leaderboard with explicit RON currency label. Note: computeMerchantAggregates returns RON-normalized amounts.",
      },
    },
  },
};

/**
 * Balanced spending - no dominant merchant.
 * Shows even distribution across multiple merchants.
 */
export const BalancedSpending: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices.slice(0, 10)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Balanced scenario where spending is distributed evenly across merchants.",
      },
    },
  },
};

/**
 * Top 5 merchants - truncated list.
 * Shows only the top 5 merchants instead of 10.
 */
export const TopFive: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices).slice(0, 5),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Truncated leaderboard showing only top 5 merchants.",
      },
    },
  },
};
