import type {Meta, StoryObj} from "@storybook/react";
import RecipeCard from "./RecipeCard";
import {storyRecipeEasy, storyRecipeHard} from "../../../_storybook/fixtures/recipeFixtures";
import {DialogProvider} from "../../../_contexts/DialogContext";

/**
 * RecipeCard displays a recipe with complexity badge, ingredients, timing,
 * and CRUD dropdown actions. It depends on `useDialog` for edit/delete/share.
 *
 * This story mounts the real component wrapped in DialogProvider.
 */
const meta = {
  title: "Invoices/EditInvoice/Cards/RecipeCard",
  component: RecipeCard,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof RecipeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recipe card with easy complexity level. */
export const EasyRecipe: Story = {
  render: () => (
    <DialogProvider>
      <RecipeCard recipe={storyRecipeEasy} />
    </DialogProvider>
  ),
};

/** Recipe card with hard complexity level. */
export const HardRecipe: Story = {
  render: () => (
    <DialogProvider>
      <RecipeCard recipe={storyRecipeHard} />
    </DialogProvider>
  ),
};
