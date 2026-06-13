import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogButton, playOpenDialog, storyRecipeEasy} from "../../../_storybook";
import ShareRecipeDialog from "./ShareRecipeDialog";

/**
 * ShareRecipeDialog allows users to share a recipe via URL.
 *
 * @remarks
 * This story mounts the real ShareRecipeDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story recipe payload.
 */
const meta = {
	title: "Invoices/Dialogs/ShareRecipeDialog",
	component: ShareRecipeDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof ShareRecipeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default share recipe dialog.
 */
export const Default: Story = {
  play: playOpenDialog,
	render: () => (
		<OpenDialogButton dialog="EDIT_INVOICE__RECIPE_SHARE" mode="share" payload={{recipe: storyRecipeEasy}}>
			<ShareRecipeDialog />
		</OpenDialogButton>
	),
};
