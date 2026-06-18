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

type StoryArgs = {data: QuantityData[]; currency: string};

/**
 * ItemsBreakdownChart renders a horizontal bar chart showing
 * the price breakdown of individual items on an invoice.
 * Each bar is colored uniquely using Recharts Cell components.
 */
const meta = {
  title: "arolariu.ro/IMS/Charts/Products/ItemsBreakdownChart",
  component: ItemsBreakdownChart,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    data: {control: "object"},
    currency: {control: "text"},
  },
  args: {
    data: generateMockQuantityData(5),
    currency: "RON",
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Default with 5 items in RON. */
export const Default: Story = {};

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

/** High volume — 20+ items to stress test chart density. */
export const HighVolume: Story = {
  args: {
    data: [
      ...generateMockQuantityData(10),
      ...[
        "Yogurt",
        "Salmon",
        "Olive Oil",
        "Honey",
        "Almonds",
        "Spinach",
        "Avocado",
        "Granola",
        "Juice",
        "Chocolate",
        "Bananas",
        "Peppers",
      ].map((name) => ({
        name,
        quantity: faker.number.int({min: 1, max: 10}),
        unit: faker.helpers.arrayElement(["kg", "pcs", "L", "g"]),
        price: faker.number.float({min: 2, max: 80, fractionDigits: 2}),
      })),
    ],
    currency: "RON",
  },
};

/** Long product names — test label truncation in Y-axis. */
export const LongProductNames: Story = {
  args: {
    data: [
      {
        name: "Organic Grass-Fed Free-Range Whole Milk",
        quantity: 2,
        unit: "L",
        price: 18.5,
      },
      {
        name: "Artisan Sourdough Multi-Grain Bread Loaf",
        quantity: 1,
        unit: "pcs",
        price: 12.99,
      },
      {
        name: "Premium Wild-Caught Atlantic Salmon Fillet",
        quantity: 0.5,
        unit: "kg",
        price: 45.0,
      },
    ],
    currency: "EUR",
  },
};

/** Very high volume — 30+ items to stress test chart scrolling. */
export const VeryHighVolume: Story = {
  args: {
    data: Array.from({length: 30}, (_, i) => ({
      name: `Product ${String(i + 1).padStart(2, "0")}`,
      quantity: faker.number.int({min: 1, max: 10}),
      unit: faker.helpers.arrayElement(["kg", "pcs", "L", "g"]),
      price: faker.number.float({min: 2, max: 80, fractionDigits: 2}),
    })),
    currency: "RON",
  },
};

/** Three items — minimal balanced view. */
export const ThreeItems: Story = {
  args: {
    data: generateMockQuantityData(3),
    currency: "RON",
  },
};
