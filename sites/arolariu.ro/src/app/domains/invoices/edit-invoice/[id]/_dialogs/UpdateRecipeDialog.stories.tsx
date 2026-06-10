import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogOnMount, storyRecipeEasy, WithEditInvoiceContext} from "../../../_storybook";
import UpdateRecipeDialog from "./UpdateRecipeDialog";

/**
 * UpdateRecipeDialog allows users to edit an existing recipe.
 *
 * @remarks
 * This story mounts the real UpdateRecipeDialog component with OpenDialogOnMount
 * harness, opening the dialog automatically on mount with a story recipe payload.
 * Wrapped with EditInvoiceContextProvider to provide required context.
 */
const meta = {
	title: "Invoices/Dialogs/UpdateRecipeDialog",
	component: UpdateRecipeDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof UpdateRecipeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default edit recipe dialog.
 */
export const Default: Story = {
	render: () => (
		<WithEditInvoiceContext>
			<OpenDialogOnMount dialog="EDIT_INVOICE__RECIPE_UPDATE" mode="edit" payload={{recipe: storyRecipeEasy}}>
				<UpdateRecipeDialog />
			</OpenDialogOnMount>
		</WithEditInvoiceContext>
	),
};
