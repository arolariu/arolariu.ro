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
    ingredients: ["ingredient1", "ingredient2"],
    instructions: "step1\nstep2",
    cookingTime: 30,
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
        ingredients: ["existing"],
        instructions: "step",
        cookingTime: 20,
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
        ingredients: ["ing1"],
        instructions: "step1",
        cookingTime: 10,
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
        ingredients: ["ing1", "ing2", "ing3"],
        instructions: "step1\nstep2\nstep3\nstep4",
        cookingTime: 60,
        preparationTime: 15,
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
        description: "",
        ingredients: [],
        instructions: "",
        cookingTime: 0,
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
        ingredients: ["a"],
        instructions: "1",
        cookingTime: 10,
      });

      const recipe2 = TestDataBuilder.build("recipe", {
        name: "Recipe 2",
        description: "Second",
        ingredients: ["b"],
        instructions: "2",
        cookingTime: 20,
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
