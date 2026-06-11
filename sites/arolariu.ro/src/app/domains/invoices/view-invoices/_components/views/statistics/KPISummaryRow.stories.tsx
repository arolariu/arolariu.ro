import type {Meta, StoryObj} from "@storybook/react";
import {computeKPIs} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {KPISummaryRow} from "./KPISummaryRow";

/**
 * KPISummaryRow displays key performance indicators in animated cards.
 *
 * ## Features
 * - Four KPI cards: total spending, invoice count, top merchant, average items
 * - Animated card entrance with staggered timing
 * - Icon-based visual hierarchy
 * - Value animations on mount
 * - Optional trend indicators (currently not used but supported)
 * - Subtitle context for each metric
 *
 * ## Use Cases
 * - Dashboard overview section
 * - Quick metrics snapshot
 * - Financial summary
 * - Spending behavior insights
 */
const meta = {
  title: "Invoices/ViewInvoices/Statistics/KPISummaryRow",
  component: KPISummaryRow,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Displays high-level key performance indicators including total spending, invoice count, most frequent merchant, and average items per invoice. Cards animate on entry with icons and contextual subtitles for quick insights.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Computed KPI data with totals, averages, and aggregates",
      control: false,
    },
    currency: {
      description: "Currency code for display (e.g., RON, EUR, USD)",
      control: "text",
    },
  },
} satisfies Meta<typeof KPISummaryRow>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with diverse metrics.
 * Shows balanced KPI summary with realistic values across all invoices.
 */
export const Default: Story = {
  args: {
    data: computeKPIs(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Default KPI summary showing comprehensive metrics from mock invoice dataset.",
      },
    },
  },
};

/**
 * Single invoice - minimal data.
 * Shows KPI summary for just one invoice.
 */
export const SingleInvoice: Story = {
  args: {
    data: computeKPIs(singleInvoice),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal KPI state with only one invoice in the system.",
      },
    },
  },
};

/**
 * Empty state - no invoices.
 * Shows KPI row when no data is available.
 */
export const Empty: Story = {
  args: {
    data: computeKPIs(emptyInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state showing zero values when no invoices exist.",
      },
    },
  },
};

/**
 * High spending volume.
 * Demonstrates KPIs for heavy spender with many invoices.
 */
export const HighVolume: Story = {
  args: {
    data: computeKPIs(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "High-volume scenario showing significant spending and invoice counts.",
      },
    },
  },
};

/**
 * EUR currency display.
 * Shows KPI summary in euros.
 */
export const EuroCurrency: Story = {
  args: {
    data: computeKPIs(mockInvoices),
    currency: "EUR",
  },
  parameters: {
    docs: {
      description: {
        story: "KPI summary displayed in EUR for European users.",
      },
    },
  },
};

/**
 * USD currency display.
 * Shows KPI summary in US dollars.
 */
export const UsdCurrency: Story = {
  args: {
    data: computeKPIs(mockInvoices),
    currency: "USD",
  },
  parameters: {
    docs: {
      description: {
        story: "KPI summary displayed in USD for international users.",
      },
    },
  },
};

/**
 * Few invoices - early user.
 * Shows KPIs for user with limited invoice history.
 */
export const FewInvoices: Story = {
  args: {
    data: computeKPIs(mockInvoices.slice(0, 3)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Early-stage user scenario with only a few invoices recorded.",
      },
    },
  },
};

/**
 * Many items per invoice.
 * Demonstrates high average items per invoice scenario.
 */
export const HighItemAverage: Story = {
  args: {
    data: computeKPIs(mockInvoices.filter((inv) => inv.items.length > 5)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows KPIs when users purchase many items per invoice (bulk shoppers).",
      },
    },
  },
};
