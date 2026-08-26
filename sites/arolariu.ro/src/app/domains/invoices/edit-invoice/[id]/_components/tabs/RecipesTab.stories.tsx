import {AllergenCode, RecipeDifficulty, type RecipeIngredient, type RecipeStep, type RecipeSuggestion} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../../_contexts/DialogContext";
import RecipesTab from "./RecipesTab";

/**
 * RecipesTab displays recipe cards generated from invoice items, with
 * pagination and a generate-more action.
 *
 * Requires `DialogProvider` because it (and the nested `RecipeCard`s)
 * dispatch `EDIT_INVOICE__RECIPE_ADD`, `EDIT_INVOICE__RECIPE_UPDATE`,
 * `EDIT_INVOICE__RECIPE_DELETE`, and `EDIT_INVOICE__RECIPE_PREVIEW` dialogs.
 */
const withDialogProviderDecorator: Decorator = (Story) => (
  <DialogProvider>
    <Story />
  </DialogProvider>
);

const meta = {
  title: "Invoices/EditInvoice/Tabs/RecipesTab",
  component: RecipesTab,
  decorators: [withDialogProviderDecorator],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RecipesTab>;

export default meta;
type Story = StoryObj<typeof meta>;

function ingredient(name: string, quantity: string, preparation: string | null = null): RecipeIngredient {
  return {name, quantity, preparation};
}

function step(sequence: number, instruction: string, notes: string | null = null): RecipeStep {
  return {sequence, instruction, notes};
}

function buildRecipe(name: string, difficulty: RecipeDifficulty, totalMinutes: number): RecipeSuggestion {
  return {
    name,
    description: `Recipe suggestion generated from purchased ingredients: ${name}.`,
    servings: 2,
    preparationMinutes: Math.round(totalMinutes * 0.4),
    cookingMinutes: Math.round(totalMinutes * 0.6),
    totalMinutes,
    difficulty,
    purchasedIngredients: [ingredient("Main Ingredient", "1 pc")],
    assumedPantryStaples: [ingredient("Salt", "to taste")],
    missingOptionalIngredients: [],
    steps: [step(1, "Prepare the ingredients."), step(2, "Cook according to the recipe.")],
    allergenWarnings: [AllergenCode.Milk],
  };
}

const recipes: RecipeSuggestion[] = [
  buildRecipe("Creamy Pasta", RecipeDifficulty.Easy, 30),
  buildRecipe("Grilled Chicken Salad", RecipeDifficulty.Easy, 25),
  buildRecipe("Beef Stir-Fry", RecipeDifficulty.Medium, 40),
];

/** Recipes tab with generated recipe suggestions. */
export const WithRecipes: Story = {
  args: {recipes},
};

/** Recipes tab with no recipes generated yet. */
export const NoRecipes: Story = {
  args: {recipes: []},
};
