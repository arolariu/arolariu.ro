import type {Meta, StoryObj} from "@storybook/react";
import {computeTimeOfDay} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {TimeOfDayChart} from "./TimeOfDayChart";

/**
 * TimeOfDayChart displays shopping patterns by time segment as a radar chart.
 *
 * ## Features
 * - Radar/spider chart with 4 time segments
 * - Time segments: Morning (6-12), Afternoon (12-17), Evening (17-21), Night (21-6)
 * - Gradient fill visualization
 * - Polar grid with dashed lines
 * - Hover tooltips with segment name and invoice count
 * - Auto-scaled radial axis
 *
 * ## Use Cases
 * - Shopping behavior analysis
 * - Time-of-day pattern identification
 * - User habit insights
 * - Peak shopping time detection
 *
 * ## Important
 * The Radar component's `dataKey` must match the field name in TimeOfDaySegment (currently 'invoiceCount').
 * Mismatches will cause the chart to render with zero values.
 */
const meta = {
  title: "Invoices/ViewInvoices/Statistics/TimeOfDayChart",
  component: TimeOfDayChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes shopping patterns across four time-of-day segments (Morning, Afternoon, Evening, Night) using a radar chart. Shows invoice counts per segment to help users understand when they shop most frequently. The dataKey='invoiceCount' must match the TimeOfDaySegment field.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of time-of-day segments with segment names, invoice counts, and spending totals",
      control: false,
    },
  },
} satisfies Meta<typeof TimeOfDayChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with diverse patterns.
 * Shows realistic distribution across all time segments.
 */
export const Default: Story = {
  args: {
    data: computeTimeOfDay(mockInvoices),
  },
  parameters: {
    docs: {
      description: {
        story: "Default radar chart showing shopping activity distributed across all four time segments.",
      },
    },
  },
};

/**
 * Empty state - no time data.
 * Shows chart when no time-of-day data is available.
 */
export const Empty: Story = {
  args: {
    data: computeTimeOfDay(emptyInvoices),
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state when no time-of-day data exists. All segments will show zero values.",
      },
    },
  },
};

/**
 * Single invoice - minimal data.
 * Shows chart with only one time segment active.
 */
export const SingleSegment: Story = {
  args: {
    data: computeTimeOfDay(singleInvoice),
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal chart showing activity in only one time segment.",
      },
    },
  },
};

/**
 * Morning shopper - dominant morning activity.
 * Demonstrates pattern where user shops primarily in the morning (6-12).
 */
export const MorningDominant: Story = {
  args: {
    data: computeTimeOfDay(
      mockInvoices.filter((inv) => {
        const hour = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getHours();
        return hour >= 6 && hour < 12;
      }),
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Shows strong morning shopping pattern (6am-12pm), indicating early-bird shopper behavior.",
      },
    },
  },
};

/**
 * Afternoon shopper - peak afternoon activity.
 * Shows pattern where afternoon (12-17) is most active.
 */
export const AfternoonDominant: Story = {
  args: {
    data: computeTimeOfDay(
      mockInvoices.filter((inv) => {
        const hour = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getHours();
        return hour >= 12 && hour < 17;
      }),
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Shows peak afternoon shopping activity (12pm-5pm), typical for lunch-break or post-work shopping.",
      },
    },
  },
};

/**
 * Evening shopper - evening hours dominant.
 * Demonstrates evening (17-21) shopping preference.
 */
export const EveningDominant: Story = {
  args: {
    data: computeTimeOfDay(
      mockInvoices.filter((inv) => {
        const hour = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getHours();
        return hour >= 17 && hour < 21;
      }),
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Shows evening shopping pattern (5pm-9pm), indicating after-work shopping habits.",
      },
    },
  },
};

/**
 * Night owl - late night activity.
 * Shows pattern where user shops during night hours (21-6).
 */
export const NightDominant: Story = {
  args: {
    data: computeTimeOfDay(
      mockInvoices.filter((inv) => {
        const hour = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getHours();
        return hour >= 21 || hour < 6;
      }),
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Shows late-night shopping pattern (9pm-6am), indicating night owl shopping behavior.",
      },
    },
  },
};

/**
 * Full dataset time pattern.
 * Shows time-of-day distribution from all mock invoices.
 */
export const FullDataset: Story = {
  args: {
    data: computeTimeOfDay(mockInvoices),
  },
  parameters: {
    docs: {
      description: {
        story: "Time-of-day distribution computed from the full mock invoice dataset.",
      },
    },
  },
};

/**
 * Business hours - morning and afternoon only.
 * Shows shopping concentrated in standard business hours.
 */
export const BusinessHours: Story = {
  args: {
    data: computeTimeOfDay(
      mockInvoices.filter((inv) => {
        const hour = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getHours();
        return hour >= 6 && hour < 17;
      }),
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Shows shopping pattern limited to business hours (morning and afternoon only).",
      },
    },
  },
};
