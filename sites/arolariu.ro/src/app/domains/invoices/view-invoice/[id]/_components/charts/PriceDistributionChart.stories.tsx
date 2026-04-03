import type {Meta, StoryObj} from "@storybook/react";
import type {PriceRange} from "../../_utils/analytics";
import {PriceDistributionChart} from "./PriceDistributionChart";

const mockPriceRanges: PriceRange[] = [
  {range: "Under 10", count: 5, fill: "var(--ac-chart-1)"},
  {range: "10-25", count: 8, fill: "var(--ac-chart-2)"},
  {range: "25-50", count: 3, fill: "var(--ac-chart-3)"},
  {range: "50+", count: 2, fill: "var(--ac-chart-4)"},
];

/**
 * PriceDistributionChart renders a vertical bar chart showing
 * the distribution of item prices across predefined ranges.
 * Uses Recharts BarChart with color-coded Cell components.
 */
const meta = {
  title: "Invoices/ViewInvoice/Charts/PriceDistributionChart",
  component: PriceDistributionChart,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof PriceDistributionChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default with 4 price ranges in RON. */
export const Default: Story = {
  args: {
    data: mockPriceRanges,
    currency: "RON",
  },
};

/** All items in a single price range. */
export const SingleRange: Story = {
  args: {
    data: [{range: "10-25", count: 12, fill: "var(--ac-chart-2)"}],
    currency: "EUR",
  },
};

/** Skewed distribution — most items are cheap. */
export const SkewedCheap: Story = {
  args: {
    data: [
      {range: "Under 10", count: 15, fill: "var(--ac-chart-1)"},
      {range: "10-25", count: 3, fill: "var(--ac-chart-2)"},
      {range: "50+", count: 1, fill: "var(--ac-chart-4)"},
    ],
    currency: "RON",
  },
};

/** USD currency variant. */
export const UsdCurrency: Story = {
  args: {
    data: mockPriceRanges,
    currency: "USD",
  },
};
/** Empty data — no price ranges available. */
export const EmptyData: Story = {
  args: {
    data: [],
    currency: "RON",
  },
};

/** Single data point — only one price range. */
export const SingleDataPoint: Story = {
  args: {
    data: [{range: "10-25", count: 7, fill: "var(--ac-chart-2)"}],
    currency: "RON",
  },
};

/** High volume — many fine-grained price ranges to stress test chart density. */
export const HighVolume: Story = {
  args: {
    data: [
      {range: "Under 5", count: 12, fill: "var(--ac-chart-1)"},
      {range: "5-10", count: 18, fill: "var(--ac-chart-2)"},
      {range: "10-15", count: 14, fill: "var(--ac-chart-3)"},
      {range: "15-20", count: 9, fill: "var(--ac-chart-4)"},
      {range: "20-30", count: 7, fill: "var(--ac-chart-5)"},
      {range: "30-40", count: 5, fill: "var(--ac-chart-1)"},
      {range: "40-50", count: 3, fill: "var(--ac-chart-2)"},
      {range: "50-75", count: 4, fill: "var(--ac-chart-3)"},
      {range: "75-100", count: 2, fill: "var(--ac-chart-4)"},
      {range: "100-150", count: 1, fill: "var(--ac-chart-5)"},
      {range: "150-200", count: 1, fill: "var(--ac-chart-1)"},
      {range: "200+", count: 1, fill: "var(--ac-chart-2)"},
    ],
    currency: "RON",
  },
};
