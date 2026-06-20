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

type StoryArgs = {data: SpendingTrendData[]; currency: string};

/**
 * SpendingTrendChart renders an area chart showing spending
 * over time with a highlighted reference dot for the current
 * invoice. Uses Recharts AreaChart with gradient fill.
 */
const meta = {
  title: "arolariu.ro/IMS/Charts/Invoice/SpendingTrendChart",
  component: SpendingTrendChart,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    data: {control: "object"},
    currency: {control: "text"},
  },
  args: {
    data: generateMockSpendingTrend(10),
    currency: "RON",
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Default with 10 data points, last one is current. */
export const Default: Story = {};

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

/** Two data points — minimal trend for comparison. */
export const TwoDataPoints: Story = {
  args: {
    data: [
      {date: "Jan 5", amount: 78.5, isCurrent: false, name: "First Purchase", invoices: []},
      {date: "Jan 20", amount: 142.3, isCurrent: true, name: "Second Purchase", invoices: []},
    ],
    currency: "RON",
  },
};

/** Very high volume — 36 data points to stress test chart density. */
export const VeryHighVolume: Story = {
  args: {
    data: generateMockSpendingTrend(36),
    currency: "RON",
  },
};

/** Three data points — minimal progression view. */
export const ThreeDataPoints: Story = {
  args: {
    data: generateMockSpendingTrend(3),
    currency: "RON",
  },
};

/** All zero amounts — no spending baseline. */
export const ZeroAmounts: Story = {
  args: {
    data: [
      {date: "Jan 5", amount: 0, isCurrent: false, name: "No Spending 1", invoices: []},
      {date: "Jan 12", amount: 0, isCurrent: false, name: "No Spending 2", invoices: []},
      {date: "Jan 19", amount: 0, isCurrent: true, name: "No Spending 3", invoices: []},
      {date: "Jan 26", amount: 0, isCurrent: false, name: "No Spending 4", invoices: []},
    ],
    currency: "RON",
  },
};

/** Flat identical amounts — constant spending over time. */
export const FlatSpending: Story = {
  args: {
    data: [
      {date: "Week 1", amount: 100.0, isCurrent: false, name: "Regular Purchase 1", invoices: []},
      {date: "Week 2", amount: 100.0, isCurrent: false, name: "Regular Purchase 2", invoices: []},
      {date: "Week 3", amount: 100.0, isCurrent: false, name: "Regular Purchase 3", invoices: []},
      {date: "Week 4", amount: 100.0, isCurrent: true, name: "Regular Purchase 4", invoices: []},
      {date: "Week 5", amount: 100.0, isCurrent: false, name: "Regular Purchase 5", invoices: []},
    ],
    currency: "EUR",
  },
};

/** Downward trend — decreasing spending over time. */
export const DownwardTrend: Story = {
  args: {
    data: Array.from({length: 8}, (_, i) => ({
      date: `Week ${i + 1}`,
      amount: 350 - i * 35 + faker.number.float({min: 0, max: 15, fractionDigits: 2}),
      isCurrent: i === 7,
      name: `Purchase ${i + 1}`,
      invoices: [],
    })),
    currency: "RON",
  },
};

/** Volatile — extreme fluctuations between periods. */
export const VolatileSpending: Story = {
  args: {
    data: [
      {date: "Jan", amount: 50.0, isCurrent: false, name: "Low Month", invoices: []},
      {date: "Feb", amount: 450.0, isCurrent: false, name: "Spike Month", invoices: []},
      {date: "Mar", amount: 80.0, isCurrent: false, name: "Low Month", invoices: []},
      {date: "Apr", amount: 520.0, isCurrent: false, name: "High Month", invoices: []},
      {date: "May", amount: 60.0, isCurrent: true, name: "Current Low", invoices: []},
    ],
    currency: "USD",
  },
};

/** GBP currency with gradual increase. */
export const GbpCurrency: Story = {
  args: {
    data: Array.from({length: 6}, (_, i) => ({
      date: `Month ${i + 1}`,
      amount: 80 + i * 20 + faker.number.float({min: 0, max: 10, fractionDigits: 2}),
      isCurrent: i === 5,
      name: `Monthly Shop ${i + 1}`,
      invoices: [],
    })),
    currency: "GBP",
  },
};

/** Ultra-dense — 60+ data points to test extreme area chart density. */
export const UltraDense: Story = {
  args: {
    data: generateMockSpendingTrend(60),
    currency: "RON",
  },
};

/** Current at start — earliest invoice is highlighted. */
export const CurrentAtStart: Story = {
  args: {
    data: generateMockSpendingTrend(10, 0),
    currency: "EUR",
  },
};

/** Bimodal trend — two spending peaks with valley. */
export const BimodalTrend: Story = {
  args: {
    data: [
      {date: "Jan", amount: 250.0, isCurrent: false, name: "Peak 1", invoices: []},
      {date: "Feb", amount: 100.0, isCurrent: false, name: "Valley", invoices: []},
      {date: "Mar", amount: 85.0, isCurrent: false, name: "Low", invoices: []},
      {date: "Apr", amount: 110.0, isCurrent: false, name: "Valley", invoices: []},
      {date: "May", amount: 280.0, isCurrent: true, name: "Peak 2", invoices: []},
    ],
    currency: "RON",
  },
};

/** Mixed zero and non-zero amounts — intermittent spending. */
export const MixedZeroAndNonZero: Story = {
  args: {
    data: [
      {date: "Week 1", amount: 125.5, isCurrent: false, name: "Active Week 1", invoices: []},
      {date: "Week 2", amount: 0, isCurrent: false, name: "No Spending", invoices: []},
      {date: "Week 3", amount: 0, isCurrent: false, name: "No Spending", invoices: []},
      {date: "Week 4", amount: 185.0, isCurrent: false, name: "Active Week 4", invoices: []},
      {date: "Week 5", amount: 0, isCurrent: false, name: "No Spending", invoices: []},
      {date: "Week 6", amount: 98.5, isCurrent: true, name: "Current Week", invoices: []},
    ],
    currency: "EUR",
  },
};

/** Stepped increase — clear spending level shifts. */
export const SteppedIncrease: Story = {
  args: {
    data: [
      {date: "Phase 1", amount: 50.0, isCurrent: false, name: "Low Budget", invoices: []},
      {date: "Phase 1B", amount: 52.0, isCurrent: false, name: "Low Budget", invoices: []},
      {date: "Phase 2", amount: 100.0, isCurrent: false, name: "Medium Budget", invoices: []},
      {date: "Phase 2B", amount: 105.0, isCurrent: false, name: "Medium Budget", invoices: []},
      {date: "Phase 3", amount: 200.0, isCurrent: false, name: "High Budget", invoices: []},
      {date: "Phase 3B", amount: 195.0, isCurrent: true, name: "High Budget", invoices: []},
    ],
    currency: "USD",
  },
};
