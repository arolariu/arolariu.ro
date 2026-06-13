import type {Meta, StoryObj} from "@storybook/react";
import type {MonthlySpending} from "../../../_utils/statistics";
import {computeMonthlySpending} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {SpendingOverTimeChart} from "./SpendingOverTimeChart";

type StoryArgs = {data: MonthlySpending[]; currency: string};

/**
 * SpendingOverTimeChart displays monthly spending trends as an area chart.
 *
 * ## Features
 * - Area chart with gradient fill
 * - Monthly aggregation of spending
 * - Hover tooltips with month, amount, and invoice count
 * - Clickable invoice links in tooltip (up to 10 shown)
 * - Smooth monotone curve interpolation
 * - Y-axis formatted as whole numbers
 * - Responsive design with auto-scaled axes
 *
 * ## Use Cases
 * - Monthly spending trend analysis
 * - Budget tracking over time
 * - Seasonal pattern identification
 * - Invoice drill-down from chart
 */
const meta = {
  title: "arolariu.ro/IMS/Statistics/Invoice/SpendingOverTimeChart",
  component: SpendingOverTimeChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes monthly spending trends using an area chart with gradient fill. Shows spending amounts over time with tooltips containing month details, invoice counts, and clickable links to individual invoices. Useful for identifying spending patterns and seasonal trends.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {control: "object"},
    currency: {control: "text"},
  },
  args: {
    data: computeMonthlySpending(mockInvoices),
    currency: "RON",
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default view with multi-month trends.
 * Shows realistic spending pattern across several months.
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: "Default area chart showing monthly spending trends over multiple months.",
      },
    },
  },
};

/**
 * Empty state - no spending data.
 * Shows chart when no monthly data is available.
 */
export const Empty: Story = {
  args: {
    data: computeMonthlySpending(emptyInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state when no monthly spending data exists. Chart will show no area.",
      },
    },
  },
};

/**
 * Single month - minimal data.
 * Shows chart with only one month's data point.
 */
export const SingleMonth: Story = {
  args: {
    data: computeMonthlySpending(singleInvoice),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal chart with spending data for only one month.",
      },
    },
  },
};

/**
 * Varied trend - fluctuating spending.
 * Demonstrates spending pattern with ups and downs over months.
 */
export const VariedTrend: Story = {
  args: {
    data: computeMonthlySpending(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows realistic spending pattern with month-to-month fluctuations (not monotonically increasing).",
      },
    },
  },
};

/**
 * Varied trend - limited data subset.
 * Shows spending pattern from subset of invoices.
 */
export const LimitedDataSubset: Story = {
  args: {
    data: computeMonthlySpending(mockInvoices.slice(0, 5)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows spending trend from limited invoice subset. Data may vary month-to-month depending on invoice distribution.",
      },
    },
  },
};

/**
 * Volatile pattern - high variance.
 * Demonstrates irregular spending with peaks and valleys.
 */
export const VolatileSpending: Story = {
  args: {
    data: computeMonthlySpending(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows volatile spending pattern with significant month-to-month variation.",
      },
    },
  },
};

/**
 * RON currency display (alternative label).
 * Shows spending trend with RON label (data is always RON-normalized).
 */
export const ExplicitRON: Story = {
  args: {
    data: computeMonthlySpending(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Monthly spending chart with explicit RON label. All aggregate data is RON-normalized.",
      },
    },
  },
};

/**
 * Few months - short history.
 * Shows chart with only 2-3 months of data.
 */
export const ShortHistory: Story = {
  args: {
    data: computeMonthlySpending(mockInvoices.slice(0, 6)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Short history scenario with only a few months of spending data.",
      },
    },
  },
};
