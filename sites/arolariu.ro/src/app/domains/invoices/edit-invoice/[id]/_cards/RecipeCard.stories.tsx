import type {Recipe} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {recipePresets, storyRecipeEasy, storyRecipeHard, withEntityPreset, WithInvoiceDialogs} from "../../../_storybook";
import RecipeCard from "./RecipeCard";

type StoryArgs = {recipe: Recipe; recipePreset: "easy" | "hard"};

/**
 * RecipeCard displays a recipe with complexity badge, ingredients, timing,
 * and CRUD dropdown actions. It depends on `useDialog` for edit/delete/share.
 *
 * This story mounts the real component wrapped in `WithInvoiceDialogs`.
 */
const meta = {
  title: "arolariu.ro/IMS/Cards/Recipe/RecipeCard",
  component: RecipeCard,
  parameters: {
    layout: "centered",
  },
  argTypes: {
    recipePreset: {control: "select", options: ["easy", "hard"]},
    recipe: {control: "object"},
  },
  args: {recipePreset: "easy", recipe: storyRecipeEasy},
  decorators: [withEntityPreset("recipePreset", "recipe", recipePresets)],
} satisfies Meta<StoryArgs>;

export default meta;
type Story = StoryObj<StoryArgs>;

/** Recipe card with easy complexity level. */
export const EasyRecipe: Story = {
  render: ({recipe}) => (
    <WithInvoiceDialogs>
      <RecipeCard recipe={recipe} />
    </WithInvoiceDialogs>
  ),
};

/** Recipe card with hard complexity level. */
export const HardRecipe: Story = {
  args: {recipePreset: "hard", recipe: storyRecipeHard},
  render: ({recipe}) => (
    <WithInvoiceDialogs>
      <RecipeCard recipe={recipe} />
    </WithInvoiceDialogs>
  ),
};

/** Recipe card with a very long title to exercise heading truncation/wrapping. */
export const LongTitleRecipe: Story = {
  render: ({recipe}) => (
    <WithInvoiceDialogs>
      <RecipeCard
        recipe={{
          ...recipe,
          name: "Slow-Roasted Mediterranean Vegetable & Halloumi Traybake with Lemon-Herb Dressing and Toasted Pine Nuts",
        }}
      />
    </WithInvoiceDialogs>
  ),
};

/** Recipe card with minimal ingredients list. */
export const MinimalIngredients: Story = {
  render: ({recipe}) => (
    <WithInvoiceDialogs>
      <RecipeCard
        recipe={{
          ...recipe,
          ingredients: ["Flour", "Water"],
        }}
      />
    </WithInvoiceDialogs>
  ),
};

/** Recipe card with many ingredients — overflow test. */
export const ManyIngredients: Story = {
  render: ({recipe}) => (
    <WithInvoiceDialogs>
      <RecipeCard
        recipe={{
          ...recipe,
          ingredients: Array.from({length: 25}, (_, i) => `Ingredient ${i + 1}`),
        }}
      />
    </WithInvoiceDialogs>
  ),
};

/** Recipe card with very long ingredient names. */
export const LongIngredientNames: Story = {
  render: ({recipe}) => (
    <WithInvoiceDialogs>
      <RecipeCard
        recipe={{
          ...recipe,
          ingredients: [
            "Extra Virgin Organic Cold-Pressed Mediterranean Olive Oil (First Harvest)",
            "Aged Parmigiano-Reggiano DOP 36-Month Matured Cheese (Finely Grated)",
            "Fresh Hand-Picked Heirloom Cherry Tomatoes (Vine-Ripened)",
          ],
        }}
      />
    </WithInvoiceDialogs>
  ),
};

/** Recipe card with zero cooking time. */
export const NoCookingTime: Story = {
  render: ({recipe}) => (
    <WithInvoiceDialogs>
      <RecipeCard
        recipe={{
          ...recipe,
          approximateTotalDuration: 0,
          preparationTime: 0,
          cookingTime: 0,
        }}
      />
    </WithInvoiceDialogs>
  ),
};

/** Recipe card with normal complexity level. */
export const NormalRecipe: Story = {
  render: ({recipe}) => (
    <WithInvoiceDialogs>
      <RecipeCard
        recipe={{
          ...recipe,
          complexity: 1,
        }}
      />
    </WithInvoiceDialogs>
  ),
  parameters: {
    docs: {
      description: {
        story: "Recipe with normal complexity level (middle tier).",
      },
    },
  },
};

/** Recipe with single ingredient. */
export const SingleIngredient: Story = {
  render: ({recipe}) => (
    <WithInvoiceDialogs>
      <RecipeCard
        recipe={{
          ...recipe,
          ingredients: ["Water"],
        }}
      />
    </WithInvoiceDialogs>
  ),
  parameters: {
    docs: {
      description: {
        story: "Recipe with only one ingredient to test minimal ingredients list.",
      },
    },
  },
};

/** Recipe with no instructions/description. */
export const NoDescription: Story = {
  render: ({recipe}) => (
    <WithInvoiceDialogs>
      <RecipeCard
        recipe={{
          ...recipe,
          description: "",
        }}
      />
    </WithInvoiceDialogs>
  ),
  parameters: {
    docs: {
      description: {
        story: "Recipe without a description to test empty description state.",
      },
    },
  },
};
