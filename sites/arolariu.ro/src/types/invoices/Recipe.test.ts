import {buildRecipe} from "../../../tests/helpers/builders/domain";
import {describe, expect, it} from "vitest";
import {isRecipeSuggestion} from "./Recipe";

describe("recipe response guard", () => {
  it("accepts a complete valid recipe suggestion", () => {
    expect(isRecipeSuggestion(buildRecipe())).toBe(true);
  });

  it.each([
    ["zero servings", buildRecipe({servings: 0})],
    ["no steps", buildRecipe({steps: []})],
    ["non-contiguous steps", buildRecipe({steps: [{sequence: 2, instruction: "Serve.", notes: null}]})],
    ["inconsistent total time", buildRecipe({preparationMinutes: 10, cookingMinutes: 20, totalMinutes: 29})],
  ])("rejects a recipe with %s", (_reason, recipe) => {
    expect(isRecipeSuggestion(recipe)).toBe(false);
  });
});
