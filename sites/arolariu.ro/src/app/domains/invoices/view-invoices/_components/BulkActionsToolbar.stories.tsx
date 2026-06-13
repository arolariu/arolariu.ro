import type {Meta, StoryObj} from "@storybook/react";
import {seedInvoiceStoryStores, resetInvoiceStoryStores, WithInvoiceDialogs, storyInvoice, storyPublicInvoice} from "../../_storybook";
import BulkActionsToolbar from "./BulkActionsToolbar";

/**
 * BulkActionsToolbar provides bulk actions for selected invoices.
 *
 * This story mounts the real BulkActionsToolbar component wrapped with
 * WithInvoiceDialogs and seeds the invoice store with selected invoices.
 */
const meta = {
	title: "arolariu.ro/IMS/Components/Invoice/BulkActionsToolbar",
	component: BulkActionsToolbar,
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<WithInvoiceDialogs>
				<div style={{minHeight: "400px", position: "relative"}}>
					<Story />
				</div>
			</WithInvoiceDialogs>
		),
	],
} satisfies Meta<typeof BulkActionsToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * With selected invoices — toolbar appears at bottom with bulk actions.
 */
export const WithSelectedInvoices: Story = {
	decorators: [
		(Story) => {
			resetInvoiceStoryStores();
			seedInvoiceStoryStores({
				selectedInvoices: [storyInvoice, storyPublicInvoice],
			});
			return <Story />;
		},
	],
};
