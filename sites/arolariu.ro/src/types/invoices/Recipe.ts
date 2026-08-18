/**
 * @fileoverview Structured recipe-suggestion contracts returned by analysis.
 * @module types/invoices/Recipe
 */

import {isAllergenCode, type AllergenCodeValue} from "./Allergen";

/** Exact recipe difficulty values emitted by the backend. */
export const RecipeDifficulty = {
  Easy: "easy",
  Medium: "medium",
  Hard: "hard",
} as const;

/** Union of exact recipe difficulty strings. */
export type RecipeDifficultyValue = (typeof RecipeDifficulty)[keyof typeof RecipeDifficulty];

/** A named recipe ingredient with quantity and optional preparation guidance. */
export interface RecipeIngredient {
  /** Display name of the ingredient. */
  readonly name: string;
  /** Human-readable quantity expression. */
  readonly quantity: string;
  /** Optional preparation guidance. */
  readonly preparation: string | null;
}

/** One explicitly ordered recipe step. */
export interface RecipeStep {
  /** One-based ordering value emitted by analysis. */
  readonly sequence: number;
  /** Actionable cooking instruction. */
  readonly instruction: string;
  /** Optional clarifying note. */
  readonly notes: string | null;
}

/**
 * A structured recipe suggestion created from an invoice's purchased products.
 */
export interface RecipeSuggestion {
  /** Display name of the recipe. */
  readonly name: string;
  /** Short recipe summary. */
  readonly description: string;
  /** Number of servings. */
  readonly servings: number;
  /** Estimated active preparation time in minutes. */
  readonly preparationMinutes: number;
  /** Estimated cooking time in minutes. */
  readonly cookingMinutes: number;
  /** Estimated elapsed recipe time in minutes. */
  readonly totalMinutes: number;
  /** Preparation difficulty. */
  readonly difficulty: RecipeDifficultyValue;
  /** Ingredients fulfilled by items on the invoice. */
  readonly purchasedIngredients: readonly RecipeIngredient[];
  /** Ingredients assumed to be already available in the pantry. */
  readonly assumedPantryStaples: readonly RecipeIngredient[];
  /** Optional ingredients that are not represented by invoice items. */
  readonly missingOptionalIngredients: readonly RecipeIngredient[];
  /** Ordered cooking steps. */
  readonly steps: readonly RecipeStep[];
  /** Relevant EU-14 allergen warnings. */
  readonly allergenWarnings: readonly AllergenCodeValue[];
}

/** Input shape for a user-authored structured recipe draft. */
export type CreateRecipeDtoPayload = Partial<RecipeSuggestion>;

/** Input shape for updates to a user-authored structured recipe draft. */
export type UpdateRecipeDtoPayload = Partial<RecipeSuggestion>;

/** Identifies a recipe suggestion by its API-supported immutable name. */
export type DeleteRecipeDtoPayload = Readonly<{
  /** Exact recipe name to remove. */
  readonly name: string;
}>;

const difficultyValues: readonly string[] = Object.values(RecipeDifficulty);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(record: Readonly<Record<string, unknown>>, keys: readonly string[]): boolean {
  const actualKeys = Object.keys(record);
  return actualKeys.length === keys.length && actualKeys.every((key) => keys.includes(key));
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return isNonNegativeInteger(value) && value > 0;
}

/** Determines whether a value is an exact recipe difficulty string. */
export function isRecipeDifficulty(value: unknown): value is RecipeDifficultyValue {
  return typeof value === "string" && difficultyValues.includes(value);
}

/** Determines whether a value is one exact structured recipe ingredient. */
export function isRecipeIngredient(value: unknown): value is RecipeIngredient {
  return (
    isRecord(value)
    && hasExactKeys(value, ["name", "quantity", "preparation"])
    && isNonBlankString(value["name"])
    && isNonBlankString(value["quantity"])
    && (isNonBlankString(value["preparation"]) || value["preparation"] === null)
  );
}

/** Determines whether a value is one exact ordered recipe step. */
export function isRecipeStep(value: unknown): value is RecipeStep {
  return (
    isRecord(value)
    && hasExactKeys(value, ["sequence", "instruction", "notes"])
    && isNonNegativeInteger(value["sequence"])
    && value["sequence"] > 0
    && isNonBlankString(value["instruction"])
    && (isNonBlankString(value["notes"]) || value["notes"] === null)
  );
}

/** Determines whether a value is a complete structured recipe suggestion. */
export function isRecipeSuggestion(value: unknown): value is RecipeSuggestion {
  if (
    !isRecord(value)
    || !hasExactKeys(value, [
      "name",
      "description",
      "servings",
      "preparationMinutes",
      "cookingMinutes",
      "totalMinutes",
      "difficulty",
      "purchasedIngredients",
      "assumedPantryStaples",
      "missingOptionalIngredients",
      "steps",
      "allergenWarnings",
    ])
    || !isNonBlankString(value["name"])
    || !isNonBlankString(value["description"])
    || !isPositiveInteger(value["servings"])
    || !isNonNegativeInteger(value["preparationMinutes"])
    || !isNonNegativeInteger(value["cookingMinutes"])
    || !isNonNegativeInteger(value["totalMinutes"])
    || !isRecipeDifficulty(value["difficulty"])
    || !Array.isArray(value["purchasedIngredients"])
    || !value["purchasedIngredients"].every(isRecipeIngredient)
    || !Array.isArray(value["assumedPantryStaples"])
    || !value["assumedPantryStaples"].every(isRecipeIngredient)
    || !Array.isArray(value["missingOptionalIngredients"])
    || !value["missingOptionalIngredients"].every(isRecipeIngredient)
    || !Array.isArray(value["steps"])
    || value["steps"].length === 0
    || !value["steps"].every(isRecipeStep)
    || !Array.isArray(value["allergenWarnings"])
    || !value["allergenWarnings"].every(isAllergenCode)
  ) {
    return false;
  }

  return (
    value["totalMinutes"] >= value["preparationMinutes"] + value["cookingMinutes"]
    && value["steps"].every((step, index) => step.sequence === index + 1)
  );
}
