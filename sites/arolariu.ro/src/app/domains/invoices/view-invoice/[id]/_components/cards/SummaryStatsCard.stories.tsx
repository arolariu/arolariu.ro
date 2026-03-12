import type {Meta, StoryObj} from "@storybook/react";
import {SummaryStatsCard} from "./SummaryStatsCard";

/**
 * SummaryStatsCard displays key statistics for an invoice including total items,
 * categories, average price, tax rate, and extreme price items.
 */
const meta = {
  title: "Invoices/ViewInvoice/Cards/SummaryStats",
  component: SummaryStatsCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SummaryStatsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default summary stats with typical grocery invoice data. */
export const Default: Story = {
  args: {
    currency: "USD",
    summary: {
      totalItems: 12,
      uniqueCategories: 4,
      averageItemPrice: 8.75,
      totalAmount: 105.0,
      taxPercentage: 19.0,
      taxAmount: 15.5,
      highestItem: {name: "Fresh Salmon Fillet", price: 24.99},
      lowestItem: {name: "Baguette", price: 1.2},
    },
  },
};

/** Small invoice with few items. */
export const SmallInvoice: Story = {
  args: {
    currency: "EUR",
    summary: {
      totalItems: 3,
      uniqueCategories: 2,
      averageItemPrice: 4.33,
      totalAmount: 13.0,
      taxPercentage: 9.0,
      taxAmount: 1.17,
      highestItem: {name: "Organic Milk", price: 5.99},
      lowestItem: {name: "Bread Roll", price: 0.89},
    },
  },
};

/** Large invoice with many items and high tax. */
export const LargeInvoice: Story = {
  args: {
    currency: "RON",
    summary: {
      totalItems: 45,
      uniqueCategories: 8,
      averageItemPrice: 22.5,
      totalAmount: 1012.5,
      taxPercentage: 24.0,
      taxAmount: 195.0,
      highestItem: {name: "Premium Olive Oil 1L", price: 89.99},
      lowestItem: {name: "Salt 500g", price: 2.49},
    },
  },
};

/** Edge case — invoice with zero items. */
export const ZeroItems: Story = {
  args: {
    currency: "USD",
    summary: {
      totalItems: 0,
      uniqueCategories: 0,
      averageItemPrice: 0,
      totalAmount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      highestItem: {name: "N/A", price: 0},
      lowestItem: {name: "N/A", price: 0},
    },
  },
};
