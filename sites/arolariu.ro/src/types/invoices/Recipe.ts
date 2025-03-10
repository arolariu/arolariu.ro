/**
 * Represents a recipe from the invoice domain system.
 *
 * @format
 */

import type {Product} from "./index.ts";

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
  instructions: string;
  referenceForMoreDetails: string;
};
