import type {Meta, StoryObj} from "@storybook/react";
import type {Recipe} from "@/types/invoices";
import RecipeCard from "./RecipeCard";
import {recipePresets, storyRecipeEasy, storyRecipeHard, WithInvoiceDialogs, withEntityPreset} from "../../../_storybook";

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
