import {storyInvoice, WithViewInvoiceContext} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import {InvoiceTabs} from "./InvoiceTabs";

/**
 * InvoiceTabs shows possible recipes and additional metadata for the current
 * invoice from `useInvoiceContext`. Mounts the real component in the view-invoice context.
 */
const meta = {
  title: "arolariu.ro/IMS/Components/Invoice/InvoiceTabs",
  component: InvoiceTabs,
  parameters: {layout: "centered"},
} satisfies Meta<typeof InvoiceTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Invoice with recipes and metadata. */
export const WithRecipesAndMetadata: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={storyInvoice}>
      <InvoiceTabs />
    </WithViewInvoiceContext>
  ),
};

/** Invoice with no recipes and no metadata — empty tab states. */
export const Empty: Story = {
  render: () => (
    <WithViewInvoiceContext invoice={{...storyInvoice, possibleRecipes: [], additionalMetadata: {}}}>
      <InvoiceTabs />
    </WithViewInvoiceContext>
  ),
};
