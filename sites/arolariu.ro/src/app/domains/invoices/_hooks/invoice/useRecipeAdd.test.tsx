import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it, vi} from "vitest";

import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import type {Invoice, Recipe} from "@/types/invoices";
import {RecipeComplexity} from "@/types/invoices";
import {useRecipeAdd} from "./useRecipeAdd";

vi.mock("@/lib/actions/invoices/patchInvoice", () => ({
  default: vi.fn(),
}));

const upsertEntity = vi.fn();
type MockInvoicesStore = Readonly<{upsertEntity: typeof upsertEntity}>;
vi.mock("@/stores", () => ({
  useInvoicesStore: <T,>(selector: (state: MockInvoicesStore) => T): T => selector({upsertEntity}),
}));

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string): string => key,
}));

const existingRecipe: Recipe = {
  name: "Existing",
  description: "Existing recipe",
  approximateTotalDuration: 20,
  complexity: RecipeComplexity.Easy,
  ingredients: ["Flour"],
  instructions: "Mix.",
  preparationTime: 10,
  cookingTime: 10,
  referenceForMoreDetails: "https://example.com/existing",
};

const pastaRecipe: Recipe = {
  name: "Pasta",
  description: "Pasta recipe",
  approximateTotalDuration: 30,
  complexity: RecipeComplexity.Normal,
  ingredients: ["Pasta"],
  instructions: "Boil.",
  preparationTime: 10,
  cookingTime: 20,
  referenceForMoreDetails: "https://example.com/pasta",
};

const mockInvoice = {
  id: "inv-1",
  possibleRecipes: [existingRecipe],
} as Invoice;

vi.mock("../edit-invoice/[id]/_context/EditInvoiceContext", () => ({
  useEditInvoiceContext: () => ({invoice: mockInvoice}),
}));

describe("useRecipeAdd", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("appends the new recipe and patches the invoice", async () => {
    const updated = {...mockInvoice, possibleRecipes: [existingRecipe, pastaRecipe]};
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: true, invoice: updated});

    const {result} = renderHook(() => useRecipeAdd());

    let returned: Invoice | undefined;
    await act(async () => {
      returned = await result.current.performAdd(pastaRecipe);
    });

    expect(patchInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        invoiceId: "inv-1",
        payload: expect.objectContaining({
          possibleRecipes: [existingRecipe, pastaRecipe],
        }),
      }),
    );
    expect(upsertEntity).toHaveBeenCalledWith(updated);
    expect(returned).toBe(updated);
  });

  it("throws when patchInvoice reports failure", async () => {
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: false, error: "boom"});

    const {result} = renderHook(() => useRecipeAdd());

    let caught: unknown;
    await act(async () => {
      try {
        await result.current.performAdd(pastaRecipe);
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toMatchObject({message: "boom"});
    expect(upsertEntity).not.toHaveBeenCalled();

    vi.clearAllMocks();
    vi.mocked(patchInvoice).mockResolvedValueOnce({success: false, error: ""});

    await act(async () => {
      try {
        await result.current.performAdd(pastaRecipe);
      } catch (error) {
        caught = error;
      }
    });

    expect(caught).toBeInstanceOf(Error);
    expect(caught).toMatchObject({message: "error"});
    expect(upsertEntity).not.toHaveBeenCalled();
  });

  it("resets isAdding to false after failure", async () => {
    vi.mocked(patchInvoice).mockRejectedValueOnce(new Error("network"));

    const {result} = renderHook(() => useRecipeAdd());

    await act(async () => {
      try {
        await result.current.performAdd(pastaRecipe);
      } catch {
        // Expected failure path under test.
      }
    });

    expect(result.current.isAdding).toBe(false);
  });
});
