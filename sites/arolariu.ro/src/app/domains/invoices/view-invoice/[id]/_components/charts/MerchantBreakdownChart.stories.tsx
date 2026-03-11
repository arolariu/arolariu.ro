import {faker} from "@faker-js/faker";
import type {Meta, StoryObj} from "@storybook/react";
import type {MerchantBreakdown} from "../../_utils/analytics";
import {MerchantBreakdownChart} from "./MerchantBreakdownChart";

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
  title: "Invoices/Charts/MerchantBreakdownChart",
  component: MerchantBreakdownChart,
  decorators: [
    (Story) => (
      <div className='max-w-lg'>
        <Story />
      </div>
    ),
  ],
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
