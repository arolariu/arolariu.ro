import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogOnMount, setupViewInvoiceStory, storyInvoice} from "@/app/domains/invoices/_storybook";
import DeleteInvoiceDialog from "./DeleteInvoiceDialog";

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
    docs: {
      description: {
        component:
          "Destructive confirmation dialog for permanently deleting an invoice and all associated data (scans, line items, shared access). " +
          "Displays invoice identifier, title, and metadata with clear warning messaging. Mounted with real dialog context.",
      },
    },
  },
  beforeEach: () => {
    setupViewInvoiceStory({invoice: storyInvoice});
  },
} satisfies Meta<typeof DeleteInvoiceDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Confirmation dialog for deleting an invoice with items and scans. */
export const OpenConfirmation: Story = {
  parameters: {
    docs: {
      description: {
        story:
          "Displays the delete confirmation dialog with a realistic invoice fixture containing merchant name, invoice identifier, " +
          "and metadata. Shows destructive action styling with warning color scheme and dual-button footer (Cancel/Delete).",
      },
    },
  },
  render: () => (
    <OpenDialogOnMount
      dialog="SHARED__INVOICE_DELETE"
      mode="delete"
      payload={{invoice: storyInvoice}}>
      <DeleteInvoiceDialog />
    </OpenDialogOnMount>
  ),
};
