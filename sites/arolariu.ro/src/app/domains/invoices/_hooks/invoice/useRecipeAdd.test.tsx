/**
 * @fileoverview Unit tests for useRecipeAdd — server-persisted add with no optimistic mutation.
 * @module app/domains/invoices/_hooks/invoice/useRecipeAdd.test
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {act, renderHook} from "@testing-library/react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {TestDataBuilder} from "../../../../../../tests/helpers";
import {useRecipeAdd} from "./useRecipeAdd";

// Mock only the server action — do NOT mock the Zustand store.
vi.mock("../../_actions/invoices", () => ({
  patchInvoice: vi.fn(),
}));

vi.mock("next-intl-selector", () => ({
  useTranslations: vi.fn(() => () => "mock translation"),
}));

const {patchInvoice: mockPatchInvoice} = await import("../../_actions/invoices");
const mockedPatch = vi.mocked(mockPatchInvoice as ReturnType<typeof vi.fn>);

describe("useRecipeAdd", () => {
  const testRecipe = TestDataBuilder.build("recipeSuggestion", {
    name: "Test Recipe",
    description: "A test recipe description",
    cookingMinutes: 30,
  });
  const testInvoice = TestDataBuilder.build("invoice", {
    id: "11111111-1111-4111-8111-111111111111",
    possibleRecipes: [],
  });

  let updateEntitySpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Capture the real implementation before injecting the spy.
    const realUpdateEntity = useInvoicesStore.getState().updateEntity;
    updateEntitySpy = vi.fn().mockImplementation((id: string, updates: Partial<Invoice>) => realUpdateEntity(id, updates));
    // Set up store state and inject the spy via Zustand's setState (shallow merge).
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
    it("returns isAdding false initially", () => {
      const {result} = renderHook(() => useRecipeAdd(testInvoice));
      expect(result.current.isAdding).toBe(false);
    });

    it("returns addRecipeCallback function", () => {
      const {result} = renderHook(() => useRecipeAdd(testInvoice));
      expect(typeof result.current.addRecipeCallback).toBe("function");
    });
  });

  describe("server contract", () => {
    it("calls patchInvoice exactly once with full replacement collection", async () => {
      const serverInvoice = {...testInvoice, possibleRecipes: [testRecipe]};
      mockedPatch.mockResolvedValue({success: true, data: serverInvoice});

      const {result} = renderHook(() => useRecipeAdd(testInvoice));
      await act(async () => {
        await result.current.addRecipeCallback(testRecipe);
      });

      expect(mockedPatch).toHaveBeenCalledTimes(1);
      expect(mockedPatch).toHaveBeenCalledWith({
        invoiceId: testInvoice.id,
        payload: {possibleRecipes: [testRecipe]},
      });
    });

    it("does NOT update local store on server failure — no optimistic mutation", async () => {
      mockedPatch.mockResolvedValue({success: false, error: {message: "Server error"}});

      const {result} = renderHook(() => useRecipeAdd(testInvoice));
      await expect(
        act(async () => {
          await result.current.addRecipeCallback(testRecipe);
        }),
      ).rejects.toThrow("Server error");

      expect(updateEntitySpy).not.toHaveBeenCalled();
    });

    it("updates store only after successful response using server-returned invoice", async () => {
      const serverRecipe = {...testRecipe, name: "Server-Canonical Name"};
      const serverInvoice = {...testInvoice, possibleRecipes: [serverRecipe]};
      mockedPatch.mockResolvedValue({success: true, data: serverInvoice});

      const {result} = renderHook(() => useRecipeAdd(testInvoice));
      let returned: Invoice | undefined;
      await act(async () => {
        returned = await result.current.addRecipeCallback(testRecipe);
      });

      expect(updateEntitySpy).toHaveBeenCalledTimes(1);
      expect(updateEntitySpy).toHaveBeenCalledWith(testInvoice.id, {possibleRecipes: [serverRecipe]});
      expect(returned).toEqual(serverInvoice);
    });

    it("appends recipe to existing collection when calling server", async () => {
      const existing = TestDataBuilder.build("recipeSuggestion", {name: "Existing"});
      const invoiceWithOne = {...testInvoice, possibleRecipes: [existing]};
      const serverInvoice = {...invoiceWithOne, possibleRecipes: [existing, testRecipe]};
      mockedPatch.mockResolvedValue({success: true, data: serverInvoice});

      const {result} = renderHook(() => useRecipeAdd(invoiceWithOne));
      await act(async () => {
        await result.current.addRecipeCallback(testRecipe);
      });

      expect(mockedPatch).toHaveBeenCalledWith({
        invoiceId: testInvoice.id,
        payload: {possibleRecipes: [existing, testRecipe]},
      });
    });
  });

  describe("loading state", () => {
    it("resets isAdding to false after success", async () => {
      mockedPatch.mockResolvedValue({success: true, data: {...testInvoice, possibleRecipes: [testRecipe]}});
      const {result} = renderHook(() => useRecipeAdd(testInvoice));
      await act(async () => {
        await result.current.addRecipeCallback(testRecipe);
      });
      expect(result.current.isAdding).toBe(false);
    });

    it("resets isAdding to false after failure", async () => {
      mockedPatch.mockResolvedValue({success: false, error: {message: "Fail"}});
      const {result} = renderHook(() => useRecipeAdd(testInvoice));
      await act(async () => {
        try {
          await result.current.addRecipeCallback(testRecipe);
        } catch {
          /* expected */
        }
      });
      expect(result.current.isAdding).toBe(false);
    });
  });
});
