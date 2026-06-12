import type {Meta, StoryObj} from "@storybook/react";
import RecipeCard from "./RecipeCard";
import {storyRecipeEasy, storyRecipeHard, WithInvoiceDialogs} from "../../../_storybook";

/**
 * RecipeCard displays a recipe with complexity badge, ingredients, timing,
 * and CRUD dropdown actions. It depends on `useDialog` for edit/delete/share.
 *
 * This story mounts the real component wrapped in `WithInvoiceDialogs`.
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
  args: {
    recipe: storyRecipeEasy,
  },
  render: () => (
    <WithInvoiceDialogs>
      <RecipeCard recipe={storyRecipeEasy} />
    </WithInvoiceDialogs>
  ),
};

/** Recipe card with hard complexity level. */
export const HardRecipe: Story = {
  args: {
    recipe: storyRecipeHard,
  },
  render: () => (
    <WithInvoiceDialogs>
      <RecipeCard recipe={storyRecipeHard} />
    </WithInvoiceDialogs>
  ),
};
