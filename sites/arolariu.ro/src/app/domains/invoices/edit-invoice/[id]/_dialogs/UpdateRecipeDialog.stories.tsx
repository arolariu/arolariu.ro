import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogButton, playOpenDialog, storyRecipeEasy, storyRecipeHard, WithEditInvoiceContext} from "../../../_storybook";
import UpdateRecipeDialog from "./UpdateRecipeDialog";

/**
 * UpdateRecipeDialog allows users to edit an existing recipe.
 *
 * @remarks
 * This story mounts the real UpdateRecipeDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story recipe payload.
 * Wrapped with EditInvoiceContextProvider to provide required context.
 */
const meta = {
	title: "arolariu.ro/IMS/Dialogs/Recipe/UpdateRecipe",
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
  play: playOpenDialog,
	render: () => (
		<WithEditInvoiceContext>
			<OpenDialogButton dialog="EDIT_INVOICE__RECIPE_UPDATE" mode="edit" payload={{recipe: storyRecipeEasy}}>
				<UpdateRecipeDialog />
			</OpenDialogButton>
		</WithEditInvoiceContext>
	),
};

/**
 * Edit dialog pre-filled with a complex (hard) recipe.
 */
export const HardRecipe: Story = {
  play: playOpenDialog,
	render: () => (
		<WithEditInvoiceContext>
			<OpenDialogButton dialog="EDIT_INVOICE__RECIPE_UPDATE" mode="edit" payload={{recipe: storyRecipeHard}}>
				<UpdateRecipeDialog />
			</OpenDialogButton>
		</WithEditInvoiceContext>
	),
};
