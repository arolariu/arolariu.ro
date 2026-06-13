import type {Meta, StoryObj} from "@storybook/react";
import type {Invoice} from "@/types/invoices";
import {invoicePresets, storyInvoice, storyProducts, WithViewInvoiceContext, withEntityPreset} from "@/app/domains/invoices/_storybook";
import {HomeInventoryCard} from "./HomeInventoryCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * HomeInventoryCard estimates household supply levels and restock timing from
 * grocery items. Reads the active invoice from `useInvoiceContext`.
 *
 * These stories mount the real component through `WithViewInvoiceContext`.
 */
const meta = {
  title: "arolariu.ro/IMS/Insights/Products/HomeInventoryCard",
  component: HomeInventoryCard,
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

/** Home inventory insights for a full grocery basket. */
export const Default: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={invoice}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};

/** Home inventory insights for a small top-up shop. */
export const FewItems: Story = {
  render: ({invoice}) => (
    <WithViewInvoiceContext invoice={{...invoice, items: storyProducts.slice(0, 2)}}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};
