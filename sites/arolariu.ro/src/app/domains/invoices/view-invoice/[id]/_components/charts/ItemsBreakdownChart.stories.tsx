import {faker} from "@faker-js/faker";
import type {Meta, StoryObj} from "@storybook/react";
import type {QuantityData} from "../../_utils/analytics";
import {ItemsBreakdownChart} from "./ItemsBreakdownChart";

faker.seed(42);

function generateMockQuantityData(count: number): QuantityData[] {
  const items = ["Milk", "Bread", "Chicken", "Apples", "Rice", "Eggs", "Butter", "Cheese", "Tomatoes", "Pasta"];
  return items.slice(0, count).map((name) => ({
    name,
    quantity: faker.number.int({min: 1, max: 10}),
    unit: faker.helpers.arrayElement(["kg", "pcs", "L", "g"]),
    price: faker.number.float({min: 2, max: 80, fractionDigits: 2}),
  }));
}

/**
 * ItemsBreakdownChart renders a horizontal bar chart showing
 * the price breakdown of individual items on an invoice.
 * Each bar is colored uniquely using Recharts Cell components.
 */
const meta = {
  title: "Invoices/ViewInvoice/Charts/ItemsBreakdownChart",
  component: ItemsBreakdownChart,
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
} satisfies Meta<typeof ItemsBreakdownChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default with 5 items in RON. */
export const Default: Story = {
  args: {
    data: generateMockQuantityData(5),
    currency: "RON",
  },
};

/** Few items — minimalist chart. */
export const FewItems: Story = {
  args: {
    data: generateMockQuantityData(2),
    currency: "EUR",
  },
};

/** Many items — dense chart with 10 bars. */
export const ManyItems: Story = {
  args: {
    data: generateMockQuantityData(10),
    currency: "RON",
  },
};

/** Dark mode variant. */
export const DarkMode: Story = {
  args: {
    data: generateMockQuantityData(5),
    currency: "RON",
  },
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  args: {
    data: generateMockQuantityData(5),
    currency: "RON",
  },
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};

/** Empty data — no items available. */
export const EmptyData: Story = {
  args: {
    data: [],
    currency: "RON",
  },
};

/** Single data point — only one item. */
export const SingleDataPoint: Story = {
  args: {
    data: [{name: "Milk", quantity: 2, unit: "L", price: 12.5}],
    currency: "RON",
  },
};
