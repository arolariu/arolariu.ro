import type {Meta, StoryObj} from "@storybook/react";
import type {Recipe, RecipeComplexity} from "@/types/invoices/Recipe";
import {OpenDialogButton, playOpenDialog, storyRecipeEasy} from "../../../_storybook";
import PreviewRecipeDialog from "./PreviewRecipeDialog";

/**
 * PreviewRecipeDialog allows users to view recipe details in read-only mode.
 *
 * @remarks
 * This story mounts the real PreviewRecipeDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story recipe payload.
 * Displays recipe name, description, ingredients, complexity, instructions, and cooking times.
 */
const meta = {
	title: "arolariu.ro/IMS/Dialogs/Recipe/PreviewRecipe",
	component: PreviewRecipeDialog,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"PreviewRecipeDialog renders a read-only view of a recipe with all its details: name (as dialog title), " +
					"description, ingredients list, complexity badge (Easy/Normal/Hard with variant styling), cooking instructions, " +
					"preparation time, and cooking time with icon indicators. Includes graceful empty state fallbacks for optional fields, " +
					"displaying 'Not specified' or 'No description' when values are missing.",
			},
		},
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
  play: playOpenDialog,
	parameters: {
		docs: {
			description: {
				story:
					"Demonstrates the recipe preview dialog with a complete recipe ('Classic Scrambled Eggs') that has all fields populated: " +
					"description, 5 ingredients, detailed step-by-step instructions, Easy complexity badge (green variant), " +
					"3 minutes prep time, and 7 minutes cooking time. Shows the full-featured recipe display with all UI elements rendered.",
			},
		},
	},
	render: () => (
		<OpenDialogButton dialog="EDIT_INVOICE__RECIPE_PREVIEW" mode="view" payload={{recipe: storyRecipeEasy}}>
			<PreviewRecipeDialog />
		</OpenDialogButton>
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
  play: playOpenDialog,
	parameters: {
		docs: {
			description: {
				story:
					"Demonstrates the recipe preview dialog with a minimal recipe ('Simple Toast') that has only required fields populated. " +
					"Shows empty state fallbacks: 'No description' for missing description, 'Not specified' for missing instructions " +
					"and times, and just 2 ingredients. Useful for testing graceful degradation when optional recipe data is absent.",
			},
		},
	},
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
			<OpenDialogButton dialog="EDIT_INVOICE__RECIPE_PREVIEW" mode="view" payload={{recipe: minimalRecipe}}>
				<PreviewRecipeDialog />
			</OpenDialogButton>
		);
	},
};
