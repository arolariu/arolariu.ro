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
