import {faker} from "@faker-js/faker";
import type {Meta, StoryObj} from "@storybook/react";
import type {CategorySpending} from "../../_utils/analytics";
import {SpendingByCategoryChart} from "./SpendingByCategoryChart";

faker.seed(42);

function generateMockCategorySpending(count: number): CategorySpending[] {
  const categories = ["Dairy", "Fruits", "Meat", "Beverages", "Baked Goods", "Vegetables", "Cleaning", "Fish"];
  return categories.slice(0, count).map((category, index) => ({
    category,
    amount: faker.number.float({min: 15, max: 250, fractionDigits: 2}),
    count: faker.number.int({min: 1, max: 12}),
    fill: `var(--chart-${(index % 5) + 1})`,
  }));
}

type StoryArgs = {data: CategorySpending[]; currency: string};

/**
 * SpendingByCategoryChart renders a donut (pie) chart showing
 * spending distribution across product categories with a
 * total amount label in the center. Uses Recharts PieChart.
 */
const meta = {
  title: "arolariu.ro/IMS/Charts/Products/SpendingByCategoryChart",
  component: SpendingByCategoryChart,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    data: {control: "object"},
    currency: {control: "text"},
  },
  args: {
    data: generateMockCategorySpending(5),
    currency: "RON",
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Default with 5 categories in RON. */
export const Default: Story = {};

/** Two categories — simple donut. */
export const TwoCategories: Story = {
  args: {
    data: generateMockCategorySpending(2),
    currency: "EUR",
  },
};

/** Many categories — 8 slices for a full donut. */
export const ManyCategories: Story = {
  args: {
    data: generateMockCategorySpending(8),
    currency: "RON",
  },
};

/** Single dominant category. */
export const DominantCategory: Story = {
  args: {
    data: [
      {category: "Groceries", amount: 450.0, count: 25, fill: "var(--ac-chart-1)"},
      {category: "Dairy", amount: 30.5, count: 3, fill: "var(--ac-chart-2)"},
      {category: "Beverages", amount: 18.0, count: 2, fill: "var(--ac-chart-3)"},
    ],
    currency: "RON",
  },
};
/** Empty data — no category spending available. */
export const EmptyData: Story = {
  args: {
    data: [],
    currency: "RON",
  },
};

/** Single data point — only one category. */
export const SingleDataPoint: Story = {
  args: {
    data: [{category: "Groceries", amount: 156.75, count: 8, fill: "var(--ac-chart-1)"}],
    currency: "RON",
  },
};

/** High volume — 20+ categories to stress test donut chart density. */
export const HighVolume: Story = {
  args: {
    data: [
      ...generateMockCategorySpending(8),
      ...[
        "Snacks",
        "Frozen",
        "Personal Care",
        "Condiments",
        "Pasta",
        "Canned",
        "Spices",
        "Baby",
        "Pet Food",
        "Bakery",
        "Deli",
        "Sweets",
      ].map((category, index) => ({
        category,
        amount: faker.number.float({min: 15, max: 250, fractionDigits: 2}),
        count: faker.number.int({min: 1, max: 12}),
        fill: `var(--chart-${((index + 3) % 5) + 1})`,
      })),
    ],
    currency: "RON",
  },
};

/** Long category names — test legend label wrapping. */
export const LongCategoryNames: Story = {
  args: {
    data: [
      {
        category: "Organic Premium Dairy Products",
        amount: 145.5,
        count: 8,
        fill: "var(--ac-chart-1)",
      },
      {
        category: "Fresh Seasonal Fruits & Vegetables",
        amount: 98.75,
        count: 12,
        fill: "var(--ac-chart-2)",
      },
      {
        category: "Artisan Baked Goods & Pastries",
        amount: 67.2,
        count: 5,
        fill: "var(--ac-chart-3)",
      },
    ],
    currency: "RON",
  },
};

/** Very high volume — 30+ categories to stress test donut density. */
export const VeryHighVolume: Story = {
  args: {
    data: Array.from({length: 30}, (_, index) => ({
      category: `Category ${String(index + 1).padStart(2, "0")}`,
      amount: faker.number.float({min: 15, max: 250, fractionDigits: 2}),
      count: faker.number.int({min: 1, max: 12}),
      fill: `var(--ac-chart-${(index % 5) + 1})`,
    })),
    currency: "RON",
  },
};

/** Three categories — minimal balanced donut. */
export const ThreeCategories: Story = {
  args: {
    data: generateMockCategorySpending(3),
    currency: "RON",
  },
};

/** All zero amounts — no spending scenario. */
export const ZeroAmounts: Story = {
  args: {
    data: [
      {category: "Dairy", amount: 0, count: 0, fill: "var(--ac-chart-1)"},
      {category: "Fruits", amount: 0, count: 0, fill: "var(--ac-chart-2)"},
      {category: "Meat", amount: 0, count: 0, fill: "var(--ac-chart-3)"},
    ],
    currency: "RON",
  },
};

/** Flat equal amounts — perfect donut balance. */
export const FlatEqualAmounts: Story = {
  args: {
    data: [
      {category: "Dairy", amount: 50.0, count: 5, fill: "var(--ac-chart-1)"},
      {category: "Fruits", amount: 50.0, count: 5, fill: "var(--ac-chart-2)"},
      {category: "Meat", amount: 50.0, count: 5, fill: "var(--ac-chart-3)"},
      {category: "Beverages", amount: 50.0, count: 5, fill: "var(--ac-chart-4)"},
      {category: "Baked Goods", amount: 50.0, count: 5, fill: "var(--ac-chart-5)"},
    ],
    currency: "EUR",
  },
};

/** Extreme dominance — one category is 95% of total. */
export const ExtremeDominance: Story = {
  args: {
    data: [
      {category: "Groceries", amount: 950.0, count: 45, fill: "var(--ac-chart-1)"},
      {category: "Dairy", amount: 15.0, count: 2, fill: "var(--ac-chart-2)"},
      {category: "Beverages", amount: 10.0, count: 1, fill: "var(--ac-chart-3)"},
      {category: "Fruits", amount: 15.0, count: 2, fill: "var(--ac-chart-4)"},
      {category: "Vegetables", amount: 10.0, count: 1, fill: "var(--ac-chart-5)"},
    ],
    currency: "RON",
  },
};

/** GBP currency with balanced six categories. */
export const GbpCurrency: Story = {
  args: {
    data: [
      {category: "Dairy", amount: 28.5, count: 8, fill: "var(--ac-chart-1)"},
      {category: "Meat", amount: 42.3, count: 6, fill: "var(--ac-chart-2)"},
      {category: "Vegetables", amount: 19.8, count: 12, fill: "var(--ac-chart-3)"},
      {category: "Beverages", amount: 15.6, count: 7, fill: "var(--ac-chart-4)"},
      {category: "Bakery", amount: 23.4, count: 9, fill: "var(--ac-chart-5)"},
      {category: "Cleaning", amount: 12.7, count: 3, fill: "var(--ac-chart-1)"},
    ],
    currency: "GBP",
  },
};

/** Ultra-diverse — 40+ tiny slices to test donut density. */
export const UltraDiverse: Story = {
  args: {
    data: Array.from({length: 40}, (_, i) => ({
      category: `Cat ${String(i + 1).padStart(2, "0")}`,
      amount: faker.number.float({min: 5, max: 50, fractionDigits: 2}),
      count: faker.number.int({min: 1, max: 5}),
      fill: `var(--ac-chart-${(i % 5) + 1})`,
    })),
    currency: "RON",
  },
};

/** Minimal spending — very small amounts across categories. */
export const MinimalSpending: Story = {
  args: {
    data: [
      {category: "Dairy", amount: 2.5, count: 2, fill: "var(--ac-chart-1)"},
      {category: "Beverages", amount: 3.8, count: 3, fill: "var(--ac-chart-2)"},
      {category: "Snacks", amount: 1.2, count: 1, fill: "var(--ac-chart-3)"},
      {category: "Fruits", amount: 4.5, count: 2, fill: "var(--ac-chart-4)"},
    ],
    currency: "USD",
  },
};
