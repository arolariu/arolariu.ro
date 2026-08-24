"use client";

/**
 * @fileoverview Hook for adding recipes to an invoice, persisted through the server contract.
 * @module app/domains/invoices/_hooks/invoice/useRecipeAdd
 *
 * @remarks
 * Computes the full updated `possibleRecipes` collection, sends it to the server via
 * `patchInvoice`, and only updates the local Zustand store on a successful response.
 * On failure, the store is left untouched and the error is propagated to the caller.
 */

import {patchInvoice} from "../../_actions/invoices";
import {useInvoicesStore} from "@/stores";
import type {Invoice, RecipeSuggestion} from "@/types/invoices";
import {useCallback, useState} from "react";

/**
 * Hook output type for adding recipes.
 */
type HookOutputType = Readonly<{
  /** Whether a recipe add operation is in progress. */
  isAdding: boolean;
  /**
   * Appends `recipe` to the invoice's `possibleRecipes`, persists the full
   * replacement collection through the server, then updates the local store.
   *
   * @throws When the server action reports failure.
   */
  addRecipeCallback: (recipe: RecipeSuggestion) => Promise<Invoice>;
}>;

/**
 * Manages adding a recipe to the provided invoice, persisting via the server contract.
 *
 * @remarks
 * The hook appends the supplied recipe to `invoice.possibleRecipes`, sends the full
 * replacement array via `patchInvoice`, and only updates the local invoice store after
 * a successful server response. The server-returned invoice is used as the source of
 * truth; no optimistic local mutation is performed before confirmation.
 *
 * @param invoice - The invoice whose `possibleRecipes` array should receive the new recipe.
 * @returns Hook state with add progress and the recipe add callback.
 *
 * @example
 * ```tsx
 * const {isAdding, addRecipeCallback} = useRecipeAdd(invoice);
 * try {
 *   const updatedInvoice = await addRecipeCallback(recipe);
 * } catch (error) {
 *   // show error toast — local state was NOT mutated
 * }
 * ```
 */
export function useRecipeAdd(invoice: Invoice): Readonly<HookOutputType> {
  const updateEntity = useInvoicesStore((state) => state.updateEntity);
  const [isAdding, setIsAdding] = useState(false);

  const addRecipeCallback = useCallback(
    async (recipe: RecipeSuggestion): Promise<Invoice> => {
      setIsAdding(true);
      try {
        const updatedRecipes = [...invoice.possibleRecipes, recipe];
        const result = await patchInvoice({
          invoiceId: invoice.id,
          payload: {possibleRecipes: updatedRecipes},
        });
        if (!result.success) {
          throw new Error(result.error.message);
        }
        updateEntity(invoice.id, {possibleRecipes: result.data.possibleRecipes});
        return result.data;
      } finally {
        setIsAdding(false);
      }
    },
    [invoice.id, invoice.possibleRecipes, updateEntity],
  );

  return {isAdding, addRecipeCallback} as const;
}
