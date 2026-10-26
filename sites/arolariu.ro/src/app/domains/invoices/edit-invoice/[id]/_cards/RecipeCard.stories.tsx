import {AllergenCode, RecipeDifficulty, type RecipeIngredient, type RecipeStep, type RecipeSuggestion} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider} from "../../../_contexts/DialogContext";
import RecipeCard from "./RecipeCard";

/**
 * RecipeCard displays a recipe with complexity badge, ingredients, timing,
 * and CRUD dropdown actions.
 *
 * Requires `DialogProvider` because its dropdown menu dispatches
 * `EDIT_INVOICE__RECIPE_UPDATE`, `EDIT_INVOICE__RECIPE_DELETE`, and
 * `EDIT_INVOICE__RECIPE_PREVIEW` dialogs.
 */
const withDialogProviderDecorator: Decorator = (Story) => (
  <DialogProvider>
    <Story />
  </DialogProvider>
);

const meta = {
  title: "Invoices/EditInvoice/Cards/RecipeCard",
  component: RecipeCard,
  decorators: [withDialogProviderDecorator],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RecipeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

function ingredient(name: string, quantity: string, preparation: string | null = null): RecipeIngredient {
  return {name, quantity, preparation};
}

function step(sequence: number, instruction: string, notes: string | null = null): RecipeStep {
  return {sequence, instruction, notes};
}

const easyRecipe: RecipeSuggestion = {
  name: "Salmon Pasta",
  description: "A quick and delicious pasta dish with fresh salmon and herbs.",
  servings: 2,
  preparationMinutes: 10,
  cookingMinutes: 20,
  totalMinutes: 30,
  difficulty: RecipeDifficulty.Easy,
  purchasedIngredients: [ingredient("Pasta", "200 g"), ingredient("Fresh Salmon", "150 g"), ingredient("Olive Oil", "2 tbsp")],
  assumedPantryStaples: [ingredient("Salt", "to taste"), ingredient("Black Pepper", "to taste")],
  missingOptionalIngredients: [ingredient("Fresh Dill", "1 tbsp")],
  steps: [
    step(1, "Boil the pasta until al dente."),
    step(2, "Pan-sear the salmon in olive oil."),
    step(3, "Combine pasta and salmon, season to taste."),
  ],
  allergenWarnings: [AllergenCode.Fish],
};

const hardRecipe: RecipeSuggestion = {
  name: "Beef Wellington",
  description: "A classic British dish featuring beef fillet wrapped in pâté and puff pastry.",
  servings: 4,
  preparationMinutes: 45,
  cookingMinutes: 90,
  totalMinutes: 135,
  difficulty: RecipeDifficulty.Hard,
  purchasedIngredients: [ingredient("Beef Fillet", "800 g"), ingredient("Puff Pastry", "1 sheet")],
  assumedPantryStaples: [ingredient("Butter", "50 g"), ingredient("Eggs", "1")],
  missingOptionalIngredients: [],
  steps: [step(1, "Sear the beef fillet on all sides."), step(2, "Wrap in pâté and puff pastry."), step(3, "Bake until golden brown.")],
  allergenWarnings: [AllergenCode.CerealsContainingGluten, AllergenCode.Eggs],
};

/** Easy recipe with no allergen warnings. */
export const EasyRecipe: Story = {
  args: {recipe: easyRecipe, recipeIndex: 0},
};

/** Hard recipe with allergen warnings. */
export const HardRecipe: Story = {
  args: {recipe: hardRecipe, recipeIndex: 1},
};
