import {InvoiceBuilder} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import RenderStatisticsView from "./StatisticsView";

/**
 * StatisticsView renders a comprehensive analytics dashboard for invoices.
 * Features KPI cards, spending trends, category breakdowns, merchant leaderboards,
 * and time-based analytics. Uses the `cards.invoices.statistics` i18n namespace.
 *
 * **Components:**
 * - KPI Summary Row (total spending, invoice count, top merchant, average items)
 * - Spending Over Time Chart (monthly trend area chart)
 * - Category Breakdown (donut pie chart)
 * - Merchant Leaderboard (horizontal bar chart)
 * - Month-over-Month Comparison Cards
 * - Price Distribution (vertical bar chart)
 * - Time of Day Analysis (radar chart)
 */
const meta = {
  title: "arolariu.ro/IMS/Views/StatisticsView",
  component: RenderStatisticsView,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof RenderStatisticsView>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty state - no invoices uploaded yet. */
export const Empty: Story = {
  args: {
    invoices: [],
  },
};

/** Single invoice - minimal data for edge case testing. */
export const SingleInvoice: Story = {
  args: {
    invoices: [new InvoiceBuilder().build()],
  },
};

/** Rich dataset - multiple invoices across different categories and time periods. */
export const WithData: Story = {
  args: {
    invoices: [
      new InvoiceBuilder().withCategory(100).build(), // Grocery
      new InvoiceBuilder().withCategory(200).build(), // Fast Food
      new InvoiceBuilder().withCategory(100).build(), // Grocery
      new InvoiceBuilder().withCategory(300).build(), // Home Cleaning
      new InvoiceBuilder().withCategory(100).build(), // Grocery
      new InvoiceBuilder().withCategory(400).build(), // Car/Auto
      new InvoiceBuilder().withCategory(200).build(), // Fast Food
      new InvoiceBuilder().withCategory(100).build(), // Grocery
      new InvoiceBuilder().withCategory(100).build(), // Grocery
      new InvoiceBuilder().withCategory(200).build(), // Fast Food
    ],
  },
};

/** Large dataset - stress testing with many invoices. */
export const LargeDataset: Story = {
  args: {
    invoices: Array.from({length: 50}, () => new InvoiceBuilder().build()),
  },
};

/** Huge dataset (100 invoices) — performance stress test. */
export const HugeDataset: Story = {
  args: {
    invoices: Array.from({length: 100}, (_, i) => new InvoiceBuilder().withCategory(((i % 5) * 100) as 100 | 200 | 300 | 400).build()),
  },
  parameters: {
    docs: {
      description: {
        story:
          "Statistics view with 100 invoices. Tests chart rendering performance, data aggregation, and overflow handling with large data sets.",
      },
    },
  },
};

/** Two invoices — minimal viable statistics. */
export const TwoInvoices: Story = {
  args: {
    invoices: [new InvoiceBuilder().withCategory(100).build(), new InvoiceBuilder().withCategory(200).build()],
  },
  parameters: {
    docs: {
      description: {
        story:
          "Statistics view with two invoices. Tests minimal data rendering, chart display with limited data points, and edge case handling.",
      },
    },
  },
};

/** Five invoices across different categories. */
export const FiveInvoices: Story = {
  args: {
    invoices: [
      new InvoiceBuilder().withCategory(100).build(),
      new InvoiceBuilder().withCategory(200).build(),
      new InvoiceBuilder().withCategory(300).build(),
      new InvoiceBuilder().withCategory(400).build(),
      new InvoiceBuilder().withCategory(100).build(),
    ],
  },
  parameters: {
    docs: {
      description: {
        story: "Statistics view with five invoices across four categories. Tests category distribution charts with small data set.",
      },
    },
  },
};

/** Thirty invoices — medium data set. */
export const MediumDataset: Story = {
  args: {
    invoices: Array.from({length: 30}, (_, i) => new InvoiceBuilder().withCategory(((i % 4) * 100) as 100 | 200 | 300 | 400).build()),
  },
  parameters: {
    docs: {
      description: {
        story: "Statistics view with 30 invoices. Tests chart rendering and data aggregation with medium-sized data set.",
      },
    },
  },
};
