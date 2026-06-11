import type {Meta, StoryObj} from "@storybook/react";
import {computeMonthComparison} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {ComparisonCards} from "./ComparisonCards";

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
  title: "Invoices/ViewInvoices/Statistics/ComparisonCards",
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
    data: {
      description: "Month comparison data with current/previous month metrics and deltas",
      control: false,
    },
    currency: {
      description: "Currency code for display (e.g., RON, EUR, USD)",
      control: "text",
    },
  },
} satisfies Meta<typeof ComparisonCards>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with mixed trends.
 * Shows realistic month-over-month comparison with varied metrics.
 */
export const Default: Story = {
  args: {
    data: computeMonthComparison(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Default comparison state showing current vs previous month metrics with realistic deltas.",
      },
    },
  },
};

/**
 * Spending increased significantly.
 * Demonstrates scenario where current month spending is much higher.
 */
export const SpendingIncreased: Story = {
  args: {
    data: computeMonthComparison(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Scenario where spending has increased compared to the previous month (negative trend for savings).",
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
 * New merchants discovered.
 * Highlights month where user shopped at several new places.
 */
export const NewMerchantsFound: Story = {
  args: {
    data: computeMonthComparison(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows month with new merchant discoveries, indicating shopping pattern changes.",
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
 * EUR currency display.
 * Shows comparison metrics in euros.
 */
export const EuroCurrency: Story = {
  args: {
    data: computeMonthComparison(mockInvoices),
    currency: "EUR",
  },
  parameters: {
    docs: {
      description: {
        story: "Month-over-month comparison displayed in EUR for European users.",
      },
    },
  },
};

/**
 * High invoice count delta.
 * Demonstrates significant change in number of invoices.
 */
export const HighInvoiceCountChange: Story = {
  args: {
    data: computeMonthComparison(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows scenario with significant change in invoice frequency month-over-month.",
      },
    },
  },
};
