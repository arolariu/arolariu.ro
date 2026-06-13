import type {Meta, StoryObj} from "@storybook/react";
import {storyInvoice, storyProducts, WithViewInvoiceContext} from "@/app/domains/invoices/_storybook";
import {HomeInventoryCard} from "./HomeInventoryCard";

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
} satisfies Meta<typeof HomeInventoryCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Home inventory insights for a full grocery basket. */
export const Default: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};

/** Home inventory insights for a small top-up shop. */
export const FewItems: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, items: storyProducts.slice(0, 2)}}>
      <HomeInventoryCard />
    </WithViewInvoiceContext>
  ),
};
