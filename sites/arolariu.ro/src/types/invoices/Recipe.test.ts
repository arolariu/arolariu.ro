/**
 * @fileoverview Tests for the structured RecipeSuggestion model guards.
 * @module types/invoices/Recipe.test
 */

import {describe, expect, it} from "vitest";
import {isRecipeDifficulty, isRecipeSuggestion, isRecipeText} from "./Recipe";

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
