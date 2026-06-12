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
					"Dialog for creating a new recipe from invoice items. Users can input recipe details " +
					"(name, description, ingredients, prep time, cook time, difficulty) and save. Integrated with EditInvoiceContext " +
					"and DialogContext to control visibility. Product selection UI is not currently implemented.",
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
					"on mount via the OpenDialogOnMount harness. Users can input recipe details including name, description, " +
					"ingredients, prep/cook time, and difficulty.",
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
