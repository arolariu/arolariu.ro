import {generateRandomInvoice} from "@/data/mocks";
import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../../_contexts/DialogContext";
import AddScanDialog from "./AddScanDialog";

/**
 * AddScanDialog uploads a new receipt scan and attaches it to an invoice.
 *
 * The dialog reads its invoice from `DialogContext` payload rather than
 * props, so this story opens the `EDIT_INVOICE__ADD_SCAN` dialog on mount
 * via a small harness component that shares the same `DialogProvider`.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/AddScanDialog",
  component: AddScanDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof AddScanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockInvoice: Invoice = generateRandomInvoice();

/** Opens `EDIT_INVOICE__ADD_SCAN` on mount so the dialog renders already visible. */
function AddScanDialogOpener({invoice}: Readonly<{invoice: Invoice}>): null {
  const {open} = useDialog("EDIT_INVOICE__ADD_SCAN", "add", {invoice});

  useEffect(() => {
    open();
  }, [open]);

  return null;
}

/** Default upload dialog with an empty dropzone, ready to receive a new scan. */
export const Default: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <AddScanDialogOpener invoice={mockInvoice} />
        <Story />
      </DialogProvider>
    ),
  ],
};
