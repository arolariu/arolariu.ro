import type {Meta, StoryObj} from "@storybook/react";
import type {TimeOfDaySegment} from "../../../_utils/statistics";
import {computeTimeOfDay} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {TimeOfDayChart} from "./TimeOfDayChart";

type StoryArgs = {data: TimeOfDaySegment[]};

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
  title: "arolariu.ro/IMS/Statistics/Invoice/TimeOfDayChart",
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
    data: {control: "object"},
  },
  args: {
    data: computeTimeOfDay(mockInvoices),
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default view with diverse patterns.
 * Shows realistic distribution across all time segments.
 */
export const Default: Story = {
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
 * Morning shopper - morning activity focus.
 * Demonstrates pattern with invoices in the morning segment (6-12).
 */
export const MorningFocused: Story = {
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
        story: "Shows morning shopping pattern (6am-12pm) from filtered invoice subset.",
      },
    },
  },
};

/**
 * Afternoon shopper - afternoon activity focus.
 * Shows pattern with invoices in the afternoon segment (12-17).
 */
export const AfternoonFocused: Story = {
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
        story: "Shows afternoon shopping activity (12pm-5pm) from filtered invoice subset.",
      },
    },
  },
};

/**
 * Evening shopper - evening activity focus.
 * Demonstrates pattern with invoices in the evening segment (17-21).
 */
export const EveningFocused: Story = {
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
        story: "Shows evening shopping pattern (5pm-9pm) from filtered invoice subset.",
      },
    },
  },
};

/**
 * Night owl - late night activity focus.
 * Shows pattern with invoices during night hours (21-6).
 */
export const NightFocused: Story = {
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
        story: "Shows late-night shopping pattern (9pm-6am) from filtered invoice subset.",
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
 * Business hours - morning and afternoon segments.
 * Shows shopping during standard business hours.
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
        story: "Shows shopping pattern from business hours segments (morning and afternoon).",
      },
    },
  },
};

/** Two segments active — morning and evening contrast. */
export const TwoSegments: Story = {
  args: {
    data: computeTimeOfDay(
      mockInvoices.filter((inv) => {
        const hour = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getHours();
        return (hour >= 6 && hour < 12) || (hour >= 17 && hour < 21);
      }),
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal radar showing exactly two active segments (morning and evening).",
      },
    },
  },
};

/** Three segments active — balanced radar pattern. */
export const ThreeSegments: Story = {
  args: {
    data: computeTimeOfDay(
      mockInvoices.filter((inv) => {
        const hour = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getHours();
        return (hour >= 6 && hour < 12) || (hour >= 12 && hour < 17) || (hour >= 17 && hour < 21);
      }),
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Balanced radar chart showing three active time segments.",
      },
    },
  },
};

/** Four segments active — complete radar coverage. */
export const FourSegments: Story = {
  args: {
    data: computeTimeOfDay(mockInvoices),
  },
  parameters: {
    docs: {
      description: {
        story: "Complete radar showing activity across all four time segments.",
      },
    },
  },
};

/** Morning and afternoon — business day pattern. */
export const MorningAndAfternoon: Story = {
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
        story: "Shows shopping during morning and afternoon (business day pattern).",
      },
    },
  },
};

/** Evening and night — after-hours pattern. */
export const EveningAndNight: Story = {
  args: {
    data: computeTimeOfDay(
      mockInvoices.filter((inv) => {
        const hour = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getHours();
        return hour >= 17 || hour < 6;
      }),
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Shows shopping during evening and night (after-hours pattern).",
      },
    },
  },
};

/** Morning and evening — peak shopping times. */
export const MorningAndEvening: Story = {
  args: {
    data: computeTimeOfDay(
      mockInvoices.filter((inv) => {
        const hour = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getHours();
        return (hour >= 6 && hour < 12) || (hour >= 17 && hour < 21);
      }),
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Shows shopping during typical peak times (morning and evening).",
      },
    },
  },
};

/** Afternoon and night — unconventional pattern. */
export const AfternoonAndNight: Story = {
  args: {
    data: computeTimeOfDay(
      mockInvoices.filter((inv) => {
        const hour = new Date(inv.paymentInformation?.transactionDate ?? inv.createdAt).getHours();
        return (hour >= 12 && hour < 17) || hour >= 21 || hour < 6;
      }),
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Shows unconventional shopping pattern (afternoon and late night).",
      },
    },
  },
};

/** Dense time data — balanced activity across all segments. */
export const DenseTimeData: Story = {
  args: {
    data: computeTimeOfDay(mockInvoices),
  },
  parameters: {
    docs: {
      description: {
        story: "Dense dataset showing balanced shopping activity across all time segments.",
      },
    },
  },
};
