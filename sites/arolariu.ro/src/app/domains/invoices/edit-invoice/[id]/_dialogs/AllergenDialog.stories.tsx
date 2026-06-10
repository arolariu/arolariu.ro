import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogOnMount, storyInvoice, storyProducts} from "../../../_storybook";
import AllergenDialog from "./AllergenDialog";

/**
 * AllergenDialog allows users to edit allergens on individual products.
 *
 * @remarks
 * This story mounts the real AllergenDialog component with OpenDialogOnMount
 * harness, opening the dialog automatically on mount with a story invoice and product payload.
 * Shows quick-add buttons for common allergens and custom allergen entry.
 */
const meta = {
	title: "Invoices/Dialogs/AllergenDialog",
	component: AllergenDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof AllergenDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Shows allergen dialog with existing allergens on milk product.
 *
 * @remarks
 * Displays current allergens (Lactose), quick-add buttons for common allergens,
 * and custom allergen entry field.
 */
export const ExistingAllergens: Story = {
	render: () => {
		// Get the milk product which has lactose allergen
		const milkProduct = storyProducts[0];
		if (!milkProduct) {
			throw new Error("Story fixture error: milk product not found");
		}

		return (
			<OpenDialogOnMount
				dialog="EDIT_INVOICE__ALLERGENS"
				mode="edit"
				payload={{invoice: storyInvoice, product: milkProduct, productIndex: 0}}>
				<AllergenDialog />
			</OpenDialogOnMount>
		);
	},
};

/**
 * Shows allergen dialog for a product with no allergens.
 *
 * @remarks
 * Displays empty allergen state with quick-add buttons and custom entry.
 */
export const NoAllergens: Story = {
	render: () => {
		// Get the apples product which has no allergens
		const applesProduct = storyProducts[3];
		if (!applesProduct) {
			throw new Error("Story fixture error: apples product not found");
		}

		return (
			<OpenDialogOnMount
				dialog="EDIT_INVOICE__ALLERGENS"
				mode="edit"
				payload={{invoice: storyInvoice, product: applesProduct, productIndex: 3}}>
				<AllergenDialog />
			</OpenDialogOnMount>
		);
	},
};
