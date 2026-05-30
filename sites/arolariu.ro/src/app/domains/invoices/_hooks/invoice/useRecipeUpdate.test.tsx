/**
 * @fileoverview Unit tests for useRecipeUpdate client hook.
 * @module app/domains/invoices/_hooks/invoice/useRecipeUpdate.test
 */

import type {Recipe} from "@/types/invoices";
import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder, invokeHookCallback} from "../../../../../../tests/helpers";
import {useRecipeUpdate} from "./useRecipeUpdate";

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

describe("useRecipeUpdate", () => {
  const testRecipes: Recipe[] = [
    TestDataBuilder.build("recipe", {
      name: "Recipe 1",
      description: "First recipe",
      ingredients: ["ing1"],
      instructions: "step1",
      cookingTime: 10,
    }),
    TestDataBuilder.build("recipe", {
      name: "Recipe 2",
      description: "Second recipe",
      ingredients: ["ing2"],
      instructions: "step2",
      cookingTime: 20,
    }),
    TestDataBuilder.build("recipe", {
      name: "Recipe 3",
      description: "Third recipe",
      ingredients: ["ing3"],
      instructions: "step3",
      cookingTime: 30,
    }),
  ];

  const testInvoice = TestDataBuilder.build("invoice", {
    id: "11111111-1111-4111-8111-111111111111",
    possibleRecipes: testRecipes,
  });
  const mockUpdateEntity = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseInvoicesStore.mockImplementation(((selector: (state: {updateEntity: typeof mockUpdateEntity}) => typeof mockUpdateEntity) =>
      selector({
        updateEntity: mockUpdateEntity,
      })) as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("initialization", () => {
    it("returns isUpdating false initially", () => {
      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      expect(result.current.isUpdating).toBe(false);
      expect(result.current.updateRecipeCallback).toBeDefined();
    });

    it("returns updateRecipeCallback function", () => {
      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      expect(typeof result.current.updateRecipeCallback).toBe("function");
    });
  });

  describe("recipe update", () => {
    it("successfully updates a recipe by name", async () => {
      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...testRecipes[1]!,
        description: "Updated description",
        cookingTime: 25,
      });

      const hookResult = renderHook(() => useRecipeUpdate(testInvoice));

      await invokeHookCallback(hookResult, (current) => current.updateRecipeCallback("Recipe 2", updatedRecipe));

      expect(hookResult.result.current.isUpdating).toBe(false);

      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        possibleRecipes: [testRecipes[0], updatedRecipe, testRecipes[2]],
      });
    });

    it("updates first recipe when matched", async () => {
      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...testRecipes[0]!,
        description: "First recipe updated",
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      const updatedInvoice = await result.current.updateRecipeCallback("Recipe 1", updatedRecipe);

      expect(updatedInvoice.possibleRecipes[0]).toEqual(updatedRecipe);
      expect(updatedInvoice.possibleRecipes.slice(1)).toEqual(testRecipes.slice(1));
    });

    it("updates last recipe when matched", async () => {
      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...testRecipes[2]!,
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      const updatedInvoice = await result.current.updateRecipeCallback("Recipe 3", updatedRecipe);

      expect(updatedInvoice.possibleRecipes[2]).toEqual(updatedRecipe);
      expect(updatedInvoice.possibleRecipes.slice(0, 2)).toEqual(testRecipes.slice(0, 2));
    });

    it("updates all recipes with matching name", async () => {
      const duplicateRecipes: Recipe[] = [
        {...testRecipes[0]!, name: "Duplicate"},
        {...testRecipes[1]!, name: "Duplicate"},
        {...testRecipes[2]!, name: "Unique"},
      ];

      const invoiceWithDuplicates = TestDataBuilder.build("invoice", {
        id: testInvoice.id,
        possibleRecipes: duplicateRecipes,
      });

      const updatedRecipe = TestDataBuilder.build("recipe", {
        name: "Duplicate",
        description: "All updated",
        ingredients: ["new"],
        instructions: "new step",
        cookingTime: 99,
      });

      const {result} = renderHook(() => useRecipeUpdate(invoiceWithDuplicates));

      const updatedInvoice = await result.current.updateRecipeCallback("Duplicate", updatedRecipe);

      expect(updatedInvoice.possibleRecipes[0]).toEqual(updatedRecipe);
      expect(updatedInvoice.possibleRecipes[1]).toEqual(updatedRecipe);
      expect(updatedInvoice.possibleRecipes[2]?.name).toBe("Unique");
    });

    it("returns invoice unchanged when recipe not found", async () => {
      const updatedRecipe = TestDataBuilder.build("recipe", {
        name: "Nonexistent",
        description: "New",
        ingredients: [],
        instructions: "",
        cookingTime: 0,
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      const updatedInvoice = await result.current.updateRecipeCallback("Nonexistent Recipe", updatedRecipe);

      expect(updatedInvoice.possibleRecipes).toEqual(testRecipes);
      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        possibleRecipes: testRecipes,
      });
    });

    it("handles update on empty recipe list", async () => {
      const emptyInvoice = TestDataBuilder.build("invoice", {
        id: testInvoice.id,
        possibleRecipes: [],
      });

      const updatedRecipe = TestDataBuilder.build("recipe", {
        name: "Any",
        description: "Recipe",
        ingredients: [],
        instructions: "",
        cookingTime: 0,
      });

      const {result} = renderHook(() => useRecipeUpdate(emptyInvoice));

      const updatedInvoice = await result.current.updateRecipeCallback("Any Recipe", updatedRecipe);

      expect(updatedInvoice.possibleRecipes).toEqual([]);
    });

    it("can update recipe name", async () => {
      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...testRecipes[1]!,
        name: "Renamed Recipe",
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      const updatedInvoice = await result.current.updateRecipeCallback("Recipe 2", updatedRecipe);

      expect(updatedInvoice.possibleRecipes[1]?.name).toBe("Renamed Recipe");
    });

    it("preserves invoice properties other than recipes", async () => {
      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...testRecipes[0]!,
        description: "Updated",
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      const updatedInvoice = await result.current.updateRecipeCallback("Recipe 1", updatedRecipe);

      expect(updatedInvoice.id).toBe(testInvoice.id);
      expect(updatedInvoice.name).toBe(testInvoice.name);
      expect(updatedInvoice.items).toEqual(testInvoice.items);
    });

    it("is case-sensitive for recipe names", async () => {
      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...testRecipes[0]!,
        description: "Updated",
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      const updatedInvoice = await result.current.updateRecipeCallback("recipe 1", updatedRecipe);

      expect(updatedInvoice.possibleRecipes).toEqual(testRecipes);
    });
  });

  describe("loading state management", () => {
    it("resets isUpdating after update", async () => {
      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...testRecipes[0]!,
        description: "Updated",
      });

      const hookResult = renderHook(() => useRecipeUpdate(testInvoice));

      await invokeHookCallback(hookResult, (current) => current.updateRecipeCallback("Recipe 1", updatedRecipe));

      expect(hookResult.result.current.isUpdating).toBe(false);
    });

    it("resets isUpdating even if store update throws", async () => {
      mockUpdateEntity.mockImplementation(() => {
        throw new Error("Store error");
      });

      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...testRecipes[0]!,
        description: "Updated",
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      await expect(async () => {
        await result.current.updateRecipeCallback("Recipe 1", updatedRecipe);
      }).rejects.toThrow("Store error");

      await waitFor(() => {
        expect(result.current.isUpdating).toBe(false);
      });
    });
  });

  describe("store integration", () => {
    it("calls updateEntity with correct invoice id", async () => {
      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...testRecipes[0]!,
        description: "Updated",
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      await result.current.updateRecipeCallback("Recipe 1", updatedRecipe);

      expect(mockUpdateEntity).toHaveBeenCalledWith(
        testInvoice.id,
        expect.objectContaining({
          possibleRecipes: expect.any(Array),
        }),
      );
    });

    it("calls updateEntity exactly once per update operation", async () => {
      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...testRecipes[0]!,
        description: "Updated",
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      await result.current.updateRecipeCallback("Recipe 1", updatedRecipe);

      expect(mockUpdateEntity).toHaveBeenCalledTimes(1);
    });

    it("does not mutate original invoice", async () => {
      const originalRecipes = testInvoice.possibleRecipes;
      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...testRecipes[0]!,
        description: "Updated",
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      await result.current.updateRecipeCallback("Recipe 1", updatedRecipe);

      expect(testInvoice.possibleRecipes).toBe(originalRecipes);
      expect(testInvoice.possibleRecipes[0]?.description).toBe("First recipe");
    });
  });

  describe("recipe data integrity", () => {
    it("preserves all updated recipe properties", async () => {
      const complexUpdate = TestDataBuilder.build("recipe", {
        name: "Recipe 1",
        description: "Completely new description",
        ingredients: ["new1", "new2", "new3"],
        instructions: "newStep1\nnewStep2\nnewStep3",
        cookingTime: 999,
        preparationTime: 45,
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      const updatedInvoice = await result.current.updateRecipeCallback("Recipe 1", complexUpdate);

      expect(updatedInvoice.possibleRecipes[0]).toEqual(complexUpdate);
    });

    it("handles partial recipe updates", async () => {
      const partialUpdate = TestDataBuilder.build("recipe", {
        ...testRecipes[1]!,
        description: "Only description changed",
      });

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));

      const updatedInvoice = await result.current.updateRecipeCallback("Recipe 2", partialUpdate);

      expect(updatedInvoice.possibleRecipes[1]?.description).toBe("Only description changed");
      expect(updatedInvoice.possibleRecipes[1]?.cookingTime).toBe(testRecipes[1]!.cookingTime);
    });
  });

  describe("multiple updates", () => {
    it("handles sequential recipe updates", async () => {
      const {result, rerender} = renderHook(({invoice}) => useRecipeUpdate(invoice), {initialProps: {invoice: testInvoice}});

      const update1: Recipe = {...testRecipes[0]!, description: "First update"};
      const updated1 = await result.current.updateRecipeCallback("Recipe 1", update1);
      rerender({invoice: updated1});

      const update2: Recipe = {...testRecipes[1]!, description: "Second update"};
      const updated2 = await result.current.updateRecipeCallback("Recipe 2", update2);

      expect(updated2.possibleRecipes[0]?.description).toBe("First update");
      expect(updated2.possibleRecipes[1]?.description).toBe("Second update");
    });
  });

  describe("edge cases", () => {
    it("handles update to recipe with empty string name", async () => {
      const emptyNameRecipe = TestDataBuilder.build("recipe", {
        name: "",
        description: "Empty name recipe",
        ingredients: [],
        instructions: "",
        cookingTime: 0,
      });

      const invoiceWithEmptyName = TestDataBuilder.build("invoice", {
        id: testInvoice.id,
        possibleRecipes: [emptyNameRecipe, ...testRecipes],
      });

      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...emptyNameRecipe,
        description: "Updated empty name recipe",
      });

      const {result} = renderHook(() => useRecipeUpdate(invoiceWithEmptyName));

      const updatedInvoice = await result.current.updateRecipeCallback("", updatedRecipe);

      expect(updatedInvoice.possibleRecipes[0]?.description).toBe("Updated empty name recipe");
    });

    it("handles recipe names with special characters", async () => {
      const specialRecipe = TestDataBuilder.build("recipe", {
        name: "Recipe w/ Special-Chars & Symbols!",
        description: "Special",
        ingredients: [],
        instructions: "",
        cookingTime: 0,
      });

      const invoiceWithSpecial = TestDataBuilder.build("invoice", {
        id: testInvoice.id,
        possibleRecipes: [specialRecipe, ...testRecipes],
      });

      const updatedRecipe = TestDataBuilder.build("recipe", {
        ...specialRecipe,
        description: "Updated special",
      });

      const {result} = renderHook(() => useRecipeUpdate(invoiceWithSpecial));

      const updatedInvoice = await result.current.updateRecipeCallback("Recipe w/ Special-Chars & Symbols!", updatedRecipe);

      expect(updatedInvoice.possibleRecipes[0]?.description).toBe("Updated special");
    });
  });
});
