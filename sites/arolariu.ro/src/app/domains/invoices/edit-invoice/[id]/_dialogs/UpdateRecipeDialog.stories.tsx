import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogOnMount, storyRecipeEasy} from "../../../_storybook";
import UpdateRecipeDialog from "./UpdateRecipeDialog";

/**
 * UpdateRecipeDialog allows users to edit an existing recipe.
 *
 * @remarks
 * This story mounts the real UpdateRecipeDialog component with OpenDialogOnMount
 * harness, opening the dialog automatically on mount with a story recipe payload.
 */
const meta = {
	title: "Invoices/EditInvoice/Dialogs/UpdateRecipeDialog",
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
		<OpenDialogOnMount dialog="EDIT_INVOICE__RECIPE_UPDATE" mode="edit" payload={{recipe: storyRecipeEasy}}>
			<UpdateRecipeDialog />
		</OpenDialogOnMount>
	),
};
