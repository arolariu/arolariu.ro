import {faker} from "@faker-js/faker";
import type {Meta, StoryObj} from "@storybook/react";
import type {SpendingTrendData} from "../../_utils/analytics";
import {SpendingTrendChart} from "./SpendingTrendChart";

faker.seed(42);

function generateMockSpendingTrend(count: number, currentIndex?: number): SpendingTrendData[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return Array.from({length: count}, (_, i) => ({
    date: `${months[i % 12]} ${faker.number.int({min: 1, max: 28})}`,
    amount: faker.number.float({min: 30, max: 500, fractionDigits: 2}),
    isCurrent: i === (currentIndex ?? count - 1),
    name: faker.commerce.productName(),
    invoices: [],
  }));
}

/**
 * SpendingTrendChart renders an area chart showing spending
 * over time with a highlighted reference dot for the current
 * invoice. Uses Recharts AreaChart with gradient fill.
 */
const meta = {
  title: "Invoices/ViewInvoice/Charts/SpendingTrendChart",
  component: SpendingTrendChart,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SpendingTrendChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default with 10 data points, last one is current. */
export const Default: Story = {
  args: {
    data: generateMockSpendingTrend(10),
    currency: "RON",
  },
};

/** Few data points — sparse trend. */
export const FewPoints: Story = {
  args: {
    data: generateMockSpendingTrend(3),
    currency: "EUR",
  },
};

/** Many data points — dense trend over a year. */
export const YearlyTrend: Story = {
  args: {
    data: generateMockSpendingTrend(12),
    currency: "RON",
  },
};

/** Current invoice in the middle of the timeline. */
export const MidpointCurrent: Story = {
  args: {
    data: generateMockSpendingTrend(8, 4),
    currency: "RON",
  },
};

/** Upward spending trend. */
export const UpwardTrend: Story = {
  args: {
    data: Array.from({length: 8}, (_, i) => ({
      date: `Week ${i + 1}`,
      amount: 50 + i * 40 + faker.number.float({min: 0, max: 20, fractionDigits: 2}),
      isCurrent: i === 7,
      name: `Purchase ${i + 1}`,
      invoices: [],
    })),
    currency: "RON",
  },
};
/** Empty data — no spending trend available. */
export const EmptyData: Story = {
  args: {
    data: [],
    currency: "RON",
  },
};

/** Single data point — only one spending entry. */
export const SingleDataPoint: Story = {
  args: {
    data: [{date: "Jan 15", amount: 125.5, isCurrent: true, name: "Kaufland Groceries", invoices: []}],
    currency: "RON",
  },
};

/** High volume — 24 data points to stress test chart density. */
export const HighVolume: Story = {
  args: {
    data: generateMockSpendingTrend(24),
    currency: "RON",
  },
};
