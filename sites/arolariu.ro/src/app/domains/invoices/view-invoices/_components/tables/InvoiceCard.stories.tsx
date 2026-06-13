import type {Meta, StoryObj} from "@storybook/react";
import type {Invoice} from "@/types/invoices";
import {invoicePresets, seedInvoiceStoryStores, resetInvoiceStoryStores, storyInvoice, WithInvoiceDialogs, withEntityPreset} from "../../../_storybook";
import {InvoiceCard} from "./InvoiceCard";

type StoryArgs = {invoice: Invoice; invoicePreset: "standard" | "public"; isSelected: boolean; loading: "eager" | "lazy"; onToggleSelection: (invoiceId: string) => void};

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
	argTypes: {
		invoicePreset: {control: "select", options: ["standard", "public"]},
		invoice: {control: "object"},
		isSelected: {control: "boolean"},
		loading: {control: "select", options: ["eager", "lazy"]},
		onToggleSelection: {action: "onToggleSelection"},
	},
	args: {
		invoicePreset: "standard",
		invoice: storyInvoice,
		isSelected: false,
		loading: "eager",
		onToggleSelection: (invoiceId: string) => {
			console.log("Toggle selection for invoice:", invoiceId);
		},
	},
	decorators: [
		withEntityPreset("invoicePreset", "invoice", invoicePresets),
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
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Default invoice card with scans.
 */
export const Default: Story = {};

/**
 * Selected invoice card.
 */
export const Selected: Story = {
	args: {
		isSelected: true,
	},
};

/**
 * Invoice card with no scans.
 */
export const NoScans: Story = {
	args: {
		invoicePreset: "public",
		invoice: {
			...invoicePresets.public,
			scans: [],
		},
	},
};

/**
 * Important invoice card (flagged) to show the importance indicator.
 */
export const Important: Story = {
	args: {
		invoice: {
			...invoicePresets.standard,
			isImportant: true,
		},
	},
};

/**
 * Invoice card with a very long name to exercise title truncation.
 */
export const LongName: Story = {
	args: {
		invoice: {
			...invoicePresets.standard,
			name: "Monthly Bulk Grocery & Household Supplies Shopping Trip - Mega Image Militari - March 2024",
		},
	},
};
