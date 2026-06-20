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

/** All zero prices — free items or promotional scenario. */
export const ZeroPrices: Story = {
  args: {
    data: [
      {name: "Milk", quantity: 2, unit: "L", price: 0},
      {name: "Bread", quantity: 1, unit: "pcs", price: 0},
      {name: "Eggs", quantity: 12, unit: "pcs", price: 0},
      {name: "Butter", quantity: 0.25, unit: "kg", price: 0},
    ],
    currency: "RON",
  },
};

/** Flat identical prices — all items same cost. */
export const FlatPrices: Story = {
  args: {
    data: [
      {name: "Milk", quantity: 2, unit: "L", price: 25.0},
      {name: "Bread", quantity: 1, unit: "pcs", price: 25.0},
      {name: "Chicken", quantity: 0.5, unit: "kg", price: 25.0},
      {name: "Apples", quantity: 1.2, unit: "kg", price: 25.0},
      {name: "Rice", quantity: 1, unit: "kg", price: 25.0},
    ],
    currency: "EUR",
  },
};

/** Extreme price outlier — one very expensive item. */
export const ExtremePriceOutlier: Story = {
  args: {
    data: [
      {name: "Premium Caviar", quantity: 0.05, unit: "kg", price: 450.0},
      {name: "Milk", quantity: 2, unit: "L", price: 12.5},
      {name: "Bread", quantity: 1, unit: "pcs", price: 8.0},
      {name: "Eggs", quantity: 10, unit: "pcs", price: 15.5},
    ],
    currency: "RON",
  },
};

/** GBP currency with diverse units. */
export const GbpCurrency: Story = {
  args: {
    data: [
      {name: "Milk", quantity: 2.5, unit: "L", price: 3.2},
      {name: "Chicken Breast", quantity: 0.8, unit: "kg", price: 6.5},
      {name: "Bananas", quantity: 1.2, unit: "kg", price: 1.8},
      {name: "Orange Juice", quantity: 1, unit: "L", price: 2.4},
    ],
    currency: "GBP",
  },
};

/** Ultra-dense — 50+ items to test extreme chart density. */
export const UltraDense: Story = {
  args: {
    data: Array.from({length: 50}, (_, i) => ({
      name: `Item ${String(i + 1).padStart(3, "0")}`,
      quantity: faker.number.int({min: 1, max: 10}),
      unit: faker.helpers.arrayElement(["kg", "pcs", "L", "g"]),
      price: faker.number.float({min: 2, max: 80, fractionDigits: 2}),
    })),
    currency: "RON",
  },
};

/** Sparse fractional quantities — decimal precision test. */
export const FractionalQuantities: Story = {
  args: {
    data: [
      {name: "Parmesan Cheese", quantity: 0.125, unit: "kg", price: 18.75},
      {name: "Smoked Salmon", quantity: 0.35, unit: "kg", price: 42.5},
      {name: "Extra Virgin Olive Oil", quantity: 0.75, unit: "L", price: 28.9},
    ],
    currency: "EUR",
  },
};

/** Mixed zero and non-zero prices — promotional items scenario. */
export const MixedZeroAndNonZero: Story = {
  args: {
    data: [
      {name: "Milk", quantity: 2, unit: "L", price: 12.5},
      {name: "Free Sample Cheese", quantity: 1, unit: "pcs", price: 0},
      {name: "Bread", quantity: 1, unit: "pcs", price: 8.0},
      {name: "Promotional Yogurt", quantity: 3, unit: "pcs", price: 0},
      {name: "Butter", quantity: 0.25, unit: "kg", price: 15.75},
      {name: "Free Coffee Sample", quantity: 1, unit: "pcs", price: 0},
    ],
    currency: "RON",
  },
};

/** Bimodal price distribution — two price clusters. */
export const BimodalPriceDistribution: Story = {
  args: {
    data: [
      {name: "Budget Milk", quantity: 2, unit: "L", price: 8.5},
      {name: "Budget Bread", quantity: 2, unit: "pcs", price: 6.0},
      {name: "Budget Eggs", quantity: 10, unit: "pcs", price: 12.0},
      {name: "Premium Cheese", quantity: 0.3, unit: "kg", price: 75.0},
      {name: "Premium Ham", quantity: 0.2, unit: "kg", price: 68.5},
      {name: "Premium Salmon", quantity: 0.25, unit: "kg", price: 82.0},
    ],
    currency: "EUR",
  },
};

/** All same price — uniform pricing scenario. */
export const UniformPricing: Story = {
  args: {
    data: [
      {name: "Item A", quantity: 1, unit: "pcs", price: 19.99},
      {name: "Item B", quantity: 2, unit: "pcs", price: 19.99},
      {name: "Item C", quantity: 1, unit: "kg", price: 19.99},
      {name: "Item D", quantity: 3, unit: "L", price: 19.99},
      {name: "Item E", quantity: 1, unit: "pcs", price: 19.99},
    ],
    currency: "USD",
  },
};
