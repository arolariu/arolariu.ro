import type {Meta, StoryObj} from "@storybook/react";
import {storyInvoice, WithViewInvoiceContext} from "@/app/domains/invoices/_storybook";
import {GeneralExpenseCard} from "./GeneralExpenseCard";

/**
 * GeneralExpenseCard shows a general-purpose expense breakdown with auto-detected
 * category, budget categories, and tax options. Reads the active invoice from
 * `useInvoiceContext`.
 *
 * These stories mount the real component through `WithViewInvoiceContext`.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/GeneralExpenseCard",
  component: GeneralExpenseCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof GeneralExpenseCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** General expense insights for a standard-value receipt. */
export const Default: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <GeneralExpenseCard />
    </WithViewInvoiceContext>
  ),
};

/** General expense insights for a high-value purchase. */
export const HighValue: Story = {
  render: () => (
    <WithViewInvoiceContext
      invoice={{
        ...storyInvoice,
        paymentInformation: {...storyInvoice.paymentInformation, totalCostAmount: 2499.99},
      }}>
      <GeneralExpenseCard />
    </WithViewInvoiceContext>
  ),
};
