import type {Product} from "./index.ts";

/**
 * Enum representing the complexity of a recipe.
 */
export enum RecipeComplexity {
  /** Unknown complexity */
  Unknown = 0,

  /** Easy complexity */
  Easy = 1,

  /** Normal complexity */
  Normal = 2,

  /** Hard complexity */
  Hard = 3,
}

/**
 * Represents a recipe from the invoice domain system.
 */
export type Recipe = {
  /** The name of the recipe. */
  name: string;

  /** The description of the recipe. */
  description: string;

  /** The duration of the recipe, in minutes */
  duration: number;

  /** The complexity level of the recipe. */
  complexity: RecipeComplexity;

  /** The list of ingredients for the recipe. */
  ingredients: Product[];

  /** The cooking instructions for the recipe. */
  instructions: string;

  /** The preparation time for the recipe, in minutes */
  preparationTime: number;

  /** The cooking time for the recipe, in minutes */
  cookingTime: number;

  /** A reference for more details about the recipe. */
  referenceForMoreDetails: string;
};

export type CreateRecipeDtoPayload = Partial<Recipe>;
export type UpdateRecipeDtoPayload = Partial<Recipe>;
export type DeleteRecipeDtoPayload = {name: string};
