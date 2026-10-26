import {generateRandomInvoice} from "@/data/mocks";
import type {Invoice, InvoiceScan} from "@/types/invoices";
import {InvoiceScanType} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {DialogProvider, useDialog} from "../../../_contexts/DialogContext";
import RemoveScanDialog from "./RemoveScanDialog";

/**
 * RemoveScanDialog confirms removal of a scan from an invoice.
 *
 * The dialog reads `{invoice, scan, scanIndex}` from `DialogContext` payload
 * rather than props, so this story opens the `EDIT_INVOICE__REMOVE_SCAN`
 * dialog on mount via a small harness component that shares the same
 * `DialogProvider`.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/RemoveScanDialog",
  component: RemoveScanDialog,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RemoveScanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

const scans: InvoiceScan[] = [
  {type: InvoiceScanType.JPEG, location: "https://picsum.photos/seed/removescan1/400/300", metadata: {}},
  {type: InvoiceScanType.JPEG, location: "https://picsum.photos/seed/removescan2/400/300", metadata: {}},
  {type: InvoiceScanType.JPEG, location: "https://picsum.photos/seed/removescan3/400/300", metadata: {}},
];

const invoiceWithMultipleScans: Invoice = {...generateRandomInvoice(), scans};
const invoiceWithSingleScan: Invoice = {...generateRandomInvoice(), scans: [scans[0]!]};

/** Opens `EDIT_INVOICE__REMOVE_SCAN` on mount so the dialog renders already visible. */
function RemoveScanDialogOpener({invoice, scanIndex}: Readonly<{invoice: Invoice; scanIndex: number}>): null {
  const scan = invoice.scans[scanIndex]!;
  const {open} = useDialog("EDIT_INVOICE__REMOVE_SCAN", "delete", {invoice, scan, scanIndex});

  useEffect(() => {
    open();
  }, [open]);

  return null;
}

/** Removing one of several scans — deletion is allowed. */
export const Default: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <RemoveScanDialogOpener
          invoice={invoiceWithMultipleScans}
          scanIndex={1}
        />
        <Story />
      </DialogProvider>
    ),
  ],
};

/** Attempting to remove the last remaining scan — deletion is blocked with a warning. */
export const LastScan: Story = {
  decorators: [
    (Story) => (
      <DialogProvider>
        <RemoveScanDialogOpener
          invoice={invoiceWithSingleScan}
          scanIndex={0}
        />
        <Story />
      </DialogProvider>
    ),
  ],
};
