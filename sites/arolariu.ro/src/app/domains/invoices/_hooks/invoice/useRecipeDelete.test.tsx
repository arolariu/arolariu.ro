import {useInvoicesStore} from "@/stores";
import {buildInvoice, buildRecipe} from "../../../../../../tests/helpers/builders/domain";
import {act, renderHook} from "@testing-library/react";
import {beforeEach, describe, expect, it} from "vitest";
import {useRecipeDelete} from "./useRecipeDelete";

describe("useRecipeDelete", () => {
  const first = buildRecipe({name: "First"});
  const second = buildRecipe({name: "Second"});
  const invoice = buildInvoice({possibleRecipes: [first, second]});

  beforeEach(() => {
    useInvoicesStore.getState().clearEntities();
    useInvoicesStore.getState().upsertEntity(invoice);
  });

  it("removes matching structured recipes and updates the real store", async () => {
    const {result} = renderHook(() => useRecipeDelete(invoice));

    await act(async () => {
      await result.current.removeRecipeCallback("First");
    });

    expect(result.current.isDeleting).toBe(false);
    expect(useInvoicesStore.getState().getEntityById(invoice.id)?.possibleRecipes).toEqual([second]);
  });
});
