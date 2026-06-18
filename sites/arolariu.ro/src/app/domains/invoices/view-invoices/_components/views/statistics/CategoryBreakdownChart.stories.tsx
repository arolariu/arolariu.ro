import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceCategory} from "../../../../../../../types/invoices";
import type {CategoryAggregate} from "../../../_utils/statistics";
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

/** Two categories — minimal donut for comparison. */
export const TwoCategories: Story = {
  args: {
    data: computeCategoryAggregates(mockInvoices.slice(0, 2)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Minimal donut chart with exactly two categories for comparison.",
      },
    },
  },
};

/** Three categories — balanced donut view. */
export const ThreeCategories: Story = {
  args: {
    data: computeCategoryAggregates(mockInvoices.slice(0, 3)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Balanced donut chart with three categories for optimal visual density.",
      },
    },
  },
};

/** Four categories — diverse donut segments. */
export const FourCategories: Story = {
  args: {
    data: computeCategoryAggregates(mockInvoices.slice(0, 5)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Donut chart with four distinct categories for diverse spending visualization.",
      },
    },
  },
};

/** Five categories — high-diversity donut. */
export const FiveCategories: Story = {
  args: {
    data: computeCategoryAggregates(mockInvoices.slice(0, 8)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Donut chart with five categories showing complex spending distribution.",
      },
    },
  },
};

/** Car/auto spending — automotive category filter. */
export const CarAutoFocused: Story = {
  args: {
    data: computeCategoryAggregates(mockInvoices.filter((inv) => inv.category === InvoiceCategory.CAR_AUTO)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows spending pattern with car/auto category invoices from the dataset.",
      },
    },
  },
};

/** Fast food spending — quick service filter. */
export const FastFoodFocused: Story = {
  args: {
    data: computeCategoryAggregates(mockInvoices.filter((inv) => inv.category === InvoiceCategory.FAST_FOOD)),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows spending distribution for fast food category invoices.",
      },
    },
  },
};

/** Dense dataset — all categories present. */
export const AllCategories: Story = {
  args: {
    data: computeCategoryAggregates(mockInvoices),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Complete breakdown showing all available invoice categories in the mock dataset.",
      },
    },
  },
};

/** Dominant single category — highly skewed donut. */
export const DominantCategory: Story = {
  args: {
    data: computeCategoryAggregates([
      ...mockInvoices.filter((inv) => inv.category === InvoiceCategory.GROCERY),
      ...mockInvoices.slice(0, 1),
    ]),
    currency: "RON",
  },
  parameters: {
    docs: {
      description: {
        story: "Shows donut chart where one category dominates spending (90%+ of total).",
      },
    },
  },
};
