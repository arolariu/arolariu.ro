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

/**
 * MerchantBreakdownChart renders a vertical bar chart comparing
 * total spending across different merchants. The current merchant
 * is highlighted with the primary color.
 */
const meta = {
  title: "Invoices/ViewInvoice/Charts/MerchantBreakdownChart",
  component: MerchantBreakdownChart,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof MerchantBreakdownChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockData = generateMockMerchantData(5);
const currentMerchant = mockData[0]?.name ?? "Lidl";

/** Default with 5 merchants, one highlighted. */
export const Default: Story = {
  args: {
    data: mockData,
    currency: "RON",
    currentMerchant,
  },
};

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

/** Dark mode variant. */
export const DarkMode: Story = {
  args: {
    data: mockData,
    currency: "RON",
    currentMerchant,
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  args: {
    data: mockData,
    currency: "RON",
    currentMerchant,
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
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
