import type {Meta, StoryObj} from "@storybook/react";
import {seedInvoiceStoryStores, resetInvoiceStoryStores, storyInvoice, storyPublicInvoice, storyOnlineInvoice} from "../../../_storybook";
import {InvoiceCard} from "./InvoiceCard";

/**
 * InvoiceCard displays one invoice as a grid card with scan carousel.
 *
 * This story mounts the real InvoiceCard component with various invoice configurations.
 */
const meta = {
	title: "Invoices/ViewInvoices/Tables/InvoiceCard",
	component: InvoiceCard,
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => {
			resetInvoiceStoryStores();
			seedInvoiceStoryStores();
			return (
				<div style={{maxWidth: "400px"}}>
					<Story />
				</div>
			);
		},
	],
} satisfies Meta<typeof InvoiceCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default invoice card with scans.
 */
export const Default: Story = {
	args: {
		invoice: storyInvoice,
		isSelected: false,
		loading: "eager",
		onToggleSelection: (invoiceId: string) => {
			console.log("Toggle selection for invoice:", invoiceId);
		},
	},
};

/**
 * Selected invoice card.
 */
export const Selected: Story = {
	args: {
		invoice: storyInvoice,
		isSelected: true,
		loading: "eager",
		onToggleSelection: (invoiceId: string) => {
			console.log("Toggle selection for invoice:", invoiceId);
		},
	},
};

/**
 * Invoice card with no scans.
 */
export const NoScans: Story = {
	args: {
		invoice: {
			...storyPublicInvoice,
			scans: [],
		},
		isSelected: false,
		loading: "eager",
		onToggleSelection: (invoiceId: string) => {
			console.log("Toggle selection for invoice:", invoiceId);
		},
	},
};
