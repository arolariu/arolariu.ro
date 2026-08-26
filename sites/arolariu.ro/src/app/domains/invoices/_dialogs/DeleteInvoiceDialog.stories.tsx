import {InvoiceBuilder} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../_contexts/DialogContext";
import DeleteInvoiceDialog from "./DeleteInvoiceDialog";

/**
 * Opens the real shared delete dialog with its required invoice payload.
 */
function DeleteInvoiceDialogOpener({invoice}: Readonly<{invoice: Invoice}>): null {
  const {open} = useDialog("SHARED__INVOICE_DELETE", "delete", {invoice});

  useEffect(() => {
    open();
  }, [open]);

  return null;
}

/** Wraps the story in the real `DialogProvider` context and opens the delete dialog for `invoice`. */
function withOpenDeleteDialog(invoice: Invoice): Decorator {
  return (Story) => (
    <DialogProvider>
      <DeleteInvoiceDialogOpener invoice={invoice} />
      <Story />
    </DialogProvider>
  );
}

/**
 * DeleteInvoiceDialog is the shared destructive confirmation dialog for
 * invoice deletion. Actual deletion (`useInvoiceDelete` → `deleteInvoice`
 * server action) is only triggered by clicking "Delete Permanently" after
 * the confirmation checkbox is checked — it is not invoked during the
 * default render.
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

/** Default delete confirmation dialog with invoice summary and impact warning. */
export const Default: Story = {
  decorators: [
    withOpenDeleteDialog(
      new InvoiceBuilder()
        .withName("Weekly Groceries")
        .withDescription("Shopping at Lidl — weekly grocery run")
        .withSharedWith(["shared-user-1", "shared-user-2"])
        .build(),
    ),
  ],
};
