/**
 * @fileoverview Recipe type definitions for AI-generated cooking suggestions.
 * @module types/invoices/Recipe
 *
 * @remarks
 * This module defines recipe types for cooking suggestions generated from
 * invoice products. Recipes are AI-generated recommendations based on
 * purchased ingredients.
 *
 * **Generation Process:**
 * 1. AI analyzes products in invoice items
 * 2. Matches against recipe database using ingredient compatibility
 * 3. Filters by missing ingredient count
 * 4. Ranks by complexity and user preferences
 *
 * **Use Cases:**
 * - Meal planning from grocery purchases
 * - Reducing food waste by suggesting recipes for perishables
 * - Discovering new recipes based on available ingredients
 *
 * @see {@link Invoice.possibleRecipes} for recipe attachment
 * @see {@link Product} for ingredient source
 */

import {type AllergenCode, isAllergenCode} from "./Allergen";
import {hasOnlyKeys, isArrayOf, isFiniteNumber, isNonEmptyString, isRecord} from "../guards";

// ============================================================
// Structured Recipe Suggestion Model (current API contract)
// ============================================================

/**
 * Difficulty level of a recipe as returned by the backend.
 *
 * @remarks
 * Matches the wire strings emitted by `RecipeSuggestionResponseDto` on the backend.
 * `Easy` → `"easy"`, `Medium` → `"medium"`, `Hard` → `"hard"`.
 *
 * @example
 * ```typescript
 * const level: RecipeDifficulty = RecipeDifficulty.Medium;
 * ```
 */
const RECIPE_DIFFICULTY = {
  /** Beginner-friendly recipe with simple techniques. */
  Easy: "easy",
  /** Moderate skill required; some cooking techniques. */
  Medium: "medium",
  /** Advanced techniques and multiple complex steps. */
  Hard: "hard",
} as const;

export {RECIPE_DIFFICULTY as RecipeDifficulty};

/** Union of recipe difficulty wire strings. */
export type RecipeDifficulty = (typeof RECIPE_DIFFICULTY)[keyof typeof RECIPE_DIFFICULTY];

/**
 * A single ingredient used in a {@link RecipeSuggestion}.
 *
 * @remarks
 * Mirrors the nested ingredient sub-shape of `RecipeSuggestionResponseDto`.
 * `preparation` is `null` when no specific preparation step is required.
 */
export type RecipeIngredient = {
  /** The ingredient name (e.g. `"Tomatoes"`). */
  readonly name: string;
  /** Measurement quantity (e.g. `"500 g"`). */
  readonly quantity: string;
  /** Optional preparation note (e.g. `"diced"`); `null` when absent. */
  readonly preparation: string | null;
};

/**
 * A single step in the cooking instructions of a {@link RecipeSuggestion}.
 *
 * @remarks
 * Steps are 1-indexed; `sequence` is the step number as emitted by the backend.
 * `notes` is `null` when the backend provides no supplemental note for this step.
 */
export type RecipeStep = {
  /** 1-based position of this step in the instruction sequence. */
  readonly sequence: number;
  /** Human-readable instruction for this step. */
  readonly instruction: string;
  /** Optional supplemental note for this step; `null` when absent. */
  readonly notes: string | null;
};

/**
 * Structured recipe suggestion returned by the backend analysis pipeline.
 *
 * @remarks
 * Mirrors `RecipeSuggestionResponseDto` field-for-field so that a
 * read-modify-write round trip is lossless: every JSON property name in this
 * interface matches the .NET DTO exactly. Do **not** rename fields.
 *
 * Field inventory (12 fields):
 * `name`, `description`, `servings`, `preparationMinutes`, `cookingMinutes`,
 * `totalMinutes`, `difficulty`, `purchasedIngredients`, `assumedPantryStaples`,
 * `missingOptionalIngredients`, `steps`, `allergenWarnings`.
 *
 * @see {@link RecipeDifficulty} for allowed difficulty values
 * @see {@link RecipeIngredient} for ingredient sub-shape
 * @see {@link RecipeStep} for step sub-shape
 * @see {@link AllergenCode} for allergen warning codes
 */
