import type {Meta, StoryObj} from "@storybook/react";
import {storyInvoice, storyProducts, WithViewInvoiceContext} from "@/app/domains/invoices/_storybook";
import {DiningCard} from "./DiningCard";

/**
 * DiningCard displays dining-related insights from restaurant/fast-food invoices,
 * including estimated calories, cost per person, and dining tips. Reads the
 * active invoice from `useInvoiceContext`.
 *
 * These stories mount the real component through `WithViewInvoiceContext`.
 */
const meta = {
  title: "arolariu.ro/IMS/ViewInvoice/Insights/DiningCard",
  component: DiningCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof DiningCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Dining insights for a full multi-item receipt. */
export const Default: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};

/** Dining insights for a small single-item, low-cost receipt. */
export const SingleDiner: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyInvoice,
        items: storyProducts.slice(0, 1),
        paymentInformation: {...storyInvoice.paymentInformation, totalCostAmount: 12.5},
      }}>
      <DiningCard />
    </WithViewInvoiceContext>
  ),
};
