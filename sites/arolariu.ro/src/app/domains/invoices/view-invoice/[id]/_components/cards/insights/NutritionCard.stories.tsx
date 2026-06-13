import type {Meta, StoryObj} from "@storybook/react";
import type {Invoice} from "@/types/invoices";
import {invoicePresets, storyInvoice, storyProducts, WithViewInvoiceContext, withEntityPreset} from "@/app/domains/invoices/_storybook";
import {NutritionCard} from "./NutritionCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * NutritionCard displays nutritional insights from grocery invoice items,
 * showing food group breakdowns, balance scores, and dietary suggestions.
 * Reads the active invoice from `useInvoiceContext`.
 *
 * These stories mount the real component through `WithViewInvoiceContext`.
 */
const meta = {
  title: "arolariu.ro/IMS/Insights/Products/NutritionCard",
  component: NutritionCard,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Nutrition insights for a full grocery basket. */
export const Default: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={invoice}>
      <NutritionCard />
    </WithViewInvoiceContext>
  ),
};

/** Nutrition insights for a small basket with only a couple of items. */
export const FewItems: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, items: storyProducts.slice(0, 2)}}>
      <NutritionCard />
    </WithViewInvoiceContext>
  ),
};
