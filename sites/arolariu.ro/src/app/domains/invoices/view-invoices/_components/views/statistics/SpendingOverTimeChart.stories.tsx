import type {Meta, StoryObj} from "@storybook/react";
import {computeMonthlySpending} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {SpendingOverTimeChart} from "./SpendingOverTimeChart";

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
  title: "Invoices/ViewInvoices/Statistics/SpendingOverTimeChart",
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
    data: {
      description: "Array of monthly spending data with month labels, amounts, counts, and invoice details",
      control: false,
    },
    currency: {
      description: "Currency code for display (e.g., RON, EUR, USD)",
      control: "text",
    },
  },
} satisfies Meta<typeof SpendingOverTimeChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with multi-month trends.
 * Shows realistic spending pattern across several months.
 */
export const Default: Story = {
  args: {
    data: computeMonthlySpending(mockInvoices),
    currency: "RON",
  },
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
 * Increasing trend - growing spending.
 * Demonstrates upward spending trend over months.
 */
export const IncreasingTrend: Story = {
  args: {
    data: computeMonthlySpending(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows upward spending trend indicating increased monthly expenses over time.",
      },
    },
  },
};

/**
 * Decreasing trend - reducing spending.
 * Shows downward spending pattern (budget improvement).
 */
export const DecreasingTrend: Story = {
  args: {
    data: computeMonthlySpending(mockInvoices.slice(0, 5)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows downward trend indicating successful budget reduction over time.",
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
 * EUR currency display.
 * Shows spending trend in euros.
 */
export const EuroCurrency: Story = {
  args: {
    data: computeMonthlySpending(mockInvoices),
    currency: "EUR",
  },
  parameters: {
    docs: {
      description: {
        story: "Monthly spending chart displayed in EUR for European users.",
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
