import type {Meta, StoryObj} from "@storybook/react";
import {computeDailySpending} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import SpendingCalendarHeatmap from "./SpendingCalendarHeatmap";

type DateConstructorArguments =
  | []
  | [value: string | number | Date]
  | [year: number, monthIndex: number, date?: number, hours?: number, minutes?: number, seconds?: number, ms?: number];

const NativeDate = globalThis.Date;
const fixedStoryDate = new NativeDate(2026, 5, 11, 12, 0, 0, 0);
let activeDateMocks = 0;

function createNativeDateFromArguments(args: DateConstructorArguments): Date {
  switch (args.length) {
    case 0:
      return new NativeDate(fixedStoryDate.getTime());
    case 1:
      return new NativeDate(args[0]);
    case 2:
      return new NativeDate(args[0], args[1]);
    case 3:
      return new NativeDate(args[0], args[1], args[2]);
    case 4:
      return new NativeDate(args[0], args[1], args[2], args[3]);
    case 5:
      return new NativeDate(args[0], args[1], args[2], args[3], args[4]);
    case 6:
      return new NativeDate(args[0], args[1], args[2], args[3], args[4], args[5]);
    case 7:
      return new NativeDate(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
  }

  return new NativeDate(fixedStoryDate.getTime());
}

function createFixedDateConstructor(fixedTime: number): DateConstructor {
  function FixedDate(...args: DateConstructorArguments): string | Date {
    if (new.target === undefined) {
      return new NativeDate(fixedTime).toString();
    }

    return args.length === 0 ? new NativeDate(fixedTime) : createNativeDateFromArguments(args);
  }

  Object.setPrototypeOf(FixedDate, NativeDate);
  FixedDate.prototype = NativeDate.prototype;
  Object.defineProperty(FixedDate, "now", {
    configurable: true,
    value: () => fixedTime,
  });

  return FixedDate as DateConstructor;
}

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
      description: "Display currency label for RON-normalized aggregates.",
      control: "text",
    },
  },
  beforeEach: () => {
    if (activeDateMocks === 0) {
      globalThis.Date = createFixedDateConstructor(fixedStoryDate.getTime());
    }
    activeDateMocks += 1;

    return () => {
      activeDateMocks = Math.max(0, activeDateMocks - 1);
      if (activeDateMocks === 0) {
        globalThis.Date = NativeDate;
      }
    };
  },
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
 * Moderate spending activity.
 * Demonstrates heatmap with spending on several days of the month.
 */
export const ModerateActivity: Story = {
  args: {
    data: computeDailySpending(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Moderate-activity scenario where user makes purchases on a few days of the month (4 active days in June).",
      },
    },
  },
};

/**
 * Weekend spending pattern.
 * Shows spending on weekends (Saturdays/Sundays).
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
        story: "Shows spending pattern on weekends, indicating weekend shopping habits.",
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
 * RON currency display (alternative label).
 * Shows calendar heatmap with RON label (data is always RON-normalized).
 */
export const ExplicitRON: Story = {
  args: {
    data: computeDailySpending(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Calendar heatmap with explicit RON label. All aggregate data is RON-normalized.",
      },
    },
  },
};

/**
 * Mid-month window.
 * Shows spending in the middle of the month.
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
        story: "Shows spending pattern from mid-month date range (days 10-20).",
      },
    },
  },
};
