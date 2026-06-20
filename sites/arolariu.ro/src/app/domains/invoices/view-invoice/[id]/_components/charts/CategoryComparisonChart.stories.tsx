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

type StoryArgs = {data: CategoryTrendData[]; currency: string};

/**
 * CategoryComparisonChart renders a horizontal bar chart comparing
 * current spending per category against historical averages.
 * Uses Recharts BarChart with vertical layout.
 */
const meta = {
  title: "arolariu.ro/IMS/Charts/Products/CategoryComparisonChart",
  component: CategoryComparisonChart,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    data: {control: "object"},
    currency: {control: "text"},
  },
  args: {
    data: generateMockCategoryTrendData(4),
    currency: "RON",
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Default with 4 categories and RON currency. */
export const Default: Story = {};

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

/** Long category names — test label truncation and wrapping. */
export const LongCategoryNames: Story = {
  args: {
    data: [
      {
        category: "Organic Free-Range Gluten-Free Products",
        current: 125.5,
        average: 98.3,
      },
      {
        category: "Premium Artisan Bakery & Pastry Items",
        current: 89.2,
        average: 102.7,
      },
      {
        category: "Specialty International Imported Beverages",
        current: 67.8,
        average: 73.5,
      },
    ],
    currency: "RON",
  },
};

/** Very high volume — 30+ categories to stress test chart scrolling. */
export const VeryHighVolume: Story = {
  args: {
    data: Array.from({length: 30}, (_, i) => ({
      category: `Category ${String(i + 1).padStart(2, "0")}`,
      current: faker.number.float({min: 10, max: 200, fractionDigits: 2}),
      average: faker.number.float({min: 10, max: 200, fractionDigits: 2}),
    })),
    currency: "RON",
  },
};

/** Three categories — minimal balanced view. */
export const ThreeCategories: Story = {
  args: {
    data: generateMockCategoryTrendData(3),
    currency: "RON",
  },
};

/** All zero current values — baseline spending scenario. */
export const ZeroCurrentValues: Story = {
  args: {
    data: [
      {category: "Dairy", current: 0, average: 45.5},
      {category: "Fruits", current: 0, average: 32.8},
      {category: "Meat", current: 0, average: 78.2},
      {category: "Beverages", current: 0, average: 22.0},
    ],
    currency: "RON",
  },
};

/** All zero average values — no historical baseline. */
export const ZeroAverageValues: Story = {
  args: {
    data: [
      {category: "Dairy", current: 45.5, average: 0},
      {category: "Fruits", current: 32.8, average: 0},
      {category: "Meat", current: 78.2, average: 0},
    ],
    currency: "EUR",
  },
};

/** Flat identical values — current equals average across all categories. */
export const FlatIdenticalValues: Story = {
  args: {
    data: [
      {category: "Dairy", current: 50.0, average: 50.0},
      {category: "Fruits", current: 50.0, average: 50.0},
      {category: "Meat", current: 50.0, average: 50.0},
      {category: "Beverages", current: 50.0, average: 50.0},
      {category: "Baked Goods", current: 50.0, average: 50.0},
    ],
    currency: "RON",
  },
};

/** Extreme outlier — one category dominates both current and average. */
export const ExtremeOutlier: Story = {
  args: {
    data: [
      {category: "Groceries", current: 850.0, average: 920.5},
      {category: "Dairy", current: 12.0, average: 15.3},
      {category: "Beverages", current: 8.5, average: 9.2},
      {category: "Fruits", current: 5.0, average: 6.8},
    ],
    currency: "RON",
  },
};

/** GBP currency with six categories. */
export const GbpCurrency: Story = {
  args: {
    data: generateMockCategoryTrendData(6),
    currency: "GBP",
  },
};

/** Sparse two categories — minimal comparison scenario. */
export const SparseTwoCategories: Story = {
  args: {
    data: [
      {category: "Dairy", current: 28.5, average: 35.2},
      {category: "Meat", current: 67.8, average: 59.4},
    ],
    currency: "USD",
  },
};

/** Negative variance — all current values below average. */
export const NegativeVariance: Story = {
  args: {
    data: [
      {category: "Dairy", current: 15.5, average: 35.0},
      {category: "Fruits", current: 8.2, average: 22.5},
      {category: "Meat", current: 28.0, average: 65.8},
      {category: "Beverages", current: 5.5, average: 18.0},
    ],
    currency: "RON",
  },
};

/** Positive variance — all current values above average. */
export const PositiveVariance: Story = {
  args: {
    data: [
      {category: "Dairy", current: 68.5, average: 42.0},
      {category: "Fruits", current: 45.8, average: 28.5},
      {category: "Meat", current: 105.0, average: 72.3},
      {category: "Beverages", current: 32.5, average: 18.0},
    ],
    currency: "EUR",
  },
};

/** Mixed with zero current — some categories with zero spending this period. */
export const MixedWithZeroCurrent: Story = {
  args: {
    data: [
      {category: "Dairy", current: 45.5, average: 38.2},
      {category: "Fruits", current: 0, average: 28.5},
      {category: "Meat", current: 67.0, average: 55.8},
      {category: "Beverages", current: 0, average: 22.0},
      {category: "Baked Goods", current: 28.5, average: 25.0},
    ],
    currency: "RON",
  },
};
