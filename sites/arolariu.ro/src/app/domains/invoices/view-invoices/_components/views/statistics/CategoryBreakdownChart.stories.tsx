import type {Meta, StoryObj} from "@storybook/react";
import type {CategoryAggregate} from "../../../_utils/statistics";
import {InvoiceCategory} from "@/types/invoices";
import {computeCategoryAggregates} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {CategoryBreakdownChart} from "./CategoryBreakdownChart";

type StoryArgs = {data: CategoryAggregate[]; currency: string};

/**
 * CategoryBreakdownChart displays spending breakdown by invoice category as a donut chart.
 *
 * ## Features
 * - Interactive donut chart with hover tooltips
 * - Category-wise spending amounts and percentages
 * - Invoice count per category
 * - Total spending summary
 * - Color-coded categories (up to 5 colors cycling)
 * - Custom legend with category names
 *
 * ## Use Cases
 * - Budget allocation visualization
 * - Spending category analysis
 * - Financial planning overview
 * - Expense categorization insights
 */
const meta = {
  title: "arolariu.ro/IMS/Statistics/Products/CategoryBreakdownChart",
  component: CategoryBreakdownChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes spending distribution across invoice categories using a donut chart. Shows amount, percentage, and invoice count for each category. Total spending is displayed below the chart for quick reference.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {control: "object"},
    currency: {control: "text"},
  },
  args: {
    data: computeCategoryAggregates(mockInvoices),
    currency: "RON",
  },
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default view with diverse categories.
 * Shows spending across several invoice categories from the deterministic mock dataset.
 */
export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: "Default state showing spending distribution across all invoice categories from mock data.",
      },
    },
  },
};

/**
 * Single category - minimal dataset.
 * Shows breakdown for a single invoice category.
 */
export const SingleCategory: Story = {
  args: {
    data: computeCategoryAggregates(singleInvoice),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal state with only one category represented.",
      },
    },
  },
};

/**
 * Empty state - no data.
 * Shows chart when no invoices are available.
 */
export const Empty: Story = {
  args: {
    data: computeCategoryAggregates(emptyInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state when no invoice data is available. Chart will show no segments.",
      },
    },
  },
};

/**
 * Grocery-only spending.
 * Demonstrates scenario with grocery category invoices.
 */
export const GroceryFocused: Story = {
  args: {
    data: computeCategoryAggregates(mockInvoices.filter((inv) => inv.category === InvoiceCategory.GROCERY)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows spending pattern with grocery category invoices from the dataset.",
      },
    },
  },
};

/**
 * RON currency display (alternative label).
 * Shows category breakdown with RON label (data is always RON-normalized).
 */
export const ExplicitRON: Story = {
  args: {
    data: computeCategoryAggregates(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Category breakdown with explicit RON label. All aggregate data is RON-normalized.",
      },
    },
  },
};

/**
 * Subset of invoices.
 * Shows spending distribution from first 10 invoices.
 */
export const SubsetDistribution: Story = {
  args: {
    data: computeCategoryAggregates(mockInvoices.slice(0, 10)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Spending distribution from first 10 invoices in the mock dataset.",
      },
    },
  },
};

/**
 * Few categories - sparse data.
 * Shows breakdown with only 2-3 categories.
 */
export const FewCategories: Story = {
  args: {
    data: computeCategoryAggregates(mockInvoices.slice(0, 3)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Sparse data scenario with only a few invoice categories represented.",
      },
    },
  },
};
