/**
 * @fileoverview Tests for the structured RecipeSuggestion model guards.
 * @module types/invoices/Recipe.test
 */

import {describe, expect, it} from "vitest";
import {hasValidRecipeTiming, isNonNegativeInteger, isRecipeDifficulty, isRecipeSuggestion, isRecipeText} from "./Recipe";

// ---------------------------------------------------------------------------
// Shared fixtures (no `any` — passed directly to `unknown`-parameter guards)
// ---------------------------------------------------------------------------

const validRecipe = {
  name: "Tomato soup",
  description: "A warm bowl.",
  servings: 2,
  preparationMinutes: 10,
  cookingMinutes: 20,
  totalMinutes: 30,
  difficulty: "easy",
  purchasedIngredients: [{name: "Tomatoes", quantity: "500 g", preparation: "diced"}],
  assumedPantryStaples: [],
  missingOptionalIngredients: [],
  steps: [{sequence: 1, instruction: "Simmer the tomatoes.", notes: null}],
  allergenWarnings: ["celery"],
};

// ---------------------------------------------------------------------------

describe("isRecipeSuggestion", () => {
  it("accepts the valid fixture", () => {
    expect(isRecipeSuggestion(validRecipe)).toBe(true);
  });

  describe("isRecipeDifficulty", () => {
    it("accepts supported values and rejects unknown values", () => {
      expect(isRecipeDifficulty("easy")).toBe(true);
      expect(isRecipeDifficulty("medium")).toBe(true);
      expect(isRecipeDifficulty("hard")).toBe(true);
      expect(isRecipeDifficulty("trivial")).toBe(false);
    });
  });

  it("accepts empty ingredient sections and empty allergenWarnings", () => {
    expect(
      isRecipeSuggestion({
        ...validRecipe,
        purchasedIngredients: [],
        assumedPantryStaples: [],
        missingOptionalIngredients: [],
        allergenWarnings: [],
      }),
    ).toBe(true);
  });

  it("rejects difficulty: 'trivial'", () => {
    expect(isRecipeSuggestion({...validRecipe, difficulty: "trivial"})).toBe(false);
  });

  it.each(["", "   "])("rejects a blank recipe name: %j", (name) => {
    expect(isRecipeSuggestion({...validRecipe, name})).toBe(false);
  });

  it.each(["", "   "])("rejects a blank recipe description: %j", (description) => {
    expect(isRecipeSuggestion({...validRecipe, description})).toBe(false);
  });

  it("rejects steps: [] (backend requires >= 1 step)", () => {
    expect(isRecipeSuggestion({...validRecipe, steps: []})).toBe(false);
  });

  it.each([
    ["preparationMinutes", -1],
    ["preparationMinutes", 1.5],
    ["cookingMinutes", -1],
    ["cookingMinutes", 1.5],
    ["totalMinutes", -1],
    ["totalMinutes", 1.5],
  ] as const)("rejects invalid %s values", (field, value) => {
    expect(isRecipeSuggestion({...validRecipe, [field]: value})).toBe(false);
  });

  it("rejects total minutes below preparation plus cooking minutes", () => {
    expect(isRecipeSuggestion({...validRecipe, totalMinutes: 29})).toBe(false);
  });

  it.each([0, -1, 1.5])("rejects invalid servings: %s", (servings) => {
    expect(isRecipeSuggestion({...validRecipe, servings})).toBe(false);
  });

  it.each(["", "   "])("rejects a retained ingredient with blank quantity: %j", (quantity) => {
    expect(
      isRecipeSuggestion({
        ...validRecipe,
        purchasedIngredients: [{name: "Tomatoes", quantity, preparation: null}],
      }),
    ).toBe(false);
  });

  it.each([0, -1, 1.5])("rejects a recipe step sequence that is not a positive integer: %s", (sequence) => {
    expect(
      isRecipeSuggestion({
        ...validRecipe,
        steps: [{sequence, instruction: "Simmer the tomatoes.", notes: null}],
      }),
    ).toBe(false);
  });

  describe("recipe timing guards", () => {
    it("accepts only non-negative integers", () => {
      expect(isNonNegativeInteger(0)).toBe(true);
      expect(isNonNegativeInteger(10)).toBe(true);
      expect(isNonNegativeInteger(-1)).toBe(false);
      expect(isNonNegativeInteger(1.5)).toBe(false);
      expect(isNonNegativeInteger(Number.NaN)).toBe(false);
    });

    it("requires total time to cover preparation plus cooking", () => {
      expect(hasValidRecipeTiming(10, 20, 30)).toBe(true);
      expect(hasValidRecipeTiming(10, 20, 29)).toBe(false);
      expect(hasValidRecipeTiming(-1, 20, 30)).toBe(false);
      expect(hasValidRecipeTiming(10.5, 20, 31)).toBe(false);
    });
  });

  describe("isRecipeText", () => {
    it("accepts non-whitespace text and rejects blank values", () => {
      expect(isRecipeText("Dinner")).toBe(true);
      expect(isRecipeText("   ")).toBe(false);
      expect(isRecipeText("")).toBe(false);
    });
  });

  it("rejects allergenWarnings: ['gluten'] (not a canonical EU-14 code)", () => {
    expect(isRecipeSuggestion({...validRecipe, allergenWarnings: ["gluten"]})).toBe(false);
  });

  it("rejects the legacy flat Recipe shape", () => {
    expect(
      isRecipeSuggestion({
        name: "Old",
        description: "Legacy",
        approximateTotalDuration: 25,
        complexity: 1,
        ingredients: ["Pasta"],
        instructions: "Cook it.",
        preparationTime: 10,
        cookingTime: 15,
        externalUrl: "https://example.com",
      }),
    ).toBe(false);
  });
});
