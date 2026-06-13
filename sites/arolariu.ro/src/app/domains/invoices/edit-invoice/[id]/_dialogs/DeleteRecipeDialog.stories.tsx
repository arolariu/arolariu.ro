import type {Meta, StoryObj} from "@storybook/react";
import type {Recipe} from "@/types/invoices";
import {
  OpenDialogButton,
  playOpenDialog,
  recipePresets,
  storyRecipeEasy,
  storyRecipeHard,
  WithEditInvoiceContext,
  withEntityPreset,
} from "../../../_storybook";
import DeleteRecipeDialog from "./DeleteRecipeDialog";

type StoryArgs = {recipe: Recipe; recipePreset: "easy" | "hard"};

/**
 * DeleteRecipeDialog allows users to confirm deletion of a recipe.
 *
 * @remarks
 * This story mounts the real DeleteRecipeDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story recipe payload.
 * Wrapped with EditInvoiceContextProvider to provide required context.
 */
const meta = {
	title: "arolariu.ro/IMS/Dialogs/Recipe/DeleteRecipe",
	component: DeleteRecipeDialog,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"DeleteRecipeDialog is a destructive confirmation AlertDialog for removing recipes from an invoice's possibleRecipes array. " +
					"Displays the recipe name in bold within the confirmation message and provides Cancel and Delete action buttons. " +
					"Uses the useRecipeDelete hook to perform client-side removal from the Zustand invoices store. " +
					"Requires EditInvoiceContextProvider to access the invoice context.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		recipePreset: {control: "select", options: ["easy", "hard"]},
		recipe: {control: "object"},
	},
	args: {recipePreset: "easy", recipe: storyRecipeEasy},
	decorators: [withEntityPreset("recipePreset", "recipe", recipePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/**
 * Shows delete confirmation for an easy recipe.
 *
 * @remarks
 * Displays confirmation dialog for deleting "Classic Scrambled Eggs" recipe.
 */
export const EasyRecipe: Story = {
  play: playOpenDialog,
	parameters: {
		docs: {
			description: {
				story:
					"Demonstrates the delete confirmation dialog for an easy-complexity recipe ('Classic Scrambled Eggs'). " +
					"Shows how the recipe name is displayed in bold within the confirmation message, along with Cancel and Delete buttons. " +
					"The Delete button shows a loading state ('Deleting...') while the operation is in progress.",
			},
		},
	},
	render: ({recipe}) => (
		<WithEditInvoiceContext>
			<OpenDialogButton dialog="EDIT_INVOICE__RECIPE_DELETE" mode="delete" payload={{recipe}}>
				<DeleteRecipeDialog />
			</OpenDialogButton>
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
  args: {recipePreset: "hard", recipe: storyRecipeHard},
  play: playOpenDialog,
	parameters: {
		docs: {
			description: {
				story:
					"Demonstrates the delete confirmation dialog for a hard-complexity recipe ('Beef Wellington'). " +
					"Shows the same confirmation UI as the easy recipe, ensuring consistent destructive action patterns " +
					"regardless of recipe complexity. Useful for testing longer recipe names in the confirmation message.",
			},
		},
	},
	render: ({recipe}) => (
		<WithEditInvoiceContext>
			<OpenDialogButton dialog="EDIT_INVOICE__RECIPE_DELETE" mode="delete" payload={{recipe}}>
				<DeleteRecipeDialog />
			</OpenDialogButton>
		</WithEditInvoiceContext>
	),
};