export type RecipeSuggestion = {
  /** Display name of the recipe. Must be non-empty. */
  readonly name: string;
  /** Short description of the recipe. Must contain non-whitespace text. */
  readonly description: string;
  /** Number of servings this recipe yields. */
  readonly servings: number;
  /** Time spent on active preparation, in minutes. */
  readonly preparationMinutes: number;
  /** Time spent on cooking (passive), in minutes. */
  readonly cookingMinutes: number;
  /** Total time = preparationMinutes + cookingMinutes, in minutes. */
  readonly totalMinutes: number;
  /** Difficulty classification of this recipe. */
  readonly difficulty: RecipeDifficulty;
  /** Ingredients found among the invoice's purchased products. */
  readonly purchasedIngredients: readonly RecipeIngredient[];
  /** Common pantry staples assumed to be on hand (not on the invoice). */
  readonly assumedPantryStaples: readonly RecipeIngredient[];
  /** Optional ingredients not present on the invoice. */
  readonly missingOptionalIngredients: readonly RecipeIngredient[];
  /** Ordered cooking instructions. Backend invariant: at least one step required. */
  readonly steps: readonly RecipeStep[];
  /** EU-14 allergen codes present in this recipe. */
  readonly allergenWarnings: readonly AllergenCode[];
};

// Guard helpers (module-private)
const recipeDifficultyValues: readonly string[] = Object.values(RECIPE_DIFFICULTY);
const RECIPE_SUGGESTION_KEYS = [
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
] as const;

/**
 * Determines whether a value is a supported recipe difficulty wire string.
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` is one of the backend-supported difficulty values.
 */
export function isRecipeDifficulty(value: unknown): value is RecipeDifficulty {
  return typeof value === "string" && recipeDifficultyValues.includes(value);
}

/**
 * Determines whether a value satisfies the backend's required recipe-text invariant.
 *
 * @param value - The candidate recipe name or description.
 * @returns `true` for non-empty, non-whitespace text.
 */
export function isRecipeText(value: unknown): value is string {
  return isNonEmptyString(value);
}

/**
 * Determines whether a value conforms to {@link RecipeIngredient}.
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` is a plain object with valid `name`, `quantity`, and `preparation` fields.
 */
export function isRecipeIngredient(value: unknown): value is RecipeIngredient {
  if (!isRecord(value) || !hasOnlyKeys(value, ["name", "quantity", "preparation"])) {
    return false;
  }
  return (
    isNonEmptyString(value["name"])
    && isNonEmptyString(value["quantity"])
    && (value["preparation"] === null || typeof value["preparation"] === "string")
  );
}

/**
 * Determines whether a value conforms to {@link RecipeStep}.
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` is a plain object with valid `sequence`, `instruction`, and `notes` fields.
 */
export function isRecipeStep(value: unknown): value is RecipeStep {
  if (!isRecord(value) || !hasOnlyKeys(value, ["sequence", "instruction", "notes"])) {
    return false;
  }
  return (
    isFiniteNumber(value["sequence"])
    && isNonEmptyString(value["instruction"])
    && (value["notes"] === null || typeof value["notes"] === "string")
  );
}

/**
 * Determines whether a value conforms to {@link RecipeSuggestion}.
 *
 * @remarks
 * Validates all 12 backend JSON field names and their types. Enforces the
 * backend invariant that `steps` must contain at least one entry. Entries in
 * `allergenWarnings` are validated against the EU-14 canonical codes via
 * {@link isAllergenCode}.
 *
 * @param value - The unknown value to test.
 * @returns `true` when `value` is a structurally valid {@link RecipeSuggestion}.
 */
export function isRecipeSuggestion(value: unknown): value is RecipeSuggestion {
  if (!isRecord(value) || !hasOnlyKeys(value, RECIPE_SUGGESTION_KEYS)) {
    return false;
  }
  const rawSteps = value["steps"];
  return (
    isRecipeText(value["name"])
    && isRecipeText(value["description"])
    && isFiniteNumber(value["servings"])
    && isFiniteNumber(value["preparationMinutes"])
    && isFiniteNumber(value["cookingMinutes"])
    && isFiniteNumber(value["totalMinutes"])
    && isRecipeDifficulty(value["difficulty"])
    && isArrayOf(value["purchasedIngredients"], isRecipeIngredient)
    && isArrayOf(value["assumedPantryStaples"], isRecipeIngredient)
    && isArrayOf(value["missingOptionalIngredients"], isRecipeIngredient)
    && Array.isArray(rawSteps)
    && rawSteps.length > 0
    && isArrayOf(rawSteps, isRecipeStep)
    && isArrayOf(value["allergenWarnings"], isAllergenCode)
  );
}
