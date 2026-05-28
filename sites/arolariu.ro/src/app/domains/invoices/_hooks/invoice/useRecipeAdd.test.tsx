/**
 * @fileoverview Unit tests for useRecipeAdd client hook.
 * @module app/domains/invoices/_hooks/invoice/useRecipeAdd.test
 */

import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useRecipeAdd} from "./useRecipeAdd";
import type {Recipe} from "@/types/invoices";
import {buildInvoice} from "../../../../../../tests/helpers/invoiceDomain";

// Mock dependencies
vi.mock("@/stores", () => ({
  useInvoicesStore: vi.fn(),
}));

vi.mock("next-intl-selector", () => ({
  useTranslations: vi.fn(() => () => "mock translation"),
}));

// Import mocked modules
const {useInvoicesStore} = await import("@/stores");

const mockUseInvoicesStore = vi.mocked(useInvoicesStore);

describe("useRecipeAdd", () => {
  const testRecipe: Recipe = {
    name: "Test Recipe",
    description: "A test recipe description",
    recipeIngredients: ["ingredient1", "ingredient2"],
    recipeSteps: ["step1", "step2"],
    cookingTime: 30,
    servings: 4,
  };

  const testInvoice = buildInvoice({
    id: "11111111-1111-4111-8111-111111111111",
    possibleRecipes: [],
  });

  const mockUpdateEntity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInvoicesStore.mockReturnValue(mockUpdateEntity);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("returns isAdding false initially", () => {
      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      expect(result.current.isAdding).toBe(false);
      expect(result.current.addRecipeCallback).toBeDefined();
    });

    it("returns addRecipeCallback function", () => {
      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      expect(typeof result.current.addRecipeCallback).toBe("function");
    });
  });

  describe("recipe addition", () => {
    it("successfully adds a recipe to empty list", async () => {
      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      const promise = result.current.addRecipeCallback(testRecipe);

      await waitFor(() => {
        expect(result.current.isAdding).toBe(true);
      });

      const updatedInvoice = await promise;

      await waitFor(() => {
        expect(result.current.isAdding).toBe(false);
      });

      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        possibleRecipes: [testRecipe],
      });

      expect(updatedInvoice.possibleRecipes).toEqual([testRecipe]);
      expect(updatedInvoice.id).toBe(testInvoice.id);
    });

    it("appends recipe to existing recipes", async () => {
      const existingRecipe: Recipe = {
        name: "Existing Recipe",
        description: "Existing description",
        recipeIngredients: ["existing"],
        recipeSteps: ["step"],
        cookingTime: 20,
        servings: 2,
      };

      const invoiceWithRecipes = buildInvoice({
        id: testInvoice.id,
        possibleRecipes: [existingRecipe],
      });

      const {result} = renderHook(() => useRecipeAdd(invoiceWithRecipes));

      const updatedInvoice = await result.current.addRecipeCallback(testRecipe);

      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        possibleRecipes: [existingRecipe, testRecipe],
      });

      expect(updatedInvoice.possibleRecipes).toHaveLength(2);
      expect(updatedInvoice.possibleRecipes).toContainEqual(existingRecipe);
      expect(updatedInvoice.possibleRecipes).toContainEqual(testRecipe);
    });

    it("allows duplicate recipe names", async () => {
      const recipe1: Recipe = {
        name: "Duplicate Name",
        description: "First version",
        recipeIngredients: ["ing1"],
        recipeSteps: ["step1"],
        cookingTime: 10,
        servings: 1,
      };

      const invoiceWithRecipe = buildInvoice({
        id: testInvoice.id,
        possibleRecipes: [recipe1],
      });

      const recipe2: Recipe = {
        ...recipe1,
        description: "Second version",
      };

      const {result} = renderHook(() => useRecipeAdd(invoiceWithRecipe));

      const updatedInvoice = await result.current.addRecipeCallback(recipe2);

      expect(updatedInvoice.possibleRecipes).toHaveLength(2);
    });

    it("preserves invoice properties other than recipes", async () => {
      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      const updatedInvoice = await result.current.addRecipeCallback(testRecipe);

      expect(updatedInvoice.id).toBe(testInvoice.id);
      expect(updatedInvoice.name).toBe(testInvoice.name);
      expect(updatedInvoice.items).toEqual(testInvoice.items);
    });

    it("returns updated invoice snapshot", async () => {
      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      const updatedInvoice = await result.current.addRecipeCallback(testRecipe);

      expect(updatedInvoice).toBeDefined();
      expect(updatedInvoice.possibleRecipes).toContainEqual(testRecipe);
    });
  });

  describe("loading state management", () => {
    it("sets isAdding true during addition", async () => {
      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      const promise = result.current.addRecipeCallback(testRecipe);

      await waitFor(() => {
        expect(result.current.isAdding).toBe(true);
      });

      await promise;

      await waitFor(() => {
        expect(result.current.isAdding).toBe(false);
      });
    });

    it("resets isAdding even if store update throws", async () => {
      mockUpdateEntity.mockImplementation(() => {
        throw new Error("Store error");
      });

      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      await expect(async () => {
        await result.current.addRecipeCallback(testRecipe);
      }).rejects.toThrow("Store error");

      await waitFor(() => {
        expect(result.current.isAdding).toBe(false);
      });
    });
  });

  describe("store integration", () => {
    it("calls updateEntity with correct invoice id", async () => {
      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      await result.current.addRecipeCallback(testRecipe);

      expect(mockUpdateEntity).toHaveBeenCalledWith(
        testInvoice.id,
        expect.objectContaining({
          possibleRecipes: expect.any(Array),
        }),
      );
    });

    it("calls updateEntity exactly once per add operation", async () => {
      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      await result.current.addRecipeCallback(testRecipe);

      expect(mockUpdateEntity).toHaveBeenCalledTimes(1);
    });

    it("does not mutate original invoice", async () => {
      const originalRecipes = testInvoice.possibleRecipes;
      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      await result.current.addRecipeCallback(testRecipe);

      expect(testInvoice.possibleRecipes).toBe(originalRecipes);
      expect(testInvoice.possibleRecipes).not.toContainEqual(testRecipe);
    });
  });

  describe("recipe data integrity", () => {
    it("preserves all recipe properties", async () => {
      const complexRecipe: Recipe = {
        name: "Complex Recipe",
        description: "Detailed description",
        recipeIngredients: ["ing1", "ing2", "ing3"],
        recipeSteps: ["step1", "step2", "step3", "step4"],
        cookingTime: 60,
        servings: 6,
        prepTime: 15,
        calories: 450,
        difficulty: "Medium",
      };

      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      const updatedInvoice = await result.current.addRecipeCallback(complexRecipe);

      const addedRecipe = updatedInvoice.possibleRecipes[0];
      expect(addedRecipe).toEqual(complexRecipe);
    });

    it("handles recipe with minimal required fields", async () => {
      const minimalRecipe: Recipe = {
        name: "Minimal Recipe",
        description: "",
        recipeIngredients: [],
        recipeSteps: [],
        cookingTime: 0,
        servings: 0,
      };

      const {result} = renderHook(() => useRecipeAdd(testInvoice));

      const updatedInvoice = await result.current.addRecipeCallback(minimalRecipe);

      expect(updatedInvoice.possibleRecipes).toContainEqual(minimalRecipe);
    });
  });

  describe("multiple additions", () => {
    it("handles sequential recipe additions", async () => {
      const recipe1: Recipe = {
        name: "Recipe 1",
        description: "First",
        recipeIngredients: ["a"],
        recipeSteps: ["1"],
        cookingTime: 10,
        servings: 1,
      };

      const recipe2: Recipe = {
        name: "Recipe 2",
        description: "Second",
        recipeIngredients: ["b"],
        recipeSteps: ["2"],
        cookingTime: 20,
        servings: 2,
      };

      const {result, rerender} = renderHook(
        ({invoice}) => useRecipeAdd(invoice),
        {initialProps: {invoice: testInvoice}},
      );

      const updated1 = await result.current.addRecipeCallback(recipe1);
      rerender({invoice: updated1});

      const updated2 = await result.current.addRecipeCallback(recipe2);

      expect(updated2.possibleRecipes).toHaveLength(2);
      expect(updated2.possibleRecipes).toContainEqual(recipe1);
      expect(updated2.possibleRecipes).toContainEqual(recipe2);
    });
  });
});
