import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogButton, playOpenDialog, storyInvoice, storyInvoicePdfScan} from "../../../_storybook";
import RemoveScanDialog from "./RemoveScanDialog";

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
} satisfies Meta<typeof RemoveScanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default remove scan confirmation dialog.
 */
export const Default: Story = {
  play: playOpenDialog,
	render: () => {
		if (!storyInvoice.scans || storyInvoice.scans.length === 0) {
			throw new Error("RemoveScanDialog story requires at least one invoice scan fixture.");
		}
		const firstScan = storyInvoice.scans[0];
		return (
			<OpenDialogButton
				dialog="EDIT_INVOICE__REMOVE_SCAN"
				mode="delete"
				payload={{invoice: storyInvoice, scan: firstScan, scanIndex: 0}}>
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
	render: () => {
		const invoiceWithPdf = {...storyInvoice, scans: [storyInvoicePdfScan]};
		return (
			<OpenDialogButton
				dialog="EDIT_INVOICE__REMOVE_SCAN"
				mode="delete"
				payload={{invoice: invoiceWithPdf, scan: storyInvoicePdfScan, scanIndex: 0}}>
				<RemoveScanDialog />
			</OpenDialogButton>
		);
	},
};
