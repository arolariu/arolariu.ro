import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogOnMount, storyInvoice} from "../../../_storybook";
import RemoveScanDialog from "./RemoveScanDialog";

/**
 * RemoveScanDialog allows users to remove a scan from an invoice.
 *
 * @remarks
 * This story mounts the real RemoveScanDialog component with OpenDialogOnMount
 * harness, opening the dialog automatically on mount with a story invoice and scan payload.
 */
const meta = {
	title: "Invoices/Dialogs/RemoveScanDialog",
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
	render: () => {
		if (!storyInvoice.scans || storyInvoice.scans.length === 0) {
			throw new Error("RemoveScanDialog story requires at least one invoice scan fixture.");
		}
		const firstScan = storyInvoice.scans[0];
		return (
			<OpenDialogOnMount
				dialog="EDIT_INVOICE__REMOVE_SCAN"
				mode="delete"
				payload={{invoice: storyInvoice, scan: firstScan, scanIndex: 0}}>
				<RemoveScanDialog />
			</OpenDialogOnMount>
		);
	},
};
