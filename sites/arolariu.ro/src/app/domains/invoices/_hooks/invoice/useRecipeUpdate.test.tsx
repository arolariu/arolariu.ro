import {useInvoicesStore} from "@/stores";
import {buildInvoice, buildRecipe} from "../../../../../../tests/helpers/builders/domain";
import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it} from "vitest";
import {useRecipeUpdate} from "./useRecipeUpdate";

describe("useRecipeUpdate", () => {
  const original = buildRecipe({name: "Dinner", cookingMinutes: 20, totalMinutes: 30});
  const replacement = buildRecipe({
    name: "Dinner",
    cookingMinutes: 30,
    totalMinutes: 40,
    steps: [{sequence: 1, instruction: "Simmer.", notes: null}],
  });
  const invoice = buildInvoice({possibleRecipes: [original]});

  beforeEach(() => {
    useInvoicesStore.getState().clearEntities();
    useInvoicesStore.getState().upsertEntity(invoice);
  });

  it("replaces a complete structured recipe in the real store", async () => {
    const {result} = renderHook(() => useRecipeUpdate(invoice));

    await act(async () => {
      await result.current.updateRecipeCallback(original.name, replacement);
    });

    expect(result.current.isUpdating).toBe(false);
    expect(useInvoicesStore.getState().getEntityById(invoice.id)?.possibleRecipes).toEqual([replacement]);
  });
});
