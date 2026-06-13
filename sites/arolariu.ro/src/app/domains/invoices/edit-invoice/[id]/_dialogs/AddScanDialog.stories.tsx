import type {Meta, StoryObj} from "@storybook/react";
import type {Invoice} from "@/types/invoices";
import {invoicePresets, OpenDialogButton, playOpenDialog, storyInvoice, withEntityPreset} from "../../../_storybook";
import AddScanDialog from "./AddScanDialog";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

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
 * Default upload dialog with empty dropzone.
 */
export const Default: Story = {
  play: playOpenDialog,
	render: ({invoice}) => (
		<OpenDialogButton dialog="EDIT_INVOICE__ADD_SCAN" mode="add" payload={{invoice}}>
			<AddScanDialog />
		</OpenDialogButton>
	),
};
