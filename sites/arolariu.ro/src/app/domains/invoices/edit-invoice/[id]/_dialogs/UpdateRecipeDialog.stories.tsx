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

/** Update recipe dialog with medium-complexity recipe. */
export const MediumRecipe: Story = {
  play: playOpenDialog,
  render: () => {
    const mediumRecipe: Recipe = {
      name: "Risotto Milanese",
      description: "Creamy Italian rice dish with saffron",
      approximateTotalDuration: 40,
      complexity: 3,
      ingredients: ["Arborio Rice", "Saffron", "Parmesan", "White Wine", "Broth"],
      instructions: "Toast rice, add wine, gradually add broth while stirring",
      preparationTime: 10,
      cookingTime: 30,
      referenceForMoreDetails: "https://example.com/risotto",
    };

    return (
      <WithEditInvoiceContext>
        <OpenDialogButton
          dialog='EDIT_INVOICE__RECIPE_UPDATE'
          mode='edit'
          payload={{recipe: mediumRecipe}}>
          <UpdateRecipeDialog />
        </OpenDialogButton>
      </WithEditInvoiceContext>
    );
  },
};

/** Update recipe dialog with minimal recipe data. */
export const MinimalRecipe: Story = {
  play: playOpenDialog,
  render: () => {
    const minimalRecipe: Recipe = {
      name: "Cereal Bowl",
      description: "",
      approximateTotalDuration: 2,
      complexity: 1,
      ingredients: ["Cereal", "Milk"],
      instructions: "",
      preparationTime: 2,
      cookingTime: 0,
      referenceForMoreDetails: "",
    };

    return (
      <WithEditInvoiceContext>
        <OpenDialogButton
          dialog='EDIT_INVOICE__RECIPE_UPDATE'
          mode='edit'
          payload={{recipe: minimalRecipe}}>
          <UpdateRecipeDialog />
        </OpenDialogButton>
      </WithEditInvoiceContext>
    );
  },
};
