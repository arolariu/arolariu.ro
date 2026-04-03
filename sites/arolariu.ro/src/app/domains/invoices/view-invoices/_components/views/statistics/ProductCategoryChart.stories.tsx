import type {Meta, StoryObj} from "@storybook/react";
import {computeProductCategorySpending} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {ProductCategoryChart} from "./ProductCategoryChart";

/**
 * ProductCategoryChart displays spending breakdown by product category.
 *
 * ## Features
 * - Horizontal bar chart for easy reading
 * - Color-coded category bars
 * - Product count and percentage display
 * - Custom tooltip with detailed stats
 * - Empty state handling
 *
 * ## Use Cases
 * - Spending analysis by product type
 * - Budget allocation tracking
 * - Shopping behavior insights
 */
const meta = {
  title: "Invoices/Statistics/ProductCategoryChart",
  component: ProductCategoryChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes product-level spending aggregated by category using a horizontal bar chart. Shows total spent, product count, and percentage for each category.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of product category spending aggregates",
      control: false,
    },
    currency: {
      description: "Currency code for display (always RON for normalized data)",
      control: "text",
    },
  },
} satisfies Meta<typeof ProductCategoryChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default view with diverse product categories.
 * Shows spending across multiple product types (dairy, meat, beverages, etc.).
 */
export const Default: Story = {
  args: {
    data: computeProductCategorySpending(mockInvoices),
    currency: "lei",
  },
};

/**
 * Empty state - no products available.
 * Displays friendly message when no product data exists.
 */
export const Empty: Story = {
  args: {
    data: computeProductCategorySpending(emptyInvoices),
    currency: "lei",
  },
};

/**
 * Single invoice - minimal data.
 * Shows category breakdown for one invoice's products.
 */
export const SingleInvoice: Story = {
  args: {
    data: computeProductCategorySpending(singleInvoice),
    currency: "lei",
  },
};

/**
 * Grocery-focused spending.
 * Demonstrates chart with primarily food-related categories.
 */
export const GroceryFocused: Story = {
  args: {
    data: computeProductCategorySpending(
      mockInvoices.filter((inv) => inv.category === 100), // GROCERY enum value
    ),
    currency: "lei",
  },
};

/**
 * Few categories - simplified view.
 * Shows chart behavior with limited category diversity.
 */
export const FewCategories: Story = {
  args: {
    data: computeProductCategorySpending(mockInvoices.slice(0, 3)),
    currency: "lei",
  },
};

/**
 * EUR currency display.
 * Demonstrates chart with Euro as currency.
 */
export const EuroCurrency: Story = {
  args: {
    data: computeProductCategorySpending(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "EUR")),
    currency: "€",
  },
};
