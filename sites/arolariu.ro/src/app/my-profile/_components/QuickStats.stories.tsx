import type {Meta, StoryObj} from "@storybook/react";
import {QuickStats} from "./QuickStats";

/**
 * Quick statistics dashboard showing key user metrics:
 * total invoices, merchants, scans, money saved, monthly average,
 * AI queries used, and a storage usage progress bar.
 * Uses the `Profile.stats` i18n namespace.
 */
const meta = {
  title: "Pages/Profile/QuickStats",
  component: QuickStats,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof QuickStats>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Stats dashboard with sample data — moderate usage. */
export const Default: Story = {
  args: {
    statistics: {
      totalInvoices: 42,
      totalMerchants: 15,
      totalScans: 67,
      totalSaved: 1234.56,
      monthlyAverage: 345.67,
      aiQueriesUsed: 128,
      storageUsed: 52_428_800,
      storageLimit: 536_870_912,
    },
  },
};

/** Stats dashboard for a new user — empty state. */
export const NewUser: Story = {
  args: {
    statistics: {
      totalInvoices: 0,
      totalMerchants: 0,
      totalScans: 0,
      totalSaved: 0,
      monthlyAverage: 0,
      aiQueriesUsed: 0,
      storageUsed: 0,
      storageLimit: 536_870_912,
    },
  },
};

/** Stats dashboard for a power user — heavy usage. */
export const PowerUser: Story = {
  args: {
    statistics: {
      totalInvoices: 1250,
      totalMerchants: 200,
      totalScans: 3400,
      totalSaved: 45_678.9,
      monthlyAverage: 2_500.0,
      aiQueriesUsed: 9800,
      storageUsed: 480_000_000,
      storageLimit: 536_870_912,
    },
  },
};
/** Stats dashboard with all zeroes — brand new user with no activity. */
export const ZeroStats: Story = {
  args: {
    statistics: {
      totalInvoices: 0,
      totalMerchants: 0,
      totalScans: 0,
      totalSaved: 0,
      monthlyAverage: 0,
      aiQueriesUsed: 0,
      storageUsed: 0,
      storageLimit: 536_870_912,
    },
  },
};
