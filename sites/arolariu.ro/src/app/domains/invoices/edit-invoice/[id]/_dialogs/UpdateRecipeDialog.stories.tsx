import type {Recipe} from "@/types/invoices";
import type {Meta, StoryObj} from "@storybook/react";
import {
  OpenDialogButton,
  playOpenDialog,
  recipePresets,
  storyRecipeEasy,
  storyRecipeHard,
  WithEditInvoiceContext,
  withEntityPreset,
} from "../../../_storybook";
import UpdateRecipeDialog from "./UpdateRecipeDialog";

type StoryArgs = {recipe: Recipe; recipePreset: "easy" | "hard"};

/**
 * UpdateRecipeDialog allows users to edit an existing recipe.
 *
 * @remarks
 * This story mounts the real UpdateRecipeDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story recipe payload.
 * Wrapped with EditInvoiceContextProvider to provide required context.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Recipe/UpdateRecipe",
  component: UpdateRecipeDialog,
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
 * Default edit recipe dialog.
 */
export const Default: Story = {
  play: playOpenDialog,
  render: ({recipe}) => (
    <WithEditInvoiceContext>
      <OpenDialogButton
        dialog='EDIT_INVOICE__RECIPE_UPDATE'
        mode='edit'
        payload={{recipe}}>
        <UpdateRecipeDialog />
      </OpenDialogButton>
    </WithEditInvoiceContext>
  ),
};

/**
 * Edit dialog pre-filled with a complex (hard) recipe.
 */
export const HardRecipe: Story = {
  args: {recipePreset: "hard", recipe: storyRecipeHard},
  play: playOpenDialog,
  render: ({recipe}) => (
    <WithEditInvoiceContext>
      <OpenDialogButton
        dialog='EDIT_INVOICE__RECIPE_UPDATE'
        mode='edit'
        payload={{recipe}}>
        <UpdateRecipeDialog />
      </OpenDialogButton>
    </WithEditInvoiceContext>
  ),
};

/** Update recipe dialog with a simple easy recipe. */
export const SimpleRecipe: Story = {
  args: {recipePreset: "easy", recipe: storyRecipeEasy},
  play: playOpenDialog,
  render: ({recipe}) => (
    <WithEditInvoiceContext>
      <OpenDialogButton
        dialog='EDIT_INVOICE__RECIPE_UPDATE'
        mode='edit'
        payload={{recipe}}>
        <UpdateRecipeDialog />
      </OpenDialogButton>
    </WithEditInvoiceContext>
  ),
};
