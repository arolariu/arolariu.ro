"use client";

/**
 * @fileoverview Hook for adding recipes to an invoice in local state.
 * @module app/domains/invoices/_hooks/invoice/useRecipeAdd
 *
 * @remarks
 * Updates the invoice's `possibleRecipes` collection through the invoices
 * Zustand store. This hook currently performs a client-side mutation only; it
 * does not call an invoice server action.
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice, RecipeSuggestion} from "@/types/invoices";
import {useCallback, useState} from "react";

/**
 * Hook output type for adding recipes.
 */
type HookOutputType = Readonly<{
  /** Whether a recipe add operation is in progress. */
  isAdding: boolean;
  /** Appends a recipe to `invoice.possibleRecipes` in the local invoice store. */
  addRecipeCallback: (recipe: RecipeSuggestion) => Promise<Invoice>;
}>;

/**
 * Manages adding a recipe to the provided invoice.
 *
 * @remarks
 * The hook derives an updated invoice snapshot by appending the supplied recipe
 * to `invoice.possibleRecipes`, writes the array to the invoices store, and
 * returns the updated snapshot. Callers own toast notifications and persistence
 * decisions because no server-side recipe mutation is currently performed.
 *
 * Callers should await the mutation and resulting refresh before triggering another recipe mutation.
 *
 * @param invoice - The invoice whose `possibleRecipes` array should receive the new recipe.
 * @returns Hook state with add progress and the recipe add callback.
 *
 * @example
 * ```tsx
 * const {isAdding, addRecipeCallback} = useRecipeAdd(invoice);
 *
 * const updatedInvoice = await addRecipeCallback(recipe);
 * console.log(updatedInvoice.possibleRecipes.length);
 * ```
 */
export function useRecipeAdd(invoice: Invoice): Readonly<HookOutputType> {
  const addRecipeClientSide = useInvoicesStore((state) => state.updateEntity);
  const [isAdding, setIsAdding] = useState(false);

  const addRecipeCallback = useCallback(
    async (recipe: RecipeSuggestion): Promise<Invoice> => {
      setIsAdding(true);
      try {
        // TODO: add server side mutation and handle errors with toasts
        const updatedRecipes = [...invoice.possibleRecipes, recipe];
        const updatedInvoice = {...invoice, possibleRecipes: updatedRecipes};
        addRecipeClientSide(invoice.id, {possibleRecipes: updatedRecipes});
        return updatedInvoice;
      } finally {
        setIsAdding(false);
      }
    },
    [invoice.id, invoice.possibleRecipes, addRecipeClientSide],
  );

  return {isAdding, addRecipeCallback} as const;
}
