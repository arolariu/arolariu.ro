import type {Meta, StoryObj} from "@storybook/react";
import {computeDailySpending} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import SpendingCalendarHeatmap from "./SpendingCalendarHeatmap";

/**
 * SpendingCalendarHeatmap displays daily spending as a GitHub-style calendar heatmap.
 *
 * ## Features
 * - Calendar grid with day-of-week labels
 * - Color intensity based on spending (5 levels: 0 = no spending to 4 = highest)
 * - Interactive tooltips showing date, amount, and invoice count
 * - Month navigation with previous/next buttons
 * - Responsive design with horizontal scroll on mobile
 * - Color legend showing intensity scale (less to more)
 * - Bounded navigation (cannot go past current month)
 *
 * ## Use Cases
 * - Daily spending pattern visualization
 * - High-activity day identification
 * - Temporal spending trend analysis
 * - Budget tracking by day
 */
const meta = {
  title: "Invoices/ViewInvoices/Statistics/SpendingCalendarHeatmap",
  component: SpendingCalendarHeatmap,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes daily spending patterns using a GitHub-style calendar heatmap. Each day is color-coded by spending intensity (grey for zero, green gradient for spending). Users can navigate between months and hover over days for detailed tooltips.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of daily spending data with ISO date strings, amounts, and invoice counts",
      control: false,
    },
    currency: {
      description: "Currency code for display (e.g., RON, EUR, USD)",
      control: "text",
    },
  },
  decorators: [
    (Story) => {
      // Mock Date to June 2026 for deterministic calendar rendering
      const OriginalDate = globalThis.Date;
      const mockDate = new Date("2026-06-11T12:00:00Z");

      // @ts-expect-error - Mocking Date constructor for stories
      globalThis.Date = class extends OriginalDate {
        constructor(...args: unknown[]) {
          if (args.length === 0) {
            super(mockDate.getTime());
          } else {
            // @ts-expect-error - Pass through arguments
            super(...args);
          }
        }

        static now(): number {
          return mockDate.getTime();
        }
      } as DateConstructor;

      const result = <Story />;

      // Restore original Date after render
      globalThis.Date = OriginalDate;

      return result;
    },
  ],
} satisfies Meta<typeof SpendingCalendarHeatmap>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with varied daily spending.
 * Shows realistic heatmap with diverse spending patterns across days.
 */
export const Default: Story = {
  args: {
    data: computeDailySpending(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Default calendar heatmap showing spending intensity across multiple days.",
      },
    },
  },
};

/**
 * Empty state - no spending data.
 * Shows heatmap when no daily spending exists (all grey).
 */
export const Empty: Story = {
  args: {
    data: computeDailySpending(emptyInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state where no spending data exists. All calendar cells will be grey (level 0).",
      },
    },
  },
};

/**
 * Single day activity.
 * Shows heatmap with only one day having spending.
 */
export const SingleDay: Story = {
  args: {
    data: computeDailySpending(singleInvoice),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal heatmap showing spending on just one day.",
      },
    },
  },
};

/**
 * Frequent spending - high activity.
 * Demonstrates heatmap with spending on most days.
 */
export const HighActivity: Story = {
  args: {
    data: computeDailySpending(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "High-activity scenario where user makes purchases most days of the month.",
      },
    },
  },
};

/**
 * Weekend-heavy pattern.
 * Shows spending concentrated on weekends (Saturdays/Sundays).
 */
export const WeekendPattern: Story = {
  args: {
    data: computeDailySpending(mockInvoices.filter((inv) => {
      const day = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getDay();
      return day === 0 || day === 6; // Sunday or Saturday
    })),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows spending pattern concentrated on weekends, indicating weekend shopping habits.",
      },
    },
  },
};

/**
 * Sparse activity - occasional spending.
 * Demonstrates infrequent spending with many empty days.
 */
export const SparseActivity: Story = {
  args: {
    data: computeDailySpending(mockInvoices.slice(0, 3)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Sparse spending pattern with only occasional purchases throughout the month.",
      },
    },
  },
};

/**
 * EUR currency display.
 * Shows calendar heatmap in euros.
 */
export const EuroCurrency: Story = {
  args: {
    data: computeDailySpending(mockInvoices),
    currency: "EUR",
  },
  parameters: {
    docs: {
      description: {
        story: "Calendar heatmap displayed in EUR for European users.",
      },
    },
  },
};

/**
 * Mid-month concentration.
 * Shows spending concentrated in the middle of the month.
 */
export const MidMonthSpending: Story = {
  args: {
    data: computeDailySpending(mockInvoices.filter((inv) => {
      const date = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getDate();
      return date >= 10 && date <= 20;
    })),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows spending pattern where most activity occurs mid-month (days 10-20).",
      },
    },
  },
};
