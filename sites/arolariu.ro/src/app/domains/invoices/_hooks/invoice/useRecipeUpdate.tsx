"use client";

/**
 * @fileoverview Hook for replacing recipes on an invoice, persisted through the server contract.
 * @module app/domains/invoices/_hooks/invoice/useRecipeUpdate
 *
 * @remarks
 * Computes the full updated `possibleRecipes` collection after substituting one indexed
 * recipe, sends it to the server via `patchInvoice`, and only updates the local Zustand
 * store on a successful response.
 */

import {patchInvoice} from "../../_actions/invoices";
import {useInvoicesStore} from "@/stores";
import type {Invoice, RecipeSuggestion} from "@/types/invoices";
import {useCallback, useState} from "react";

/**
 * Hook output type for recipe updates.
 */
type HookOutputType = Readonly<{
  /** Whether a recipe update operation is in progress. */
  isUpdating: boolean;
  /**
   * Replaces the recipe at `recipeIndex` with `updated`, persists the
   * full replacement collection through the server, then updates the local store.
   *
   * @throws When the server action reports failure.
   */
  updateRecipeCallback: (recipeIndex: number, updated: RecipeSuggestion) => Promise<Invoice>;
}>;

/**
 * Manages updating recipes on the current invoice, persisting via the server contract.
 *
 * @remarks
 * The array position is the mutation identity because the transport contract does not
 * expose a recipe identifier and names are not unique. The hook sends the full replacement array via `patchInvoice` and only
 * updates the local invoice store after a successful server response.
 *
 * @param invoice - The invoice on which the recipe will be updated.
 * @returns Hook state with update progress and the recipe update callback.
 *
 * @example
 * ```tsx
 * const {isUpdating, updateRecipeCallback} = useRecipeUpdate(invoice);
 * try {
 *   await updateRecipeCallback(0, updatedRecipe);
 * } catch (error) {
 *   // show error toast — local state was NOT mutated
 * }
 * ```
 */
export function useRecipeUpdate(invoice: Invoice): Readonly<HookOutputType> {
  const updateEntity = useInvoicesStore((state) => state.updateEntity);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateRecipeCallback = useCallback(
    async (recipeIndex: number, updated: RecipeSuggestion): Promise<Invoice> => {
      setIsUpdating(true);
      try {
        if (!Number.isSafeInteger(recipeIndex) || recipeIndex < 0 || recipeIndex >= invoice.possibleRecipes.length) {
          throw new RangeError(`Recipe index ${String(recipeIndex)} is outside the invoice recipe collection.`);
        }
        const updatedRecipes = invoice.possibleRecipes.map((recipe, index) => (index === recipeIndex ? updated : recipe));
        const result = await patchInvoice({
          invoiceId: invoice.id,
          payload: {possibleRecipes: [...updatedRecipes]},
        });
        if (!result.success) {
          throw new Error(result.error.message);
        }
        updateEntity(invoice.id, {possibleRecipes: result.data.possibleRecipes});
        return result.data;
      } finally {
        setIsUpdating(false);
      }
    },
    [invoice.id, invoice.possibleRecipes, updateEntity],
  );

  return {isUpdating, updateRecipeCallback} as const;
}
