import type {Meta, StoryObj} from "@storybook/react";
import type {KPIData} from "../../../_utils/statistics";
import {computeKPIs} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {KPISummaryRow} from "./KPISummaryRow";

type StoryArgs = {data: KPIData; currency: string};

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
  title: "arolariu.ro/IMS/Statistics/Invoice/KPISummaryRow",
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
    data: {control: "object"},
    currency: {control: "text"},
  },
  args: {
    data: computeKPIs(mockInvoices),
    currency: "RON",
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default view with diverse metrics.
 * Shows KPI summary with realistic values across all invoices.
 */
export const Default: Story = {
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
 * RON currency display (alternative label).
 * Shows KPI summary with RON label (data is always RON-normalized).
 */
export const ExplicitRON: Story = {
  args: {
    data: computeKPIs(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "KPI summary with explicit RON label. All aggregate data is RON-normalized.",
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

/** Two invoices — minimal but non-empty KPI state. */
export const TwoInvoices: Story = {
  args: {
    data: computeKPIs(mockInvoices.slice(0, 2)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal KPI state with exactly two invoices for baseline comparison.",
      },
    },
  },
};

/** Three invoices — early adopter scenario. */
export const ThreeInvoices: Story = {
  args: {
    data: computeKPIs(mockInvoices.slice(0, 3)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Early user scenario with exactly three invoices.",
      },
    },
  },
};

/** Four invoices — minimal active user. */
export const FourInvoices: Story = {
  args: {
    data: computeKPIs(mockInvoices.slice(0, 4)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal active user with exactly four invoices recorded.",
      },
    },
  },
};

/** Five invoices — growing user base. */
export const FiveInvoices: Story = {
  args: {
    data: computeKPIs(mockInvoices.slice(0, 5)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Growing user with exactly five invoices.",
      },
    },
  },
};

/** High total spending — heavy spender KPIs. */
export const HighTotalSpending: Story = {
  args: {
    data: computeKPIs(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "KPIs showing significant total spending from full dataset.",
      },
    },
  },
};

/** Low item average — few items per invoice. */
export const LowItemAverage: Story = {
  args: {
    data: computeKPIs(mockInvoices.filter((inv) => inv.items.length <= 3)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows KPIs when users purchase very few items per invoice.",
      },
    },
  },
};

/** EUR currency KPIs — Euro display label. */
export const EurCurrencyKPIs: Story = {
  args: {
    data: computeKPIs(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "EUR")),
    currency: "EUR",
  },
  parameters: {
    docs: {
      description: {
        story: "KPI summary with EUR currency label for Euro-based invoices.",
      },
    },
  },
};

/** Dense invoice dataset — many invoices scenario. */
export const DenseInvoiceDataset: Story = {
  args: {
    data: computeKPIs(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "KPIs computed from dense invoice dataset (30+ invoices).",
      },
    },
  },
};
