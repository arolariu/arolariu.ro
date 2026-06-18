import type {Recipe, RecipeComplexity} from "@/types/invoices/Recipe";
import type {Meta, StoryObj} from "@storybook/react";
import {OpenDialogButton, playOpenDialog, recipePresets, storyRecipeEasy, storyRecipeHard, withEntityPreset} from "../../../_storybook";
import PreviewRecipeDialog from "./PreviewRecipeDialog";

type StoryArgs = {recipe: Recipe; recipePreset: "easy" | "hard"};

/**
 * PreviewRecipeDialog allows users to view recipe details in read-only mode.
 *
 * @remarks
 * This story mounts the real PreviewRecipeDialog component with OpenDialogButton
 * harness, opening the dialog automatically on mount with a story recipe payload.
 * Displays recipe name, description, ingredients, complexity, instructions, and cooking times.
 */
const meta = {
  title: "arolariu.ro/IMS/Dialogs/Recipe/PreviewRecipe",
  component: PreviewRecipeDialog,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "PreviewRecipeDialog renders a read-only view of a recipe with all its details: name (as dialog title), "
          + "description, ingredients list, complexity badge (Easy/Normal/Hard with variant styling), cooking instructions, "
          + "preparation time, and cooking time with icon indicators. Includes graceful empty state fallbacks for optional fields, "
          + "displaying 'Not specified' or 'No description' when values are missing.",
      },
    },
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
 * Shows complete recipe with all fields populated.
 *
 * @remarks
 * Displays "Classic Scrambled Eggs" recipe with description, ingredients,
 * instructions, complexity badge, and cooking times.
 */
export const CompleteRecipe: Story = {
  play: playOpenDialog,
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the recipe preview dialog with a complete recipe ('Classic Scrambled Eggs') that has all fields populated: "
          + "description, 5 ingredients, detailed step-by-step instructions, Easy complexity badge (green variant), "
          + "3 minutes prep time, and 7 minutes cooking time. Shows the full-featured recipe display with all UI elements rendered.",
      },
    },
  },
  render: ({recipe}) => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__RECIPE_PREVIEW'
      mode='view'
      payload={{recipe}}>
      <PreviewRecipeDialog />
    </OpenDialogButton>
  ),
};

/**
 * Shows minimal recipe with only required fields.
 *
 * @remarks
 * Displays recipe with minimal data to demonstrate empty state fallbacks
 * for optional fields (description, instructions, times).
 */
export const MinimalRecipe: Story = {
  play: playOpenDialog,
  parameters: {
    docs: {
      description: {
        story:
          "Demonstrates the recipe preview dialog with a minimal recipe ('Simple Toast') that has only required fields populated. "
          + "Shows empty state fallbacks: 'No description' for missing description, 'Not specified' for missing instructions "
          + "and times, and just 2 ingredients. Useful for testing graceful degradation when optional recipe data is absent.",
      },
    },
  },
  render: () => {
    const minimalRecipe: Recipe = {
      name: "Simple Toast",
      description: "",
      approximateTotalDuration: 5,
      complexity: 1 as RecipeComplexity, // Easy
      ingredients: ["Bread", "Butter"],
      instructions: "",
      preparationTime: 0,
      cookingTime: 0,
      referenceForMoreDetails: "",
    };

    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__RECIPE_PREVIEW'
        mode='view'
        payload={{recipe: minimalRecipe}}>
        <PreviewRecipeDialog />
      </OpenDialogButton>
    );
  },
};

/** Preview dialog for a hard-complexity recipe with many ingredients. */
export const HardRecipe: Story = {
  args: {recipePreset: "hard", recipe: storyRecipeHard},
  play: playOpenDialog,
  render: ({recipe}) => (
    <OpenDialogButton
      dialog='EDIT_INVOICE__RECIPE_PREVIEW'
      mode='view'
      payload={{recipe}}>
      <PreviewRecipeDialog />
    </OpenDialogButton>
  ),
};

/** Preview dialog for a medium-complexity recipe. */
export const MediumRecipe: Story = {
  play: playOpenDialog,
  render: () => {
    const mediumRecipe: Recipe = {
      name: "Spaghetti Aglio e Olio",
      description: "Simple Italian pasta with garlic and oil",
      approximateTotalDuration: 20,
      complexity: 3 as RecipeComplexity,
      ingredients: ["Spaghetti", "Garlic", "Olive Oil", "Red Pepper Flakes", "Parsley"],
      instructions: "Boil pasta. Sauté garlic in oil. Toss pasta with garlic oil.",
      preparationTime: 5,
      cookingTime: 15,
      referenceForMoreDetails: "https://example.com/recipe",
    };

    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__RECIPE_PREVIEW'
        mode='view'
        payload={{recipe: mediumRecipe}}>
        <PreviewRecipeDialog />
      </OpenDialogButton>
    );
  },
};

/** Preview dialog for a recipe with very long name and description. */
export const LongContentRecipe: Story = {
  play: playOpenDialog,
  render: () => {
    const longRecipe: Recipe = {
      name: "Traditional Grandmother's Secret Family Recipe Ultra Premium Gourmet Specialty Dish with Exotic Imported Ingredients",
      description:
        "This is an extremely detailed and comprehensive recipe description that goes into great depth about the historical origins of the dish, the specific techniques required, and the cultural significance of each ingredient used in the preparation process.",
      approximateTotalDuration: 180,
      complexity: 5 as RecipeComplexity,
      ingredients: [
        "Ingredient One",
        "Ingredient Two",
        "Ingredient Three",
        "Ingredient Four",
        "Ingredient Five",
        "Ingredient Six",
        "Ingredient Seven",
        "Ingredient Eight",
      ],
      instructions: "Step 1: Very long instruction... Step 2: Another long instruction... Step 3: Even more detailed steps...",
      preparationTime: 60,
      cookingTime: 120,
      referenceForMoreDetails: "https://example.com/very-long-recipe-url",
    };

    return (
      <OpenDialogButton
        dialog='EDIT_INVOICE__RECIPE_PREVIEW'
        mode='view'
        payload={{recipe: longRecipe}}>
        <PreviewRecipeDialog />
      </OpenDialogButton>
    );
  },
};
