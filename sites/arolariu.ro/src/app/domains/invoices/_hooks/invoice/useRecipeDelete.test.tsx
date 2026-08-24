/**
 * @fileoverview Unit tests for useRecipeDelete — server-persisted delete with no optimistic mutation.
 * @module app/domains/invoices/_hooks/invoice/useRecipeDelete.test
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice, RecipeSuggestion} from "@/types/invoices";
import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {useRecipeDelete} from "./useRecipeDelete";

// Mock only the server action — do NOT mock the Zustand store.
vi.mock("../../_actions/invoices", () => ({
  patchInvoice: vi.fn(),
}));

vi.mock("next-intl-selector", () => ({
  useTranslations: vi.fn(() => () => "mock translation"),
}));

const {patchInvoice: mockPatchInvoice} = await import("../../_actions/invoices");
const mockedPatch = vi.mocked(mockPatchInvoice as ReturnType<typeof vi.fn>);

describe("useRecipeDelete", () => {
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
    it("returns isDeleting false initially", () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));
      expect(result.current.isDeleting).toBe(false);
    });

    it("returns removeRecipeCallback function", () => {
      const {result} = renderHook(() => useRecipeDelete(testInvoice));
      expect(typeof result.current.removeRecipeCallback).toBe("function");
    });
  });

  describe("server contract", () => {
    it("calls patchInvoice exactly once with full replacement collection after deletion", async () => {
      const remaining = [testRecipes[0]!, testRecipes[2]!];
      const serverInvoice = {...testInvoice, possibleRecipes: remaining};
      mockedPatch.mockResolvedValue({success: true, data: serverInvoice});

      const {result} = renderHook(() => useRecipeDelete(testInvoice));
      await act(async () => {
        await result.current.removeRecipeCallback("Recipe 2");
      });

      expect(mockedPatch).toHaveBeenCalledTimes(1);
      expect(mockedPatch).toHaveBeenCalledWith({
        invoiceId: testInvoice.id,
        payload: {possibleRecipes: remaining},
      });
    });

    it("sends [] (not null) when deleting the last recipe", async () => {
      const singleRecipeInvoice = {...testInvoice, possibleRecipes: [testRecipes[0]!]};
      const serverInvoice = {...singleRecipeInvoice, possibleRecipes: []};
      mockedPatch.mockResolvedValue({success: true, data: serverInvoice});

      const {result} = renderHook(() => useRecipeDelete(singleRecipeInvoice));
      await act(async () => {
        await result.current.removeRecipeCallback(testRecipes[0]!.name);
      });

      expect(mockedPatch).toHaveBeenCalledWith({
        invoiceId: testInvoice.id,
        payload: {possibleRecipes: []},
      });
    });

    it("does NOT update local store on server failure — no optimistic mutation", async () => {
      mockedPatch.mockResolvedValue({success: false, error: {message: "Server error"}});

      const {result} = renderHook(() => useRecipeDelete(testInvoice));
      await expect(
        act(async () => {
          await result.current.removeRecipeCallback("Recipe 1");
        }),
      ).rejects.toThrow("Server error");

      expect(updateEntitySpy).not.toHaveBeenCalled();
    });

    it("updates store with server-returned invoice after success", async () => {
      const remaining = [testRecipes[1]!, testRecipes[2]!];
      const serverInvoice = {...testInvoice, possibleRecipes: remaining};
      mockedPatch.mockResolvedValue({success: true, data: serverInvoice});

      const {result} = renderHook(() => useRecipeDelete(testInvoice));
      let returned: Invoice | undefined;
      await act(async () => {
        returned = await result.current.removeRecipeCallback("Recipe 1");
      });

      expect(updateEntitySpy).toHaveBeenCalledTimes(1);
      expect(updateEntitySpy).toHaveBeenCalledWith(testInvoice.id, {possibleRecipes: remaining});
      expect(returned).toEqual(serverInvoice);
    });
  });

  describe("loading state", () => {
    it("resets isDeleting to false after success", async () => {
      mockedPatch.mockResolvedValue({success: true, data: {...testInvoice, possibleRecipes: [testRecipes[1]!, testRecipes[2]!]}});
      const {result} = renderHook(() => useRecipeDelete(testInvoice));
      await act(async () => {
        await result.current.removeRecipeCallback("Recipe 1");
      });
      expect(result.current.isDeleting).toBe(false);
    });

    it("resets isDeleting to false after failure", async () => {
      mockedPatch.mockResolvedValue({success: false, error: {message: "Fail"}});
      const {result} = renderHook(() => useRecipeDelete(testInvoice));
      await act(async () => {
        try {
          await result.current.removeRecipeCallback("Recipe 1");
        } catch {
          /* expected */
        }
      });
      expect(result.current.isDeleting).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("is case-sensitive for recipe names", async () => {
      const serverInvoice = {...testInvoice, possibleRecipes: testRecipes};
      mockedPatch.mockResolvedValue({success: true, data: serverInvoice});

      const {result} = renderHook(() => useRecipeDelete(testInvoice));
      await act(async () => {
        await result.current.removeRecipeCallback("recipe 1"); // lowercase — no match
      });

      // No recipes removed — full collection sent
      expect(mockedPatch).toHaveBeenCalledWith({
        invoiceId: testInvoice.id,
        payload: {possibleRecipes: testRecipes},
      });
    });
  });
});
