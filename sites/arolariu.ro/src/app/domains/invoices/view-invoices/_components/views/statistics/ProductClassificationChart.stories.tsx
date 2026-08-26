import type {Meta, StoryObj} from "@storybook/react";
import {computeProductClassificationSpending} from "../../../_utils/statistics";
import {emptyInvoices, mockInvoices, singleInvoice} from "./__mocks__/mockInvoices";
import {ProductClassificationChart} from "./ProductClassificationChart";

/**
 * ProductClassificationChart displays spending breakdown by product classification group.
 *
 * ## Features
 * - Horizontal bar chart for easy reading
 * - Color-coded classification group bars
 * - Product count and percentage display
 * - Custom tooltip with detailed stats
 * - Empty state handling
 *
 * ## Use Cases
 * - Spending analysis by taxonomy classification
 * - Budget allocation tracking
 * - Shopping behavior insights
 */
const meta = {
  title: "Invoices/Statistics/ProductClassificationChart",
  component: ProductClassificationChart,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Visualizes product-level spending aggregated by taxonomy classification group using a horizontal bar chart. Shows total spent, product count, and percentage for each group.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    data: {
      description: "Array of product classification group spending aggregates",
      control: false,
    },
    currency: {
      description: "Currency code for display (always RON for normalized data)",
      control: "text",
    },
  },
} satisfies Meta<typeof ProductClassificationChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    data: computeProductClassificationSpending(mockInvoices),
    currency: "lei",
  },
};

export const Empty: Story = {
  args: {
    data: computeProductClassificationSpending(emptyInvoices),
    currency: "lei",
  },
};

export const SingleInvoice: Story = {
  args: {
    data: computeProductClassificationSpending(singleInvoice),
    currency: "lei",
  },
};

export const FewGroups: Story = {
  args: {
    data: computeProductClassificationSpending(mockInvoices.slice(0, 3)),
    currency: "lei",
  },
};

export const EuroCurrency: Story = {
  args: {
    data: computeProductClassificationSpending(mockInvoices.filter((inv) => inv.paymentInformation.currency?.code === "EUR")),
    currency: "€",
  },
};
