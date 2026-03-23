import {faker} from "@faker-js/faker";
import type {Meta, StoryObj} from "@storybook/react";
import type {CategoryTrendData} from "../../_utils/analytics";
import {CategoryComparisonChart} from "./CategoryComparisonChart";

faker.seed(42);

function generateMockCategoryTrendData(count: number): CategoryTrendData[] {
  const categories = ["Dairy", "Fruits", "Meat", "Beverages", "Baked Goods", "Vegetables", "Groceries", "Fish"];
  return categories.slice(0, count).map((category) => ({
    category,
    current: faker.number.float({min: 10, max: 200, fractionDigits: 2}),
    average: faker.number.float({min: 10, max: 200, fractionDigits: 2}),
  }));
}

/**
 * CategoryComparisonChart renders a horizontal bar chart comparing
 * current spending per category against historical averages.
 * Uses Recharts BarChart with vertical layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Charts/CategoryComparisonChart",
  component: CategoryComparisonChart,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof CategoryComparisonChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default with 4 categories and RON currency. */
export const Default: Story = {
  args: {
    data: generateMockCategoryTrendData(4),
    currency: "RON",
  },
};

/** Many categories — 8 bars for a dense chart. */
export const ManyCategories: Story = {
  args: {
    data: generateMockCategoryTrendData(8),
    currency: "RON",
  },
};

/** Single category comparison. */
export const SingleCategory: Story = {
  args: {
    data: generateMockCategoryTrendData(1),
    currency: "EUR",
  },
};

/** USD currency with few categories. */
export const UsdCurrency: Story = {
  args: {
    data: generateMockCategoryTrendData(3),
    currency: "USD",
  },
};
/** Empty data — no categories available. */
export const EmptyData: Story = {
  args: {
    data: [],
    currency: "RON",
  },
};

/** Single data point — only one category. */
export const SingleDataPoint: Story = {
  args: {
    data: [{category: "Dairy", current: 45.99, average: 38.5}],
    currency: "RON",
  },
};

/** High volume — 20+ categories to stress test chart density. */
export const HighVolume: Story = {
  args: {
    data: [
      ...generateMockCategoryTrendData(8),
      ...[
        "Snacks",
        "Cleaning",
        "Personal Care",
        "Frozen",
        "Condiments",
        "Pasta",
        "Canned Goods",
        "Spices",
        "Baby",
        "Pet Food",
        "Bakery",
        "Deli",
      ].map((category) => ({
        category,
        current: faker.number.float({min: 10, max: 200, fractionDigits: 2}),
        average: faker.number.float({min: 10, max: 200, fractionDigits: 2}),
      })),
    ],
    currency: "RON",
  },
};
