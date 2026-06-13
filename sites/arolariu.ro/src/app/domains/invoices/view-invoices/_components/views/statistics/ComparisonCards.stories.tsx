import type {Meta, StoryObj} from "@storybook/react";
import type {MonthComparison} from "../../../_utils/statistics";
import {computeMonthComparison} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {ComparisonCards} from "./ComparisonCards";

type StoryArgs = {data: MonthComparison; currency: string};

/**
 * ComparisonCards displays month-over-month comparison metrics in animated cards.
 *
 * ## Features
 * - Three comparison cards: spending delta, invoice count, new merchants
 * - Animated card entrance with staggered delays
 * - Trend indicators (up/down/neutral icons)
 * - Color-coded trends (positive=green, negative=red, neutral=gray)
 * - Progress bars for visual representation
 * - Percentage and absolute value changes
 *
 * ## Use Cases
 * - Month-over-month spending analysis
 * - Budget tracking and trends
 * - Merchant discovery metrics
 * - Financial behavior insights
 */
const meta = {
  title: "arolariu.ro/IMS/Statistics/Invoice/ComparisonCards",
  component: ComparisonCards,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Displays month-over-month comparison metrics showing spending changes, invoice count deltas, and newly discovered merchants. Cards are animated on entry with trend indicators and progress bars for quick visual assessment.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {control: "object"},
    currency: {control: "text"},
  },
  args: {
    data: computeMonthComparison(mockInvoices),
    currency: "RON",
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default view with mixed trends.
 * Shows realistic month-over-month comparison with varied metrics.
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: "Default comparison state showing current vs previous month metrics with realistic deltas.",
      },
    },
  },
};

/**
 * Mixed trends with slight spending decrease.
 * Demonstrates scenario with varied month-over-month metrics.
 */
export const MixedTrends: Story = {
  args: {
    data: computeMonthComparison(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Realistic scenario showing mixed metrics: slight spending decrease but varied invoice count and merchant patterns.",
      },
    },
  },
};

/**
 * Spending decreased - positive savings.
 * Shows favorable comparison where user spent less this month.
 */
export const SpendingDecreased: Story = {
  args: {
    data: computeMonthComparison(mockInvoices.slice(0, 5)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Positive scenario where spending decreased compared to previous month, indicating better budget control.",
      },
    },
  },
};

/**
 * Familiar merchants - no new discoveries.
 * Shows month where user shopped at previously visited merchants.
 */
export const NoNewMerchants: Story = {
  args: {
    data: computeMonthComparison(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows month with no new merchant discoveries (newMerchantCount = 0), indicating consistent shopping patterns.",
      },
    },
  },
};

/**
 * Empty previous month - first time user.
 * Shows comparison when there's no historical data.
 */
export const NoPreviousMonth: Story = {
  args: {
    data: computeMonthComparison(singleInvoice),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "First-time user scenario with no previous month data for comparison.",
      },
    },
  },
};

/**
 * No data - empty state.
 * Shows cards when no invoices are available.
 */
export const Empty: Story = {
  args: {
    data: computeMonthComparison(emptyInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state when no invoice data exists for either month.",
      },
    },
  },
};

/**
 * RON currency display (alternative label).
 * Shows comparison metrics with RON label (data is always RON-normalized).
 */
export const ExplicitRON: Story = {
  args: {
    data: computeMonthComparison(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Month-over-month comparison with explicit RON currency label. All aggregate data is RON-normalized.",
      },
    },
  },
};

/**
 * Modest invoice count delta.
 * Demonstrates realistic change in number of invoices.
 */
export const ModestInvoiceCountChange: Story = {
  args: {
    data: computeMonthComparison(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows realistic scenario with modest change in invoice frequency month-over-month (e.g., +1 or +2 invoices).",
      },
    },
  },
};
