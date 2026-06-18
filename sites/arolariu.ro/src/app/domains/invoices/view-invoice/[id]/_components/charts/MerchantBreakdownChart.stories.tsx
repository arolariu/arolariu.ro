import {faker} from "@faker-js/faker";
import type {Meta, StoryObj} from "@storybook/react";
import type {MerchantBreakdown} from "../../_utils/analytics";
import {MerchantBreakdownChart} from "./MerchantBreakdownChart";

faker.seed(42);

function generateMockMerchantData(count: number): MerchantBreakdown[] {
  return Array.from({length: count}, () => {
    const total = faker.number.float({min: 50, max: 800, fractionDigits: 2});
    const visitCount = faker.number.int({min: 1, max: 15});
    return {
      name: faker.company.name(),
      count: visitCount,
      total,
      average: Math.round((total / visitCount) * 100) / 100,
    };
  });
}

type StoryArgs = {data: MerchantBreakdown[]; currency: string; currentMerchant: string};

const mockData = generateMockMerchantData(5);
const currentMerchant = mockData[0]?.name ?? "Lidl";

/**
 * MerchantBreakdownChart renders a vertical bar chart comparing
 * total spending across different merchants. The current merchant
 * is highlighted with the primary color.
 */
const meta = {
  title: "arolariu.ro/IMS/Charts/Merchant/MerchantBreakdownChart",
  component: MerchantBreakdownChart,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    data: {control: "object"},
    currency: {control: "text"},
    currentMerchant: {control: "text"},
  },
  args: {
    data: mockData,
    currency: "RON",
    currentMerchant,
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Default with 5 merchants, one highlighted. */
export const Default: Story = {};

/** Single merchant — minimal chart. */
export const SingleMerchant: Story = {
  args: {
    data: generateMockMerchantData(1),
    currency: "EUR",
    currentMerchant: "Solo Store",
  },
};

/** Many merchants — 8 bars for dense comparison. */
export const ManyMerchants: Story = {
  args: {
    data: generateMockMerchantData(8),
    currency: "RON",
    currentMerchant: "Other Store",
  },
};
/** Empty data — no merchants available. */
export const EmptyData: Story = {
  args: {
    data: [],
    currency: "RON",
    currentMerchant: "",
  },
};

/** Single data point — only one merchant. */
export const SingleDataPoint: Story = {
  args: {
    data: [{name: "Kaufland", count: 3, total: 245.5, average: 81.83}],
    currency: "RON",
    currentMerchant: "Kaufland",
  },
};

/** High volume — 20+ merchants to stress test chart density. */
export const HighVolume: Story = {
  args: {
    data: generateMockMerchantData(22),
    currency: "RON",
    currentMerchant: "Highlighted Store",
  },
};

/** Long merchant names — test label truncation in chart. */
export const LongMerchantNames: Story = {
  args: {
    data: [
      {
        name: "International Premium Organic Foods & Beverages Supermarket Chain",
        count: 5,
        total: 350.75,
        average: 70.15,
      },
      {
        name: "Artisan Local Farm-to-Table Specialty Grocery Store",
        count: 3,
        total: 189.5,
        average: 63.17,
      },
      {name: "Budget Discount Wholesale Warehouse Club", count: 7, total: 420.0, average: 60.0},
    ],
    currency: "RON",
    currentMerchant: "Artisan Local Farm-to-Table Specialty Grocery Store",
  },
};

/** Very high volume — 40+ merchants to stress test chart scrolling. */
export const VeryHighVolume: Story = {
  args: {
    data: generateMockMerchantData(40),
    currency: "RON",
    currentMerchant: "Store #15",
  },
};

/** Three merchants — minimal balanced comparison. */
export const ThreeMerchants: Story = {
  args: {
    data: generateMockMerchantData(3),
    currency: "RON",
    currentMerchant: "Store",
  },
};

/** All zero visit counts — edge case for average calculation. */
export const ZeroVisitCounts: Story = {
  args: {
    data: [
      {name: "Kaufland", count: 0, total: 0, average: 0},
      {name: "Lidl", count: 0, total: 0, average: 0},
      {name: "Carrefour", count: 0, total: 0, average: 0},
    ],
    currency: "RON",
    currentMerchant: "Kaufland",
  },
};

/** Flat identical totals — all merchants have same spending. */
export const FlatIdenticalTotals: Story = {
  args: {
    data: [
      {name: "Kaufland", count: 5, total: 100.0, average: 20.0},
      {name: "Lidl", count: 5, total: 100.0, average: 20.0},
      {name: "Mega Image", count: 5, total: 100.0, average: 20.0},
      {name: "Auchan", count: 5, total: 100.0, average: 20.0},
    ],
    currency: "EUR",
    currentMerchant: "Lidl",
  },
};

/** Extreme outlier — one merchant dominates total spending. */
export const ExtremeTotalOutlier: Story = {
  args: {
    data: [
      {name: "Premium Supermarket", count: 15, total: 2450.75, average: 163.38},
      {name: "Budget Store", count: 8, total: 120.5, average: 15.06},
      {name: "Local Market", count: 3, total: 45.0, average: 15.0},
    ],
    currency: "RON",
    currentMerchant: "Premium Supermarket",
  },
};

/** GBP currency with highlighted merchant. */
export const GbpCurrency: Story = {
  args: {
    data: [
      {name: "Tesco", count: 8, total: 245.5, average: 30.69},
      {name: "Sainsbury's", count: 5, total: 178.3, average: 35.66},
      {name: "Waitrose", count: 3, total: 156.0, average: 52.0},
      {name: "Asda", count: 10, total: 189.9, average: 18.99},
    ],
    currency: "GBP",
    currentMerchant: "Sainsbury's",
  },
};

/** Ultra-dense — 60+ merchants to test extreme chart density. */
export const UltraDense: Story = {
  args: {
    data: generateMockMerchantData(60),
    currency: "RON",
    currentMerchant: "Store #25",
  },
};

/** Single-visit merchants — multiple merchants with only one visit each. */
export const SingleVisitMerchants: Story = {
  args: {
    data: [
      {name: "Local Bakery", count: 1, total: 28.5, average: 28.5},
      {name: "Farmers Market", count: 1, total: 45.0, average: 45.0},
      {name: "Corner Store", count: 1, total: 15.75, average: 15.75},
      {name: "Specialty Shop", count: 1, total: 67.9, average: 67.9},
    ],
    currency: "USD",
    currentMerchant: "Farmers Market",
  },
};
