import type {Invoice} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {invoicePresets, OpenDialogButton, playOpenDialog, storyInvoice, storyInvoicePdfScan, withEntityPreset} from "../../../_storybook";
import RemoveScanDialog from "./RemoveScanDialog";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * RemoveScanDialog allows users to remove a scan from an invoice.
 *
 * @remarks
 * This story mounts the real RemoveScanDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story invoice and scan payload.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Scan/RemoveScan",
  component: RemoveScanDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    invoicePreset: {control: "select", options: ["standard", "public"]},
    invoice: {control: "object"},
  },
  args: {invoicePreset: "standard", invoice: storyInvoice},
  decorators: [withEntityPreset("invoicePreset", "invoice", invoicePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default remove scan confirmation dialog.
 */
export const Default: Story = {
  play: playOpenDialog,
  render: ({invoice}) => {
    if (!invoice.scans || invoice.scans.length === 0) {
      throw new Error("RemoveScanDialog story requires at least one invoice scan fixture.");
    }
    const firstScan = invoice.scans[0];
    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__REMOVE_SCAN'
        mode='delete'
        payload={{invoice, scan: firstScan, scanIndex: 0}}>
        <RemoveScanDialog />
      </OpenDialogButton>
    );
  },
};

/**
 * Remove-scan confirmation for a PDF document scan.
 */
export const PdfScan: Story = {
  play: playOpenDialog,
  render: ({invoice}) => {
    const invoiceWithPdf = {...invoice, scans: [storyInvoicePdfScan]};
    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__REMOVE_SCAN'
        mode='delete'
        payload={{invoice: invoiceWithPdf, scan: storyInvoicePdfScan, scanIndex: 0}}>
        <RemoveScanDialog />
      </OpenDialogButton>
    );
  },
};

/** Remove scan dialog for the last remaining scan on an invoice. */
export const LastScan: Story = {
  play: playOpenDialog,
  render: ({invoice}) => {
    const firstScan = invoice.scans[0];
    if (!firstScan) {
      throw new Error("RemoveScanDialog story requires at least one scan");
    }
    const invoiceWithOneScan = {...invoice, scans: [firstScan]};
    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__REMOVE_SCAN'
        mode='delete'
        payload={{invoice: invoiceWithOneScan, scan: firstScan, scanIndex: 0}}>
        <RemoveScanDialog />
      </OpenDialogButton>
    );
  },
};
