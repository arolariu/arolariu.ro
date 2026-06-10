import type {Meta, StoryObj} from "@storybook/react";
import type {Recipe, RecipeComplexity} from "@/types/invoices/Recipe";
import {OpenDialogOnMount, storyRecipeEasy} from "../../../_storybook";
import PreviewRecipeDialog from "./PreviewRecipeDialog";

/**
 * PreviewRecipeDialog allows users to view recipe details in read-only mode.
 *
 * @remarks
 * This story mounts the real PreviewRecipeDialog component with OpenDialogOnMount
 * harness, opening the dialog automatically on mount with a story recipe payload.
 * Displays recipe name, description, ingredients, complexity, instructions, and cooking times.
 */
const meta = {
	title: "Invoices/Dialogs/PreviewRecipeDialog",
	component: PreviewRecipeDialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof PreviewRecipeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Shows complete recipe with all fields populated.
 *
 * @remarks
 * Displays "Classic Scrambled Eggs" recipe with description, ingredients,
 * instructions, complexity badge, and cooking times.
 */
export const CompleteRecipe: Story = {
	render: () => (
		<OpenDialogOnMount dialog="EDIT_INVOICE__RECIPE_PREVIEW" mode="view" payload={{recipe: storyRecipeEasy}}>
			<PreviewRecipeDialog />
		</OpenDialogOnMount>
	),
};

/**
 * Shows minimal recipe with only required fields.
 *
 * @remarks
 * Displays recipe with minimal data to demonstrate empty state fallbacks
 * for optional fields (description, instructions, times).
 */
export const MinimalRecipe: Story = {
	render: () => {
		const minimalRecipe: Recipe = {
			name: "Simple Toast",
			description: "",
			approximateTotalDuration: 5,
			complexity: 1 as RecipeComplexity, // Easy
			ingredients: ["Bread", "Butter"],
			instructions: "",
			preparationTime: 0,
			cookingTime: 0,
			referenceForMoreDetails: "",
		};

		return (
			<OpenDialogOnMount dialog="EDIT_INVOICE__RECIPE_PREVIEW" mode="view" payload={{recipe: minimalRecipe}}>
				<PreviewRecipeDialog />
			</OpenDialogOnMount>
		);
	},
};
