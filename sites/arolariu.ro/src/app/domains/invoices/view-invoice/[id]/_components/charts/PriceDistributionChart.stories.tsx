import type {Meta, StoryObj} from "@storybook/react";
import type {PriceRange} from "../../_utils/analytics";
import {PriceDistributionChart} from "./PriceDistributionChart";

const mockPriceRanges: PriceRange[] = [
  {range: "Under 10", count: 5, fill: "var(--chart-1)"},
  {range: "10-25", count: 8, fill: "var(--chart-2)"},
  {range: "25-50", count: 3, fill: "var(--chart-3)"},
  {range: "50+", count: 2, fill: "var(--chart-4)"},
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
    data: [{range: "10-25", count: 12, fill: "var(--chart-2)"}],
    currency: "EUR",
  },
};

/** Skewed distribution — most items are cheap. */
export const SkewedCheap: Story = {
  args: {
    data: [
      {range: "Under 10", count: 15, fill: "var(--chart-1)"},
      {range: "10-25", count: 3, fill: "var(--chart-2)"},
      {range: "50+", count: 1, fill: "var(--chart-4)"},
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

/** Dark mode variant. */
export const DarkMode: Story = {
  args: {
    data: mockPriceRanges,
    currency: "RON",
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  args: {
    data: mockPriceRanges,
    currency: "RON",
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
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
    data: [{range: "10-25", count: 7, fill: "var(--chart-2)"}],
    currency: "RON",
  },
};
