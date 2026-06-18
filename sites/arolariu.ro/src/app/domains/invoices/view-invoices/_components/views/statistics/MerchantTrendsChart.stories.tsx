import type {Meta, StoryObj} from "@storybook/react";
import type {MerchantTrend} from "../../../_utils/statistics";
import {computeMerchantTrends} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {MerchantTrendsChart} from "./MerchantTrendsChart";

type StoryArgs = {data: MerchantTrend[]; currency: string};

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
  title: "arolariu.ro/IMS/Statistics/Merchant/MerchantTrendsChart",
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
    data: {control: "object"},
    currency: {control: "text"},
  },
  args: {
    data: computeMerchantTrends(mockInvoices),
    currency: "lei",
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default view showing top 5 merchants.
 * Displays spending trends for most frequented stores.
 */
export const Default: Story = {};

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

/** Two merchants — minimal trends table. */
export const TwoMerchants: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices, 2),
    currency: "lei",
  },
};

/** Four merchants — balanced trends grid. */
export const FourMerchants: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices, 4),
    currency: "lei",
  },
};

/** Five merchants — optimal trends table. */
export const FiveMerchants: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices, 5),
    currency: "lei",
  },
};

/** Six merchants — full grid view. */
export const SixMerchants: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices, 6),
    currency: "lei",
  },
};

/** Seven merchants — extended trends analysis. */
export const SevenMerchants: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices, 7),
    currency: "lei",
  },
};

/** RON currency trends — lei display. */
export const RonCurrencyTrends: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "RON")),
    currency: "lei",
  },
};

/** USD currency trends — dollar display. */
export const UsdCurrencyTrends: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "USD")),
    currency: "$",
  },
};

/** Sparse trends — minimal monthly data. */
export const SparseTrends: Story = {
  args: {
    data: computeMerchantTrends(mockInvoices.slice(0, 3)),
    currency: "lei",
  },
};
