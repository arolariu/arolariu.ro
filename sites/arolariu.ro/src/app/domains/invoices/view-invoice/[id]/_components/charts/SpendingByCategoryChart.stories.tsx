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

/**
 * SpendingByCategoryChart renders a donut (pie) chart showing
 * spending distribution across product categories with a
 * total amount label in the center. Uses Recharts PieChart.
 */
const meta = {
  title: "Invoices/ViewInvoice/Charts/SpendingByCategoryChart",
  component: SpendingByCategoryChart,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SpendingByCategoryChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default with 5 categories in RON. */
export const Default: Story = {
  args: {
    data: generateMockCategorySpending(5),
    currency: "RON",
  },
};

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
      {category: "Groceries", amount: 450.0, count: 25, fill: "var(--chart-1)"},
      {category: "Dairy", amount: 30.5, count: 3, fill: "var(--chart-2)"},
      {category: "Beverages", amount: 18.0, count: 2, fill: "var(--chart-3)"},
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
    data: [{category: "Groceries", amount: 156.75, count: 8, fill: "var(--chart-1)"}],
    currency: "RON",
  },
};

/** High volume — 20+ categories to stress test donut chart density. */
export const HighVolume: Story = {
  args: {
    data: [
      ...generateMockCategorySpending(8),
      ...["Snacks", "Frozen", "Personal Care", "Condiments", "Pasta", "Canned", "Spices", "Baby", "Pet Food", "Bakery", "Deli", "Sweets"].map(
        (category, index) => ({
          category,
          amount: faker.number.float({min: 15, max: 250, fractionDigits: 2}),
          count: faker.number.int({min: 1, max: 12}),
          fill: `var(--chart-${((index + 3) % 5) + 1})`,
        }),
      ),
    ],
    currency: "RON",
  },
};
