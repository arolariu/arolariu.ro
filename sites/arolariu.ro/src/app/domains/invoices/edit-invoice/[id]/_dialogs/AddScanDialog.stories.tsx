import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogOnMount, storyInvoice} from "../../../_storybook";
import AddScanDialog from "./AddScanDialog";

/**
 * AddScanDialog allows users to upload receipt scans to an invoice.
 *
 * @remarks
 * This story mounts the real AddScanDialog component with OpenDialogOnMount
 * harness, opening the dialog automatically on mount with a story invoice payload.
 */
const meta = {
	title: "Invoices/Dialogs/AddScanDialog",
	component: AddScanDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof AddScanDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default upload dialog with empty dropzone.
 */
export const Default: Story = {
	render: () => (
		<OpenDialogOnMount dialog="EDIT_INVOICE__ADD_SCAN" mode="add" payload={{invoice: storyInvoice}}>
			<AddScanDialog />
		</OpenDialogOnMount>
	),
};
