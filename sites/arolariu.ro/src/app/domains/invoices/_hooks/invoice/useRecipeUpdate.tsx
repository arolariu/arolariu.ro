"use client";

/**
 * @fileoverview Hook for replacing recipes on an invoice, persisted through the server contract.
 * @module app/domains/invoices/_hooks/invoice/useRecipeUpdate
 *
 * @remarks
 * Computes the full updated `possibleRecipes` collection after substituting the named
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
   * Replaces recipes whose `name` equals `recipeName` with `updated`, persists the
   * full replacement collection through the server, then updates the local store.
   *
   * @throws When the server action reports failure.
   */
  updateRecipeCallback: (recipeName: string, updated: RecipeSuggestion) => Promise<Invoice>;
}>;

/**
 * Manages updating recipes on the current invoice, persisting via the server contract.
 *
 * @remarks
 * Recipe matching is name-based; every recipe whose `name` exactly equals `recipeName`
 * is replaced. The hook sends the full replacement array via `patchInvoice` and only
 * updates the local invoice store after a successful server response.
 *
 * @param invoice - The invoice on which the recipe will be updated.
 * @returns Hook state with update progress and the recipe update callback.
 *
 * @example
 * ```tsx
 * const {isUpdating, updateRecipeCallback} = useRecipeUpdate(invoice);
 * try {
 *   await updateRecipeCallback("Dinner idea", updatedRecipe);
 * } catch (error) {
 *   // show error toast — local state was NOT mutated
 * }
 * ```
 */
export function useRecipeUpdate(invoice: Invoice): Readonly<HookOutputType> {
  const updateEntity = useInvoicesStore((state) => state.updateEntity);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateRecipeCallback = useCallback(
    async (recipeName: string, updated: RecipeSuggestion): Promise<Invoice> => {
      setIsUpdating(true);
      try {
        const updatedRecipes = invoice.possibleRecipes.map((r) => (r.name === recipeName ? updated : r));
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
