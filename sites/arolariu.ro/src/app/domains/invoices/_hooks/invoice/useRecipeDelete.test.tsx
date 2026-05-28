/**
 * @fileoverview Unit tests for useRecipeDelete client hook.
 * @module app/domains/invoices/_hooks/invoice/useRecipeDelete.test
 */

import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {useRecipeDelete} from "./useRecipeDelete";
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

describe("useRecipeDelete", () => {
  const testRecipes: Recipe[] = [
    {
      name: "Recipe 1",
      description: "First recipe",
      recipeIngredients: ["ing1"],
      recipeSteps: ["step1"],
      cookingTime: 10,
      servings: 1,
    },
    {
      name: "Recipe 2",
      description: "Second recipe",
      recipeIngredients: ["ing2"],
      recipeSteps: ["step2"],
      cookingTime: 20,
      servings: 2,
    },
    {
      name: "Recipe 3",
      description: "Third recipe",
      recipeIngredients: ["ing3"],
      recipeSteps: ["step3"],
      cookingTime: 30,
      servings: 3,
    },
  ];

  const testInvoice = buildInvoice({
    id: "11111111-1111-4111-8111-111111111111",
    possibleRecipes: testRecipes,
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
    it("returns isDeleting false initially", () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      expect(result.current.isDeleting).toBe(false);
      expect(result.current.removeRecipeCallback).toBeDefined();
    });

    it("returns removeRecipeCallback function", () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      expect(typeof result.current.removeRecipeCallback).toBe("function");
    });
  });

  describe("recipe deletion", () => {
    it("successfully removes a recipe by name", async () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      const promise = result.current.removeRecipeCallback("Recipe 2");

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true);
      });

      const updatedInvoice = await promise;

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });

      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        possibleRecipes: [testRecipes[0], testRecipes[2]],
      });

      expect(updatedInvoice.possibleRecipes).toHaveLength(2);
      expect(updatedInvoice.possibleRecipes).not.toContainEqual(testRecipes[1]);
    });

    it("removes first recipe when matched", async () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      const updatedInvoice = await result.current.removeRecipeCallback("Recipe 1");

      expect(updatedInvoice.possibleRecipes).toEqual([testRecipes[1], testRecipes[2]]);
    });

    it("removes last recipe when matched", async () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      const updatedInvoice = await result.current.removeRecipeCallback("Recipe 3");

      expect(updatedInvoice.possibleRecipes).toEqual([testRecipes[0], testRecipes[1]]);
    });

    it("removes all recipes with matching name", async () => {
      const duplicateRecipes: Recipe[] = [
        {...testRecipes[0], name: "Duplicate"},
        {...testRecipes[1], name: "Duplicate"},
        {...testRecipes[2], name: "Unique"},
      ];

      const invoiceWithDuplicates = buildInvoice({
        id: testInvoice.id,
        possibleRecipes: duplicateRecipes,
      });

      const {result} = renderHook(() => useRecipeDelete(invoiceWithDuplicates));

      const updatedInvoice = await result.current.removeRecipeCallback("Duplicate");

      expect(updatedInvoice.possibleRecipes).toHaveLength(1);
      expect(updatedInvoice.possibleRecipes[0]?.name).toBe("Unique");
    });

    it("returns invoice unchanged when recipe not found", async () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      const updatedInvoice = await result.current.removeRecipeCallback("Nonexistent Recipe");

      expect(updatedInvoice.possibleRecipes).toEqual(testRecipes);
      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        possibleRecipes: testRecipes,
      });
    });

    it("handles removal from empty recipe list", async () => {
      const emptyInvoice = buildInvoice({
        id: testInvoice.id,
        possibleRecipes: [],
      });

      const {result} = renderHook(() => useRecipeDelete(emptyInvoice));

      const updatedInvoice = await result.current.removeRecipeCallback("Any Recipe");

      expect(updatedInvoice.possibleRecipes).toEqual([]);
    });

    it("preserves invoice properties other than recipes", async () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      const updatedInvoice = await result.current.removeRecipeCallback("Recipe 1");

      expect(updatedInvoice.id).toBe(testInvoice.id);
      expect(updatedInvoice.name).toBe(testInvoice.name);
      expect(updatedInvoice.items).toEqual(testInvoice.items);
    });

    it("is case-sensitive for recipe names", async () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      const updatedInvoice = await result.current.removeRecipeCallback("recipe 1");

      expect(updatedInvoice.possibleRecipes).toEqual(testRecipes);
    });
  });

  describe("loading state management", () => {
    it("sets isDeleting true during deletion", async () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      const promise = result.current.removeRecipeCallback("Recipe 1");

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(true);
      });

      await promise;

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });

    it("resets isDeleting even if store update throws", async () => {
      mockUpdateEntity.mockImplementation(() => {
        throw new Error("Store error");
      });

      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      await expect(async () => {
        await result.current.removeRecipeCallback("Recipe 1");
      }).rejects.toThrow("Store error");

      await waitFor(() => {
        expect(result.current.isDeleting).toBe(false);
      });
    });
  });

  describe("store integration", () => {
    it("calls updateEntity with correct invoice id", async () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      await result.current.removeRecipeCallback("Recipe 1");

      expect(mockUpdateEntity).toHaveBeenCalledWith(
        testInvoice.id,
        expect.objectContaining({
          possibleRecipes: expect.any(Array),
        }),
      );
    });

    it("calls updateEntity exactly once per delete operation", async () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      await result.current.removeRecipeCallback("Recipe 1");

      expect(mockUpdateEntity).toHaveBeenCalledTimes(1);
    });

    it("does not mutate original invoice", async () => {
      const originalRecipes = testInvoice.possibleRecipes;
      const {result} = renderHook(() => useRecipeDelete(testInvoice));

      await result.current.removeRecipeCallback("Recipe 1");

      expect(testInvoice.possibleRecipes).toBe(originalRecipes);
      expect(testInvoice.possibleRecipes).toHaveLength(3);
    });
  });

  describe("multiple deletions", () => {
    it("handles sequential recipe deletions", async () => {
      const {result, rerender} = renderHook(
        ({invoice}) => useRecipeDelete(invoice),
        {initialProps: {invoice: testInvoice}},
      );

      const updated1 = await result.current.removeRecipeCallback("Recipe 1");
      rerender({invoice: updated1});

      const updated2 = await result.current.removeRecipeCallback("Recipe 2");

      expect(updated2.possibleRecipes).toHaveLength(1);
      expect(updated2.possibleRecipes[0]?.name).toBe("Recipe 3");
    });

    it("can remove all recipes sequentially", async () => {
      const {result, rerender} = renderHook(
        ({invoice}) => useRecipeDelete(invoice),
        {initialProps: {invoice: testInvoice}},
      );

      let current = await result.current.removeRecipeCallback("Recipe 1");
      rerender({invoice: current});

      current = await result.current.removeRecipeCallback("Recipe 2");
      rerender({invoice: current});

      current = await result.current.removeRecipeCallback("Recipe 3");

      expect(current.possibleRecipes).toEqual([]);
    });
  });

  describe("edge cases", () => {
    it("handles recipe with empty string name", async () => {
      const emptyNameRecipe: Recipe = {
        name: "",
        description: "Empty name recipe",
        recipeIngredients: [],
        recipeSteps: [],
        cookingTime: 0,
        servings: 0,
      };

      const invoiceWithEmptyName = buildInvoice({
        id: testInvoice.id,
        possibleRecipes: [emptyNameRecipe, ...testRecipes],
      });

      const {result} = renderHook(() => useRecipeDelete(invoiceWithEmptyName));

      const updatedInvoice = await result.current.removeRecipeCallback("");

      expect(updatedInvoice.possibleRecipes).toEqual(testRecipes);
    });

    it("handles recipe names with special characters", async () => {
      const specialRecipe: Recipe = {
        name: "Recipe w/ Special-Chars & Symbols!",
        description: "Special",
        recipeIngredients: [],
        recipeSteps: [],
        cookingTime: 0,
        servings: 0,
      };

      const invoiceWithSpecial = buildInvoice({
        id: testInvoice.id,
        possibleRecipes: [specialRecipe, ...testRecipes],
      });

      const {result} = renderHook(() => useRecipeDelete(invoiceWithSpecial));

      const updatedInvoice = await result.current.removeRecipeCallback(
        "Recipe w/ Special-Chars & Symbols!",
      );

      expect(updatedInvoice.possibleRecipes).toEqual(testRecipes);
    });

    it("handles very long recipe names", async () => {
      const longName = "A".repeat(1000);
      const longNameRecipe: Recipe = {
        name: longName,
        description: "Long name",
        recipeIngredients: [],
        recipeSteps: [],
        cookingTime: 0,
        servings: 0,
      };

      const invoiceWithLongName = buildInvoice({
        id: testInvoice.id,
        possibleRecipes: [longNameRecipe],
      });

      const {result} = renderHook(() => useRecipeDelete(invoiceWithLongName));

      const updatedInvoice = await result.current.removeRecipeCallback(longName);

      expect(updatedInvoice.possibleRecipes).toEqual([]);
    });
  });
});
