import type {Meta, StoryObj} from "@storybook/react";
import type {Invoice} from "@/types/invoices";
import {invoicePresets, OpenDialogButton, playOpenDialog, storyInvoice, withEntityPreset} from "../../../_storybook";
import AnalyzeDialog from "./AnalyzeDialog";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"};

/**
 * AnalyzeDialog allows users to perform AI analysis on invoice scans.
 *
 * @remarks
 * This story mounts the real AnalyzeDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story invoice payload.
 */
const meta = {
	title: "arolariu.ro/IMS/Dialogs/Invoice/Analyze",
	component: AnalyzeDialog,
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
 * Default dialog content with analysis options.
 */
export const Default: Story = {
  play: playOpenDialog,
	render: ({invoice}) => (
		<OpenDialogButton dialog="EDIT_INVOICE__ANALYSIS" mode="view" payload={{invoice}}>
			<AnalyzeDialog />
		</OpenDialogButton>
	),
};

/**
 * Analyze dialog for an invoice that has no scans attached yet.
 */
export const NoScans: Story = {
  play: playOpenDialog,
	render: ({invoice}) => (
		<OpenDialogButton dialog="EDIT_INVOICE__ANALYSIS" mode="view" payload={{invoice: {...invoice, scans: []}}}>
			<AnalyzeDialog />
		</OpenDialogButton>
	),
};
