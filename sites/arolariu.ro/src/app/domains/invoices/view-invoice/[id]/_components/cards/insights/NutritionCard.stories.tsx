import type {Meta, StoryObj} from "@storybook/react";
import {storyInvoice, storyProducts, WithViewInvoiceContext} from "@/app/domains/invoices/_storybook";
import {NutritionCard} from "./NutritionCard";

/**
 * NutritionCard displays nutritional insights from grocery invoice items,
 * showing food group breakdowns, balance scores, and dietary suggestions.
 * Reads the active invoice from `useInvoiceContext`.
 *
 * These stories mount the real component through `WithViewInvoiceContext`.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/NutritionCard",
  component: NutritionCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof NutritionCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nutrition insights for a full grocery basket. */
export const Default: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <NutritionCard />
    </WithViewInvoiceContext>
  ),
};

/** Nutrition insights for a small basket with only a couple of items. */
export const FewItems: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, items: storyProducts.slice(0, 2)}}>
      <NutritionCard />
    </WithViewInvoiceContext>
  ),
};
