/**
 * Represents a recipe from the invoice domain system.
 *
 * @format
 */

export enum RecipeComplexity {
  Unknown = 0,
  Easy = 1,
  Normal = 2,
  Hard = 3,
}

export type Recipe = {
  name: string;
  duration: string;
  complexity: RecipeComplexity;
  recipeIngredients: string[];
  observations: string[];
};
