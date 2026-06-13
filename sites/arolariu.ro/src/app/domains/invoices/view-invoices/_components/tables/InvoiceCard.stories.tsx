import type {Meta, StoryObj} from "@storybook/react";
import {seedInvoiceStoryStores, resetInvoiceStoryStores, storyInvoice, storyPublicInvoice, WithInvoiceDialogs} from "../../../_storybook";
import {InvoiceCard} from "./InvoiceCard";

/**
 * InvoiceCard displays one invoice as a grid card with scan carousel.
 *
 * This story mounts the real InvoiceCard component with various invoice configurations.
 * Wrapped with DialogProvider to provide required dialog context.
 */
const meta = {
	title: "arolariu.ro/IMS/Tables/Invoice/InvoiceCard",
	component: InvoiceCard,
	parameters: {
		layout: "centered",
	},
	decorators: [
		(Story) => {
			resetInvoiceStoryStores();
			seedInvoiceStoryStores();
			return (
				<WithInvoiceDialogs>
					<div style={{maxWidth: "400px"}}>
						<Story />
					</div>
				</WithInvoiceDialogs>
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

/**
 * Important invoice card (flagged) to show the importance indicator.
 */
export const Important: Story = {
	args: {
		invoice: {
			...storyInvoice,
			isImportant: true,
		},
		isSelected: false,
		loading: "eager",
		onToggleSelection: (invoiceId: string) => {
			console.log("Toggle selection for invoice:", invoiceId);
		},
	},
};

/**
 * Invoice card with a very long name to exercise title truncation.
 */
export const LongName: Story = {
	args: {
		invoice: {
			...storyInvoice,
			name: "Monthly Bulk Grocery & Household Supplies Shopping Trip - Mega Image Militari - March 2024",
		},
		isSelected: false,
		loading: "eager",
		onToggleSelection: (invoiceId: string) => {
			console.log("Toggle selection for invoice:", invoiceId);
		},
	},
};
