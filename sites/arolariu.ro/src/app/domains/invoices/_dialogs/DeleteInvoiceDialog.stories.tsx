import type {Meta, StoryObj} from "@storybook/react";
import DeleteInvoiceDialog from "./DeleteInvoiceDialog";
import {OpenDialogOnMount, storyInvoice} from "../_storybook";

/**
 * DeleteInvoiceDialog displays a destructive confirmation dialog for permanently
 * removing an invoice with all associated data (scans, line items, shared access).
 *
 * This story mounts the real component wrapped in `OpenDialogOnMount` with
 * `SHARED__INVOICE_DELETE` dialog context seeded with fixture data.
 */
const meta = {
  title: "Invoices/Dialogs/DeleteInvoiceDialog",
  component: DeleteInvoiceDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof DeleteInvoiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Confirmation dialog for deleting an invoice with items and scans. */
export const OpenConfirmation: Story = {
  render: () => (
    <OpenDialogOnMount
      dialog="SHARED__INVOICE_DELETE"
      mode="delete"
      payload={{invoice: storyInvoice}}>
      <DeleteInvoiceDialog />
    </OpenDialogOnMount>
  ),
};
