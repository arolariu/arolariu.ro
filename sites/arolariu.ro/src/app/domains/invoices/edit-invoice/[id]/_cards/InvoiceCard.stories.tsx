import type {Meta, StoryObj} from "@storybook/react";
import InvoiceCard from "./InvoiceCard";
import {storyInvoice} from "../../../_storybook/fixtures/invoiceFixtures";
import {storyMerchant} from "../../../_storybook/fixtures/merchantFixtures";
import {DialogProvider} from "../../../_contexts/DialogContext";
import {EditInvoiceContextProvider} from "../_context/EditInvoiceContext";

/**
 * InvoiceCard (edit) displays comprehensive invoice details with inline editing.
 *
 * This story mounts the real component wrapped in EditInvoiceContext and DialogProvider.
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
    <DialogProvider>
      <EditInvoiceContextProvider invoice={storyInvoice} merchant={storyMerchant}>
        <InvoiceCard />
      </EditInvoiceContextProvider>
    </DialogProvider>
  ),
};

/** Important invoice card with isImportant flag set. */
export const ImportantInvoice: Story = {
  render: () => (
    <DialogProvider>
      <EditInvoiceContextProvider
        invoice={{...storyInvoice, isImportant: true}}
        merchant={storyMerchant}>
        <InvoiceCard />
      </EditInvoiceContextProvider>
    </DialogProvider>
  ),
};
