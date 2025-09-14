import type {Product} from "./index.ts";

/**
 * Enum representing the complexity of a recipe.
 */
export enum RecipeComplexity {
  Unknown = 0,
  Easy = 1,
  Normal = 2,
  Hard = 3,
}

/**
 * Represents a recipe from the invoice domain system.
 */
export type Recipe = {
  name: string;
  description: string;
  duration: string;
  complexity: RecipeComplexity;
  ingredients: Product[];
  instructions: string;
  preparationTime: number;
  cookingTime: number;
  referenceForMoreDetails: string;
};
