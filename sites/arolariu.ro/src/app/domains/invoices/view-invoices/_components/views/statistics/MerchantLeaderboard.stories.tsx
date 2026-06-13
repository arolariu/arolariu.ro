import type {Meta, StoryObj} from "@storybook/react";
import type {MerchantAggregate} from "../../../_utils/statistics";
import {computeMerchantAggregates} from "../../../_utils/statistics";
import {emptyInvoices, MOCK_MERCHANTS, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {MerchantLeaderboard} from "./MerchantLeaderboard";

const merchantNamesById = {
  [MOCK_MERCHANTS.LIDL]: "Lidl",
  [MOCK_MERCHANTS.KAUFLAND]: "Kaufland",
  [MOCK_MERCHANTS.CARREFOUR]: "Carrefour",
  [MOCK_MERCHANTS.MEGA_IMAGE]: "Mega Image",
  [MOCK_MERCHANTS.AUCHAN]: "Auchan",
  [MOCK_MERCHANTS.PROFI]: "Profi",
  [MOCK_MERCHANTS.PENNY]: "Penny",
  [MOCK_MERCHANTS.MCDONALD]: "McDonald's",
  [MOCK_MERCHANTS.KFC]: "KFC",
  [MOCK_MERCHANTS.PIZZA_HUT]: "Pizza Hut",
} as const;

type StoryArgs = {data: MerchantAggregate[]; currency: string; merchantNamesById?: Record<string, string>};

/**
 * MerchantLeaderboard displays top merchants by spending as horizontal bars.
 *
 * ## Features
 * - Horizontal bar chart sorted by total spending
 * - Merchant name labels (truncated if long)
 * - Hover tooltips with spending and invoice count
 * - Empty state with icon and message
 * - Accepts deterministic story merchant names while production uses store resolution
 * - Top 10 merchants by default
 *
 * ## Use Cases
 * - Merchant spending analysis
 * - Loyalty program insights
 * - Budget allocation by vendor
 * - Shopping pattern awareness
 */
const meta = {
  title: "arolariu.ro/IMS/Statistics/Merchant/MerchantLeaderboard",
  component: MerchantLeaderboard,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes top merchants ranked by total spending using a horizontal bar chart. Stories pass deterministic merchant names while production falls back to the persisted merchant store.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {control: "object"},
    currency: {control: "text"},
    merchantNamesById: {control: "object"},
  },
  args: {
    data: computeMerchantAggregates(mockInvoices).slice(0, 10),
    currency: "RON",
    merchantNamesById,
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default view with top merchants.
 * Shows realistic leaderboard with diverse merchant spending.
 */
export const Default: Story = {
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
    merchantNamesById,
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
    merchantNamesById,
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
    merchantNamesById,
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
 * Top merchants ranking.
 * Shows top 10 merchants from the full mock dataset.
 */
export const TopMerchantsRanking: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices).slice(0, 10),
    currency: "RON",
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Shows top 10 merchants ranked by total spending from the full mock dataset.",
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
    merchantNamesById,
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
 * First 10 invoices subset.
 * Shows merchant leaderboard from first 10 invoices.
 */
export const FirstTenInvoices: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices.slice(0, 10)),
    currency: "RON",
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Merchant leaderboard computed from first 10 invoices in the mock dataset.",
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
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Truncated leaderboard showing only top 5 merchants.",
      },
    },
  },
};
