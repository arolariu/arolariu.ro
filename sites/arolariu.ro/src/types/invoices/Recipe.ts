/**
 * Represents a recipe from the invoice domain system.
 *
 * @format
 */

import type Product from "./Product";

export type Recipe = {
  name: string;
  duration: string;
  complexity: number;
  recipeIngredients: Product[];
  observations: string[];
};
