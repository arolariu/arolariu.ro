import {
  invoicePresets,
  storyEmptyInvoice,
  storyHugeInvoice,
  storyInvoice,
  storyProducts,
  withEntityPreset,
  WithViewInvoiceContext,
} from "@/app/domains/invoices/_storybook";
import type {Invoice, Product} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
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
  render: ({invoice}) => {
    const twoItems: Product[] = storyProducts.slice(0, 2);
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: twoItems}}>
        <HomeInventoryCard />
      </WithViewInvoiceContext>
    );
  },
};

/** Home inventory insights for an empty basket (no items). */
export const Empty: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyEmptyInvoice}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};

/** Home inventory insights for a huge bulk grocery order. */
export const BulkOrder: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyHugeInvoice}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};

/** Home inventory insights for a single-item purchase. */
export const SingleItem: Story = {
  render: ({invoice}) => {
    const oneItem: Product[] = storyProducts.slice(0, 1);
    return (
      <WithViewInvoiceContext invoice={{...invoice, items: oneItem}}>
        <HomeInventoryCard />
      </WithViewInvoiceContext>
    );
  },
};
