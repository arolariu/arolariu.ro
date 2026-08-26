"use client";

/**
 * @fileoverview Hook for removing recipes from an invoice, persisted through the server contract.
 * @module app/domains/invoices/_hooks/invoice/useRecipeDelete
 *
 * @remarks
 * Computes the full updated `possibleRecipes` collection after removing one indexed
 * recipe, sends it to the server via `patchInvoice`, and only updates the local Zustand
 * store on a successful response. Deleting the last recipe sends an explicit `[]` — never
 * `null` — because `null` means "preserve" in the backend contract.
 */

import {patchInvoice} from "../../_actions/invoices";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {useCallback, useState} from "react";

/**
 * Hook output type for recipe deletion.
 */
type HookOutputType = Readonly<{
  /** Whether a recipe delete operation is in progress. */
  isDeleting: boolean;
  /**
   * Removes the recipe at `recipeIndex`, persists the full replacement
   * collection through the server (sends `[]` when removing the last recipe), then
   * updates the local store.
   *
   * @throws When the server action reports failure.
   */
  removeRecipeCallback: (recipeIndex: number) => Promise<Invoice>;
}>;

/**
 * Manages deleting recipes from the current invoice, persisting via the server contract.
 *
 * @remarks
 * The array position is the mutation identity because the transport contract does not
 * expose a recipe identifier and names are not unique. Sending an empty array explicitly clears the collection on the server
 * (`null` would have preserved it). The hook only updates the local invoice store after
 * a successful server response.
 *
 * @param invoice - The invoice from which the recipe will be deleted.
 * @returns Hook state with delete progress and the recipe remove callback.
 *
 * @example
 * ```tsx
 * const {isDeleting, removeRecipeCallback} = useRecipeDelete(invoice);
 * try {
 *   await removeRecipeCallback(0);
 * } catch (error) {
 *   // show error toast — local state was NOT mutated
 * }
 * ```
 */
export function useRecipeDelete(invoice: Invoice): Readonly<HookOutputType> {
  const updateEntity = useInvoicesStore((state) => state.updateEntity);
  const [isDeleting, setIsDeleting] = useState(false);

  const removeRecipeCallback = useCallback(
    async (recipeIndex: number): Promise<Invoice> => {
      setIsDeleting(true);
      try {
        if (!Number.isSafeInteger(recipeIndex) || recipeIndex < 0 || recipeIndex >= invoice.possibleRecipes.length) {
          throw new RangeError(`Recipe index ${String(recipeIndex)} is outside the invoice recipe collection.`);
        }
        // Filter produces [] when the last recipe is removed — never null.
        const updatedRecipes = invoice.possibleRecipes.filter((_, index) => index !== recipeIndex);
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
        setIsDeleting(false);
      }
    },
    [invoice.id, invoice.possibleRecipes, updateEntity],
  );

  return {isDeleting, removeRecipeCallback} as const;
}
