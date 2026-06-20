import type {Recipe} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogButton, playOpenDialog, recipePresets, storyRecipeEasy, storyRecipeHard, withEntityPreset} from "../../../_storybook";
import ShareRecipeDialog from "./ShareRecipeDialog";

type StoryArgs = {recipe: Recipe; recipePreset: "easy" | "hard"};

/**
 * ShareRecipeDialog allows users to share a recipe via URL.
 *
 * @remarks
 * Mounts the real ShareRecipeDialog via the OpenDialogButton harness. The `recipe`
 * object control (synced to the `recipePreset` select) configures the shared recipe.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Recipe/ShareRecipe",
  component: ShareRecipeDialog,
  parameters: {
    layout: "centered",
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
 * Default share recipe dialog.
 */
export const Default: Story = {
  play: playOpenDialog,
  render: ({recipe}) => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__RECIPE_SHARE'
      mode='share'
      payload={{recipe}}>
      <ShareRecipeDialog />
    </OpenDialogButton>
  ),
};

/**
 * Share dialog for a complex (hard) recipe.
 */
export const HardRecipe: Story = {
  args: {recipePreset: "hard", recipe: storyRecipeHard},
  play: playOpenDialog,
  render: ({recipe}) => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__RECIPE_SHARE'
      mode='share'
      payload={{recipe}}>
      <ShareRecipeDialog />
    </OpenDialogButton>
  ),
};

/** Share dialog for an easy recipe. */
export const EasyRecipe: Story = {
  args: {recipePreset: "easy", recipe: storyRecipeEasy},
  play: playOpenDialog,
  render: ({recipe}) => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__RECIPE_SHARE'
      mode='share'
      payload={{recipe}}>
      <ShareRecipeDialog />
    </OpenDialogButton>
  ),
};

/** Share dialog for a medium-complexity recipe. */
export const MediumRecipe: Story = {
  play: playOpenDialog,
  render: () => {
    const mediumRecipe: Recipe = {
      name: "Chicken Tikka Masala",
      description: "Popular Indian-British fusion dish",
      approximateTotalDuration: 45,
      complexity: 3,
      ingredients: ["Chicken", "Yogurt", "Tomato", "Cream", "Spices"],
      instructions: "Marinate chicken, grill, make sauce, combine",
      preparationTime: 20,
      cookingTime: 25,
      referenceForMoreDetails: "",
    };

    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__RECIPE_SHARE'
        mode='share'
        payload={{recipe: mediumRecipe}}>
        <ShareRecipeDialog />
      </OpenDialogButton>
    );
  },
};

/** Share dialog for a recipe with minimal details. */
export const MinimalRecipe: Story = {
  play: playOpenDialog,
  render: () => {
    const minimalRecipe: Recipe = {
      name: "Quick Salad",
      description: "",
      approximateTotalDuration: 5,
      complexity: 1,
      ingredients: ["Lettuce", "Tomato"],
      instructions: "",
      preparationTime: 5,
      cookingTime: 0,
      referenceForMoreDetails: "",
    };

    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__RECIPE_SHARE'
        mode='share'
        payload={{recipe: minimalRecipe}}>
        <ShareRecipeDialog />
      </OpenDialogButton>
    );
  },
};
