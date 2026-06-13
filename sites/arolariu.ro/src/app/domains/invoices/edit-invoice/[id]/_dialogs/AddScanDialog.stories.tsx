import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogButton, playOpenDialog, storyInvoice} from "../../../_storybook";
import AddScanDialog from "./AddScanDialog";

/**
 * AddScanDialog allows users to upload receipt scans to an invoice.
 *
 * @remarks
 * This story mounts the real AddScanDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story invoice payload.
 */
const meta = {
	title: "arolariu.ro/IMS/Dialogs/Scan/AddScan",
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
  play: playOpenDialog,
	render: () => (
		<OpenDialogButton dialog="EDIT_INVOICE__ADD_SCAN" mode="add" payload={{invoice: storyInvoice}}>
			<AddScanDialog />
		</OpenDialogButton>
	),
};
