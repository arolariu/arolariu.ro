import type {Meta, StoryObj} from "@storybook/react";
import {NextIntlClientProvider} from "next-intl";
import messages from "../../../../../../../../messages/en.json";
import {ComparisonStatsCard} from "./ComparisonStatsCard";

/**
 * ComparisonStatsCard compares the current invoice against historical averages,
 * showing spending range, item count, and same-merchant comparisons.
 */
const meta = {
  title: "Invoices/ViewInvoice/ComparisonStatsCard",
  component: ComparisonStatsCard,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <NextIntlClientProvider
        locale="en"
        messages={messages}
        timeZone="Europe/Bucharest">
        <div className="max-w-lg">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
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
