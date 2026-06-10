import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogOnMount, storyInvoice, storyProducts} from "../../../_storybook";
import BulkCategoryDialog from "./BulkCategoryDialog";

/**
 * BulkCategoryDialog allows users to change the category of multiple products at once.
 *
 * @remarks
 * This story mounts the real BulkCategoryDialog component with OpenDialogOnMount
 * harness, opening the dialog automatically on mount with selected products payload.
 * Shows category selection dropdown and progress tracking during save.
 */
const meta = {
	title: "Invoices/Dialogs/BulkCategoryDialog",
	component: BulkCategoryDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof BulkCategoryDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Shows bulk category dialog with a few selected products.
 *
 * @remarks
 * Displays first three products selected for category reassignment.
 */
export const FewProducts: Story = {
	render: () => {
		// Select first three products
		const selectedProducts = storyProducts.slice(0, 3);
		const selectedIndices = [0, 1, 2];

		return (
			<OpenDialogOnMount
				dialog="EDIT_INVOICE__BULK_CATEGORY"
				mode="edit"
				payload={{invoice: storyInvoice, selectedProducts, selectedIndices}}>
				<BulkCategoryDialog />
			</OpenDialogOnMount>
		);
	},
};

/**
 * Shows bulk category dialog with many selected products.
 *
 * @remarks
 * Displays all story invoice products selected, demonstrating the "and X more" preview.
 */
export const ManyProducts: Story = {
	render: () => {
		// Select all products
		const selectedProducts = storyProducts;
		const selectedIndices = storyProducts.map((_, index) => index);

		return (
			<OpenDialogOnMount
				dialog="EDIT_INVOICE__BULK_CATEGORY"
				mode="edit"
				payload={{invoice: storyInvoice, selectedProducts, selectedIndices}}>
				<BulkCategoryDialog />
			</OpenDialogOnMount>
		);
	},
};
