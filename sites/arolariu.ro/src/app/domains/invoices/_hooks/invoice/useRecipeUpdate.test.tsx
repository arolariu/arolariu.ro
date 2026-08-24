/**
 * @fileoverview Unit tests for useRecipeUpdate — server-persisted update with no optimistic mutation.
 * @module app/domains/invoices/_hooks/invoice/useRecipeUpdate.test
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice, RecipeSuggestion} from "@/types/invoices";
import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {useRecipeUpdate} from "./useRecipeUpdate";

// Mock only the server action — do NOT mock the Zustand store.
vi.mock("../../_actions/invoices", () => ({
  patchInvoice: vi.fn(),
}));

vi.mock("next-intl-selector", () => ({
  useTranslations: vi.fn(() => () => "mock translation"),
}));

const {patchInvoice: mockPatchInvoice} = await import("../../_actions/invoices");
const mockedPatch = vi.mocked(mockPatchInvoice as ReturnType<typeof vi.fn>);

describe("useRecipeUpdate", () => {
  const testRecipes: RecipeSuggestion[] = [
    TestDataBuilder.build("recipeSuggestion", {name: "Recipe 1", description: "First recipe"}),
    TestDataBuilder.build("recipeSuggestion", {name: "Recipe 2", description: "Second recipe"}),
    TestDataBuilder.build("recipeSuggestion", {name: "Recipe 3", description: "Third recipe"}),
  ];

  const testInvoice = TestDataBuilder.build("invoice", {
    id: "11111111-1111-4111-8111-111111111111",
    possibleRecipes: testRecipes,
  });

  let updateEntitySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    const realUpdateEntity = useInvoicesStore.getState().updateEntity;
    updateEntitySpy = vi.fn().mockImplementation((id: string, updates: Partial<Invoice>) => realUpdateEntity(id, updates));
    act(() => {
      useInvoicesStore.setState({
        entities: [testInvoice],
        selectedEntities: [],
        hasHydrated: true,
        updateEntity: updateEntitySpy as typeof realUpdateEntity,
      });
    });
  });

  afterEach(() => {
    act(() => {
      useInvoicesStore.getState().clearEntities();
    });
  });

  describe("initialization", () => {
    it("returns isUpdating false initially", () => {
      const {result} = renderHook(() => useRecipeUpdate(testInvoice));
      expect(result.current.isUpdating).toBe(false);
    });

    it("returns updateRecipeCallback function", () => {
      const {result} = renderHook(() => useRecipeUpdate(testInvoice));
      expect(typeof result.current.updateRecipeCallback).toBe("function");
    });
  });

  describe("server contract", () => {
    it("calls patchInvoice exactly once with full replacement collection", async () => {
      const updatedRecipe = {...testRecipes[1]!, description: "Updated description"};
      const serverInvoice = {...testInvoice, possibleRecipes: [testRecipes[0]!, updatedRecipe, testRecipes[2]!]};
      mockedPatch.mockResolvedValue({success: true, data: serverInvoice});

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));
      await act(async () => {
        await result.current.updateRecipeCallback("Recipe 2", updatedRecipe);
      });

      expect(mockedPatch).toHaveBeenCalledTimes(1);
      expect(mockedPatch).toHaveBeenCalledWith({
        invoiceId: testInvoice.id,
        payload: {possibleRecipes: [testRecipes[0]!, updatedRecipe, testRecipes[2]!]},
      });
    });

    it("does NOT update local store on server failure — no optimistic mutation", async () => {
      const updatedRecipe = {...testRecipes[0]!, description: "Updated"};
      mockedPatch.mockResolvedValue({success: false, error: {message: "Server error"}});

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));
      await expect(
        act(async () => {
          await result.current.updateRecipeCallback("Recipe 1", updatedRecipe);
        }),
      ).rejects.toThrow("Server error");

      expect(updateEntitySpy).not.toHaveBeenCalled();
    });

    it("updates store with server-returned invoice after success", async () => {
      const updatedRecipe = {...testRecipes[0]!, description: "Server-canonical update"};
      const serverInvoice = {...testInvoice, possibleRecipes: [updatedRecipe, testRecipes[1]!, testRecipes[2]!]};
      mockedPatch.mockResolvedValue({success: true, data: serverInvoice});

      const {result} = renderHook(() => useRecipeUpdate(testInvoice));
      let returned: Invoice | undefined;
      await act(async () => {
        returned = await result.current.updateRecipeCallback("Recipe 1", updatedRecipe);
      });

      expect(updateEntitySpy).toHaveBeenCalledTimes(1);
      expect(updateEntitySpy).toHaveBeenCalledWith(testInvoice.id, {
        possibleRecipes: [updatedRecipe, testRecipes[1]!, testRecipes[2]!],
      });
      expect(returned).toEqual(serverInvoice);
    });
  });

  describe("loading state", () => {
    it("resets isUpdating to false after success", async () => {
      const updated = {...testRecipes[0]!, description: "Updated"};
      mockedPatch.mockResolvedValue({
        success: true,
        data: {...testInvoice, possibleRecipes: [updated, testRecipes[1]!, testRecipes[2]!]},
      });
      const {result} = renderHook(() => useRecipeUpdate(testInvoice));
      await act(async () => {
        await result.current.updateRecipeCallback("Recipe 1", updated);
      });
      expect(result.current.isUpdating).toBe(false);
    });

    it("resets isUpdating to false after failure", async () => {
      mockedPatch.mockResolvedValue({success: false, error: {message: "Fail"}});
      const updated = {...testRecipes[0]!, description: "Updated"};
      const {result} = renderHook(() => useRecipeUpdate(testInvoice));
      await act(async () => {
        try {
          await result.current.updateRecipeCallback("Recipe 1", updated);
        } catch {
          /* expected */
        }
      });
      expect(result.current.isUpdating).toBe(false);
    });
  });
});
