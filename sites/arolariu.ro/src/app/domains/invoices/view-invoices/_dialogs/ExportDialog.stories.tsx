import type {Meta, StoryObj} from "@storybook/react";
import {useEffect} from "react";
import {OpenDialogOnMount, resetInvoiceStoryStores, seedInvoiceStoryStores, storyInvoices} from "../../_storybook";
import ExportDialog from "./ExportDialog";

/**
 * Export dialog for exporting invoice data in various formats.
 *
 * @remarks
 * **Features:**
 * - Format selection: CSV, JSON, PDF
 * - Include options: metadata, merchant, products
 * - Format-specific options (CSV delimiter, JSON pretty print)
 * - File size estimate
 * - Custom filename input
 * - Copy to clipboard for JSON format
 *
 * **Dialog Context:**
 * Uses `VIEW_INVOICES__EXPORT` dialog with mode `view`.
 * Exports selected invoices from store, or all invoices if none selected.
 */
const meta = {
	title: "Invoices/ViewInvoices/Dialogs/ExportDialog",
	component: ExportDialog,
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => {
			resetInvoiceStoryStores();
			return <Story />;
		},
	],
} satisfies Meta<typeof ExportDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * React harness component that seeds invoice stores on mount.
 *
 * @param props - Component props.
 * @param props.selected - Whether to seed selected invoices (true) or none (false).
 * @returns Opened export dialog with seeded store state.
 */
function ExportDialogHarness({selected}: Readonly<{selected: boolean}>): React.JSX.Element {
	useEffect(() => {
		seedInvoiceStoryStores({
			invoices: storyInvoices,
			selectedInvoices: selected ? storyInvoices.slice(0, 2) : [],
		});
	}, [selected]);

	return (
		<OpenDialogOnMount dialog="VIEW_INVOICES__EXPORT" mode="view">
			<ExportDialog />
		</OpenDialogOnMount>
	);
}

/**
 * Export dialog with all invoices (none selected).
 *
 * @remarks
 * Seeds store with all story invoices and no selected invoices.
 * Dialog displays count of all invoices to be exported.
 */
export const AllInvoices: Story = {
	render: () => <ExportDialogHarness selected={false} />,
};

/**
 * Export dialog with selected invoices only.
 *
 * @remarks
 * Seeds store with selected invoices (first two from story fixtures).
 * Dialog displays count of selected invoices to be exported.
 */
export const SelectedInvoices: Story = {
	render: () => <ExportDialogHarness selected={true} />,
};
