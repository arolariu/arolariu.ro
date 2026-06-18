import type {Meta, StoryObj} from "@storybook/react";
import {ComparisonStatsCard} from "./ComparisonStatsCard";

/**
 * ComparisonStatsCard compares the current invoice against historical averages,
 * showing spending range, item count, and same-merchant comparisons.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Invoice/ComparisonStats",
  component: ComparisonStatsCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ComparisonStatsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Typical comparison — slightly above average. */
export const AboveAverage: Story = {
  args: {
    currency: "USD",
    stats: {
      totalInvoices: 25,
      currentAmount: 125.5,
      averageAmount: 98.3,
      percentageDiff: 27.7,
      isAboveAverage: true,
      minAmount: 15,
      maxAmount: 250,
      currentItemCount: 12,
      averageItemCount: 9,
      itemCountDiff: 33.3,
      sameMerchantAvg: 110.0,
      sameMerchantDiff: 14.1,
    },
  },
};

/** Below average spending — good trend. */
export const BelowAverage: Story = {
  args: {
    currency: "EUR",
    stats: {
      totalInvoices: 42,
      currentAmount: 45.0,
      averageAmount: 78.5,
      percentageDiff: -42.7,
      isAboveAverage: false,
      minAmount: 10,
      maxAmount: 200,
      currentItemCount: 5,
      averageItemCount: 8,
      itemCountDiff: -37.5,
      sameMerchantAvg: 65.0,
      sameMerchantDiff: -30.8,
    },
  },
};

/** Near average — stable spending. */
export const NearAverage: Story = {
  args: {
    currency: "RON",
    stats: {
      totalInvoices: 100,
      currentAmount: 150.0,
      averageAmount: 148.5,
      percentageDiff: 1.0,
      isAboveAverage: true,
      minAmount: 50,
      maxAmount: 350,
      currentItemCount: 10,
      averageItemCount: 10,
      itemCountDiff: 0,
      sameMerchantAvg: 155.0,
      sameMerchantDiff: -3.2,
    },
  },
};

/** Significantly above average — high spending alert. */
export const SignificantlyAbove: Story = {
  args: {
    currency: "USD",
    stats: {
      totalInvoices: 30,
      currentAmount: 450.0,
      averageAmount: 150.0,
      percentageDiff: 200.0,
      isAboveAverage: true,
      minAmount: 20,
      maxAmount: 500,
      currentItemCount: 35,
      averageItemCount: 12,
      itemCountDiff: 191.7,
      sameMerchantAvg: 160.0,
      sameMerchantDiff: 181.3,
    },
  },
};

/** Very few invoices for comparison. */
export const LowDataSet: Story = {
  args: {
    currency: "EUR",
    stats: {
      totalInvoices: 3,
      currentAmount: 75.0,
      averageAmount: 60.0,
      percentageDiff: 25.0,
      isAboveAverage: true,
      minAmount: 45,
      maxAmount: 75,
      currentItemCount: 8,
      averageItemCount: 6,
      itemCountDiff: 33.3,
      sameMerchantAvg: 72.0,
      sameMerchantDiff: 4.2,
    },
  },
};

/** Zero previous data — first invoice. */
export const FirstInvoice: Story = {
  args: {
    currency: "USD",
    stats: {
      totalInvoices: 1,
      currentAmount: 125.0,
      averageAmount: 125.0,
      percentageDiff: 0,
      isAboveAverage: false,
      minAmount: 125.0,
      maxAmount: 125.0,
      currentItemCount: 10,
      averageItemCount: 10,
      itemCountDiff: 0,
      sameMerchantAvg: 125.0,
      sameMerchantDiff: 0,
    },
  },
};
