import type {Meta, StoryObj} from "@storybook/react";
import InvoiceCard from "./InvoiceCard";
import {storyInvoice, storyMerchant, WithEditInvoiceContext} from "../../../_storybook";

/**
 * InvoiceCard (edit) displays comprehensive invoice details with inline editing.
 *
 * This story mounts the real component wrapped in `WithEditInvoiceContext`.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/InvoiceCard",
  component: InvoiceCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof InvoiceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoice card with standard invoice data. */
export const Default: Story = {
  render: () => (
    <WithEditInvoiceContext invoice={storyInvoice} merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};

/** Important invoice card with isImportant flag set. */
export const ImportantInvoice: Story = {
  render: () => (
    <WithEditInvoiceContext
      invoice={{...storyInvoice, isImportant: true}}
      merchant={storyMerchant}>
      <InvoiceCard />
    </WithEditInvoiceContext>
  ),
};
