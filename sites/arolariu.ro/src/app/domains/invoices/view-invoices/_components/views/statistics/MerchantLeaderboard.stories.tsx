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
 * Top 5 merchants only - compact leaderboard.
 * Limited to top 5 for reduced vertical space.
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

/** Two merchants — minimal leaderboard for comparison. */
export const TwoMerchants: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices.slice(0, 2)),
    currency: "RON",
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal leaderboard with exactly two merchants for baseline comparison.",
      },
    },
  },
};

/** Long merchant names — test label truncation in chart. */
export const LongMerchantNames: Story = {
  args: {
    data: [
      {
        merchantId: "merchant-long-name-1",
        totalSpend: 450.75,
        invoiceCount: 8,
        averageSpend: 56.34,
      },
      {
        merchantId: "merchant-long-name-2",
        totalSpend: 320.5,
        invoiceCount: 5,
        averageSpend: 64.1,
      },
      {
        merchantId: "merchant-long-name-3",
        totalSpend: 198.3,
        invoiceCount: 3,
        averageSpend: 66.1,
      },
    ],
    currency: "RON",
    merchantNamesById: {
      "merchant-long-name-1": "International Premium Organic Foods & Beverages Supermarket Chain",
      "merchant-long-name-2": "Artisan Local Farm-to-Table Specialty Grocery Store",
      "merchant-long-name-3": "Budget Discount Wholesale Warehouse Club",
    },
  },
  parameters: {
    docs: {
      description: {
        story: "Tests Y-axis label truncation with very long merchant names (20+ characters).",
      },
    },
  },
};

/** Three merchants — balanced leaderboard. */
export const ThreeMerchants: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices.slice(0, 3)),
    currency: "RON",
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Balanced leaderboard with exactly three merchants for compact view.",
      },
    },
  },
};

/** Four merchants — compact leaderboard grid. */
export const FourMerchants: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices.slice(0, 4)),
    currency: "RON",
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Compact leaderboard with four merchants.",
      },
    },
  },
};

/** Top 7 merchants — optimal vertical space. */
export const TopSeven: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices).slice(0, 7),
    currency: "RON",
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Leaderboard showing top 7 merchants for balanced vertical layout.",
      },
    },
  },
};

/** Top 15 merchants — extended leaderboard. */
export const TopFifteen: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices).slice(0, 15),
    currency: "RON",
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Extended leaderboard with top 15 merchants for deep analysis.",
      },
    },
  },
};

/** Even spending distribution — all merchants similar totals. */
export const EvenSpendingDistribution: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices.slice(0, 6)),
    currency: "RON",
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Leaderboard showing even spending distribution across merchants (minimal variance).",
      },
    },
  },
};

/** EUR currency leaderboard — Euro spending display. */
export const EurCurrencyLeaderboard: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "EUR")).slice(0, 10),
    currency: "EUR",
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Merchant leaderboard with EUR currency for Euro-based invoices.",
      },
    },
  },
};

/** USD currency leaderboard — US dollar spending. */
export const UsdCurrencyLeaderboard: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "USD")).slice(0, 10),
    currency: "USD",
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Merchant leaderboard with USD currency for US dollar invoices.",
      },
    },
  },
};

/** GBP currency leaderboard — British pound spending. */
export const GbpCurrencyLeaderboard: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "GBP")).slice(0, 10),
    currency: "GBP",
    merchantNamesById,
  },
  parameters: {
    docs: {
      description: {
        story: "Merchant leaderboard with GBP currency for British pound invoices.",
      },
    },
  },
};
