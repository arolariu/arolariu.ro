/**
 * Represents a recipe from the invoice domain system.
 *
 * @format
 */

import Product from "./Product";

export enum RecipeComplexity {
  Unknown = 0,
  Easy = 1,
  Normal = 2,
  Hard = 3,
}

export type Recipe = {
  name: string;
  description: string;
  duration: string;
  complexity: RecipeComplexity;
  ingredients: Product[];
  referenceForMoreDetails: string;
};
