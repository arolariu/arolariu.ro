import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogButton, playOpenDialog, storyInvoice} from "../../../_storybook";
import AnalyzeDialog from "./AnalyzeDialog";

/**
 * AnalyzeDialog allows users to perform AI analysis on invoice scans.
 *
 * @remarks
 * This story mounts the real AnalyzeDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story invoice payload.
 */
const meta = {
	title: "Invoices/Dialogs/AnalyzeDialog",
	component: AnalyzeDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof AnalyzeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default dialog content with analysis options.
 */
export const Default: Story = {
  play: playOpenDialog,
	render: () => (
		<OpenDialogButton dialog="EDIT_INVOICE__ANALYSIS" mode="view" payload={{invoice: storyInvoice}}>
			<AnalyzeDialog />
		</OpenDialogButton>
	),
};

/**
 * Analyze dialog for an invoice that has no scans attached yet.
 */
export const NoScans: Story = {
  play: playOpenDialog,
	render: () => (
		<OpenDialogButton dialog="EDIT_INVOICE__ANALYSIS" mode="view" payload={{invoice: {...storyInvoice, scans: []}}}>
			<AnalyzeDialog />
		</OpenDialogButton>
	),
};
