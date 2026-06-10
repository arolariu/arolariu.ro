import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogOnMount, storyRecipeEasy, storyRecipeHard, WithEditInvoiceContext} from "../../../_storybook";
import DeleteRecipeDialog from "./DeleteRecipeDialog";

/**
 * DeleteRecipeDialog allows users to confirm deletion of a recipe.
 *
 * @remarks
 * This story mounts the real DeleteRecipeDialog component with OpenDialogOnMount
 * harness, opening the dialog automatically on mount with a story recipe payload.
 * Wrapped with EditInvoiceContextProvider to provide required context.
 */
const meta = {
	title: "Invoices/Dialogs/DeleteRecipeDialog",
	component: DeleteRecipeDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof DeleteRecipeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Shows delete confirmation for an easy recipe.
 *
 * @remarks
 * Displays confirmation dialog for deleting "Classic Scrambled Eggs" recipe.
 */
export const EasyRecipe: Story = {
	render: () => (
		<WithEditInvoiceContext>
			<OpenDialogOnMount dialog="EDIT_INVOICE__RECIPE_DELETE" mode="delete" payload={{recipe: storyRecipeEasy}}>
				<DeleteRecipeDialog />
			</OpenDialogOnMount>
		</WithEditInvoiceContext>
	),
};

/**
 * Shows delete confirmation for a complex recipe.
 *
 * @remarks
 * Displays confirmation dialog for deleting "Beef Wellington" recipe.
 */
export const ComplexRecipe: Story = {
	render: () => (
		<WithEditInvoiceContext>
			<OpenDialogOnMount dialog="EDIT_INVOICE__RECIPE_DELETE" mode="delete" payload={{recipe: storyRecipeHard}}>
				<DeleteRecipeDialog />
			</OpenDialogOnMount>
		</WithEditInvoiceContext>
	),
};
