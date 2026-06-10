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
	title: "Invoices/EditInvoice/Dialogs/AddRecipeDialog",
	component: AddRecipeDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof AddRecipeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default add recipe dialog with empty form.
 */
export const Default: Story = {
	render: () => (
		<WithEditInvoiceContext>
			<OpenDialogOnMount dialog="EDIT_INVOICE__RECIPE_ADD" mode="add">
				<AddRecipeDialog />
			</OpenDialogOnMount>
		</WithEditInvoiceContext>
	),
};
