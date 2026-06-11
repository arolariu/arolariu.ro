import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogOnMount, WithEditInvoiceContext} from "../../../_storybook";
import AddRecipeDialog from "./AddRecipeDialog";

/**
 * AddRecipeDialog allows users to create a new recipe from invoice items.
 *
 * @remarks
 * This story mounts the real AddRecipeDialog component with OpenDialogOnMount
 * harness, opening the dialog automatically on mount. Wrapped with
 * EditInvoiceContextProvider to provide required context.
 */
const meta = {
	title: "Invoices/Dialogs/AddRecipeDialog",
	component: AddRecipeDialog,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"Dialog for creating a new recipe from invoice items. Users can select products from the current invoice, " +
					"set recipe metadata (name, servings, prep time, cook time), and save. Integrated with EditInvoiceContext " +
					"to access invoice products and DialogContext to control visibility.",
			},
		},
	},
	tags: ["autodocs"],
} satisfies Meta<typeof AddRecipeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default add recipe dialog with empty form.
 */
export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"Shows the recipe creation dialog in its initial state with an empty form. The dialog opens automatically " +
					"on mount via the OpenDialogOnMount harness. Users can select products from the invoice's product list and " +
					"configure recipe details.",
			},
		},
	},
	render: () => (
		<WithEditInvoiceContext>
			<OpenDialogOnMount dialog="EDIT_INVOICE__RECIPE_ADD" mode="add">
				<AddRecipeDialog />
			</OpenDialogOnMount>
		</WithEditInvoiceContext>
	),
};
