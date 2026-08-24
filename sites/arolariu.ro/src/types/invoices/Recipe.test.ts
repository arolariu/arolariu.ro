/**
 * @fileoverview Tests for the structured RecipeSuggestion model guards.
 * @module types/invoices/Recipe.test
 */

import {describe, expect, it} from "vitest";
import {isRecipeSuggestion} from "./Recipe";

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

  it("rejects steps: [] (backend requires >= 1 step)", () => {
    expect(isRecipeSuggestion({...validRecipe, steps: []})).toBe(false);
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
        referenceForMoreDetails: "https://example.com",
      }),
    ).toBe(false);
  });
});
