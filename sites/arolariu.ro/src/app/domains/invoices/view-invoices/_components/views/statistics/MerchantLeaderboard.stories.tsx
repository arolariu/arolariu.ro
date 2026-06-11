import type {Meta, StoryObj} from "@storybook/react";
import {useMerchantsStore} from "@/stores";
import type {ContactInformation, Merchant} from "@/types/invoices/Merchant";
import {MerchantCategory} from "@/types/invoices/Merchant";
import {computeMerchantAggregates} from "../../../_utils/statistics";
import {emptyInvoices, MOCK_MERCHANTS, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {MerchantLeaderboard} from "./MerchantLeaderboard";

function createContactInformation(name: string): ContactInformation {
  return {
    fullName: `${name} Romania SRL`,
    address: "Bucharest, Romania",
    phoneNumber: "+40 21 000 0000",
    emailAddress: `contact@${name.toLowerCase().replaceAll(" ", "")}.example`,
    website: "https://example.com",
  };
}

function createMerchant(id: string, name: string, category: Merchant["category"]): Merchant {
  return {
    id,
    name,
    description: `${name} deterministic statistics story merchant`,
    category,
    address: createContactInformation(name),
    parentCompanyId: "",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    createdBy: "storybook-user",
    lastUpdatedAt: new Date("2026-01-01T00:00:00.000Z"),
    lastUpdatedBy: "storybook-user",
    numberOfUpdates: 0,
    isImportant: false,
    isSoftDeleted: false,
  };
}

const storyMerchants: Merchant[] = [
  createMerchant(MOCK_MERCHANTS.LIDL, "Lidl", MerchantCategory.SUPERMARKET),
  createMerchant(MOCK_MERCHANTS.KAUFLAND, "Kaufland", MerchantCategory.HYPERMARKET),
  createMerchant(MOCK_MERCHANTS.CARREFOUR, "Carrefour", MerchantCategory.HYPERMARKET),
  createMerchant(MOCK_MERCHANTS.MEGA_IMAGE, "Mega Image", MerchantCategory.SUPERMARKET),
  createMerchant(MOCK_MERCHANTS.AUCHAN, "Auchan", MerchantCategory.HYPERMARKET),
  createMerchant(MOCK_MERCHANTS.PROFI, "Profi", MerchantCategory.SUPERMARKET),
  createMerchant(MOCK_MERCHANTS.PENNY, "Penny", MerchantCategory.SUPERMARKET),
  createMerchant(MOCK_MERCHANTS.MCDONALD, "McDonald's", MerchantCategory.OTHER),
  createMerchant(MOCK_MERCHANTS.KFC, "KFC", MerchantCategory.OTHER),
  createMerchant(MOCK_MERCHANTS.PIZZA_HUT, "Pizza Hut", MerchantCategory.OTHER),
];

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
  beforeEach: () => {
    useMerchantsStore.getState().clearEntities();
    useMerchantsStore.getState().setEntities(storyMerchants);
    useMerchantsStore.getState().setHasHydrated(true);

    return () => {
      useMerchantsStore.getState().clearEntities();
    };
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of merchant aggregates sorted by total spending (descending)",
      control: false,
    },
    currency: {
      description: "Display currency label for RON-normalized aggregates.",
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
 * Top merchants ranking.
 * Shows top 10 merchants from the full mock dataset.
 */
export const TopMerchantsRanking: Story = {
  args: {
    data: computeMerchantAggregates(mockInvoices).slice(0, 10),
    currency: "RON",
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
  },
  parameters: {
    docs: {
      description: {
        story: "Truncated leaderboard showing only top 5 merchants.",
      },
    },
  },
};
