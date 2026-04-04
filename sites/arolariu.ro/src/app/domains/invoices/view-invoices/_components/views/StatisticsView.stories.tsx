import {InvoiceBuilder} from "@/data/mocks";
import type {Meta, StoryObj} from "@storybook/react";
import RenderStatisticsView from "./StatisticsView";

/**
 * StatisticsView renders a comprehensive analytics dashboard for invoices.
 * Features KPI cards, spending trends, category breakdowns, merchant leaderboards,
 * and time-based analytics. Uses the `IMS--Stats` i18n namespace.
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
  title: "Invoices/ViewInvoices/Views/StatisticsView",
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
