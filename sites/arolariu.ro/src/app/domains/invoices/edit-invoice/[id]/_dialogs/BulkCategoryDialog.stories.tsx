import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogButton, playOpenDialog, storyInvoice, storyProducts} from "../../../_storybook";
import BulkCategoryDialog from "./BulkCategoryDialog";

/**
 * BulkCategoryDialog allows users to change the category of multiple products at once.
 *
 * @remarks
 * This story mounts the real BulkCategoryDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with selected products payload.
 * Shows category selection dropdown and progress tracking during save.
 */
const meta = {
	title: "arolariu.ro/IMS/Dialogs/Products/BulkCategory",
	component: BulkCategoryDialog,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"BulkCategoryDialog enables batch category reassignment for multiple products within an invoice. " +
					"The dialog displays a preview list of selected products (up to 5, with 'and X more' for larger selections), " +
					"a category selection dropdown with all ProductCategory enum values, and real-time progress tracking during save. " +
					"Updates are applied sequentially via individual updateInvoiceProduct calls with error collection and summary reporting.",
			},
		},
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
  play: playOpenDialog,
	parameters: {
		docs: {
			description: {
				story:
					"Demonstrates the bulk category dialog with three products selected: Zuzu Milk, Whole Wheat Bread, and Free Range Eggs. " +
					"Shows the product preview list displaying all three items, and the category dropdown with all available ProductCategory options. " +
					"This scenario represents a typical small batch update use case.",
			},
		},
	},
	render: () => {
		// Select first three products
		const selectedProducts = storyProducts.slice(0, 3);
		const selectedIndices = [0, 1, 2];

		return (
			<OpenDialogButton
				dialog="EDIT_INVOICE__BULK_CATEGORY"
				mode="edit"
				payload={{invoice: storyInvoice, selectedProducts, selectedIndices}}>
				<BulkCategoryDialog />
			</OpenDialogButton>
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
  play: playOpenDialog,
	parameters: {
		docs: {
			description: {
				story:
					"Demonstrates the bulk category dialog with all four story products selected (Milk, Bread, Eggs, Apples). " +
					"Since the preview limit is 5 products, all items are shown in the list. This scenario would show the 'and X more' " +
					"message if more than 5 products were selected, representing large batch update operations.",
			},
		},
	},
	render: () => {
		// Select all products
		const selectedProducts = storyProducts;
		const selectedIndices = storyProducts.map((_, index) => index);

		return (
			<OpenDialogButton
				dialog="EDIT_INVOICE__BULK_CATEGORY"
				mode="edit"
				payload={{invoice: storyInvoice, selectedProducts, selectedIndices}}>
				<BulkCategoryDialog />
			</OpenDialogButton>
		);
	},
};
