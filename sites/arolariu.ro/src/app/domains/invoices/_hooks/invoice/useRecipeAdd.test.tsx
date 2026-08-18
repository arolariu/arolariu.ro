/**
 * @fileoverview Unit tests for useRecipeAdd client hook.
 * @module app/domains/invoices/_hooks/invoice/useRecipeAdd.test
 */

import {renderHook, waitFor} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder, invokeHookCallback} from "../../../../../../tests/helpers";
import {useRecipeAdd} from "./useRecipeAdd";

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
  const testRecipe = TestDataBuilder.build("recipe", {
    name: "Test Recipe",
    description: "A test recipe description",
    purchasedIngredients: [{name: "ingredient1", quantity: "1", preparation: null}],
    steps: [{sequence: 1, instruction: "Cook the ingredients.", notes: null}],
    cookingMinutes: 30,
    totalMinutes: 40,
  });
  const testInvoice = TestDataBuilder.build("invoice", {
    id: "11111111-1111-4111-8111-111111111111",
    possibleRecipes: [],
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
      const hookResult = renderHook(() => useRecipeAdd(testInvoice));

      await invokeHookCallback(hookResult, (current) => current.addRecipeCallback(testRecipe));

      expect(hookResult.result.current.isAdding).toBe(false);

      expect(mockUpdateEntity).toHaveBeenCalledWith(testInvoice.id, {
        possibleRecipes: [testRecipe],
      });
    });

    it("appends recipe to existing recipes", async () => {
      const existingRecipe = TestDataBuilder.build("recipe", {
        name: "Existing Recipe",
        description: "Existing description",
        purchasedIngredients: [{name: "existing", quantity: "1", preparation: null}],
        steps: [{sequence: 1, instruction: "Cook.", notes: null}],
        cookingMinutes: 20,
        totalMinutes: 30,
      });

      const invoiceWithRecipes = TestDataBuilder.build("invoice", {
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
      const recipe1 = TestDataBuilder.build("recipe", {
        name: "Duplicate Name",
        description: "First version",
        purchasedIngredients: [{name: "ing1", quantity: "1", preparation: null}],
        steps: [{sequence: 1, instruction: "Cook.", notes: null}],
        cookingMinutes: 10,
        totalMinutes: 20,
      });

      const invoiceWithRecipe = TestDataBuilder.build("invoice", {
        id: testInvoice.id,
        possibleRecipes: [recipe1],
      });

      const recipe2 = TestDataBuilder.build("recipe", {
        ...recipe1,
        description: "Second version",
      });

      const {result} = renderHook(() => useRecipeAdd(invoiceWithRecipe));

      const updatedInvoice = await result.current.addRecipeCallback(recipe2);

      expect(updatedInvoice.possibleRecipes).toHaveLength(2);
    });

    it("preserves invoice properties other than recipes", async () => {
      const hookResult = renderHook(() => useRecipeAdd(testInvoice));

      await invokeHookCallback(hookResult, (current) => current.addRecipeCallback(testRecipe));

      expect(testInvoice.id).toBe(testInvoice.id);
      expect(testInvoice.name).toBe(testInvoice.name);
      expect(testInvoice.items).toEqual(testInvoice.items);
    });

    it("returns updated invoice snapshot", async () => {
      const hookResult = renderHook(() => useRecipeAdd(testInvoice));

      await invokeHookCallback(hookResult, (current) => current.addRecipeCallback(testRecipe));

      expect(mockUpdateEntity).toHaveBeenCalledWith(
        testInvoice.id,
        expect.objectContaining({
          possibleRecipes: expect.arrayContaining([testRecipe]),
        }),
      );
    });
  });

  describe("loading state management", () => {
    it("resets isAdding after addition", async () => {
      const hookResult = renderHook(() => useRecipeAdd(testInvoice));

      await invokeHookCallback(hookResult, (current) => current.addRecipeCallback(testRecipe));

      expect(hookResult.result.current.isAdding).toBe(false);
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
      const complexRecipe = TestDataBuilder.build("recipe", {
        name: "Complex Recipe",
        description: "Detailed description",
        purchasedIngredients: [
          {name: "ing1", quantity: "1", preparation: null},
          {name: "ing2", quantity: "1", preparation: null},
          {name: "ing3", quantity: "1", preparation: null},
        ],
        steps: [
          {sequence: 1, instruction: "Prepare.", notes: null},
          {sequence: 2, instruction: "Cook.", notes: null},
        ],
        cookingMinutes: 60,
        preparationMinutes: 15,
        totalMinutes: 75,
      });

      const hookResult = renderHook(() => useRecipeAdd(testInvoice));

      await invokeHookCallback(hookResult, (current) => current.addRecipeCallback(complexRecipe));

      expect(mockUpdateEntity).toHaveBeenCalledWith(
        testInvoice.id,
        expect.objectContaining({
          possibleRecipes: expect.arrayContaining([complexRecipe]),
        }),
      );
    });

    it("handles recipe with minimal required fields", async () => {
      const minimalRecipe = TestDataBuilder.build("recipe", {
        name: "Minimal Recipe",
        description: "Minimal structured recipe.",
        purchasedIngredients: [],
        steps: [],
        cookingMinutes: 0,
        totalMinutes: 10,
      });

      const hookResult = renderHook(() => useRecipeAdd(testInvoice));

      await invokeHookCallback(hookResult, (current) => current.addRecipeCallback(minimalRecipe));

      expect(mockUpdateEntity).toHaveBeenCalledWith(
        testInvoice.id,
        expect.objectContaining({
          possibleRecipes: expect.arrayContaining([minimalRecipe]),
        }),
      );
    });
  });

  describe("multiple additions", () => {
    it("handles sequential recipe additions", async () => {
      const recipe1 = TestDataBuilder.build("recipe", {
        name: "Recipe 1",
        description: "First",
        purchasedIngredients: [{name: "a", quantity: "1", preparation: null}],
        steps: [{sequence: 1, instruction: "Cook.", notes: null}],
        cookingMinutes: 10,
        totalMinutes: 20,
      });

      const recipe2 = TestDataBuilder.build("recipe", {
        name: "Recipe 2",
        description: "Second",
        purchasedIngredients: [{name: "b", quantity: "1", preparation: null}],
        steps: [{sequence: 1, instruction: "Cook.", notes: null}],
        cookingMinutes: 20,
        totalMinutes: 30,
      });

      const {result, rerender} = renderHook(({invoice}) => useRecipeAdd(invoice), {initialProps: {invoice: testInvoice}});

      const updated1 = await result.current.addRecipeCallback(recipe1);
      rerender({invoice: updated1});

      const updated2 = await result.current.addRecipeCallback(recipe2);

      expect(updated2.possibleRecipes).toHaveLength(2);
      expect(updated2.possibleRecipes).toContainEqual(recipe1);
      expect(updated2.possibleRecipes).toContainEqual(recipe2);
    });
  });
});
