import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogOnMount, WithViewInvoiceContext, storyInvoice, storyMerchant} from "../../../_storybook";
import {ExportDialog} from "./ExportDialog";

/**
 * Export dialog for single invoice detail view.
 *
 * @remarks
 * **Features:**
 * - Export as PDF (professional invoice document)
 * - Export as CSV (product items)
 * - Export as JSON (full invoice data)
 * - Copy summary to clipboard
 *
 * **Dialog Context:**
 * Uses `VIEW_INVOICE__EXPORT` dialog with mode `view`.
 * Requires `InvoiceContext` to access invoice and merchant data.
 */
const meta = {
	title: "Invoices/Dialogs/InvoiceDetailExportDialog",
	component: ExportDialog,
	parameters: {
		layout: "centered",
	},
} satisfies Meta<typeof ExportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Export dialog for single invoice.
 *
 * @remarks
 * Wraps with `WithViewInvoiceContext` to provide invoice and merchant data.
 * Opens dialog automatically on mount in `view` mode.
 */
export const Default: Story = {
	render: () => (
		<WithViewInvoiceContext invoice={storyInvoice} merchant={storyMerchant}>
			<OpenDialogOnMount dialog="VIEW_INVOICE__EXPORT" mode="view">
				<ExportDialog />
			</OpenDialogOnMount>
		</WithViewInvoiceContext>
	),
};
