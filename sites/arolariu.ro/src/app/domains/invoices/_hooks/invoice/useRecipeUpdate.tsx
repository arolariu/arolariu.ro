"use client";

/**
 * @fileoverview Hook for replacing recipes on an invoice in local state.
 * @module app/domains/invoices/_hooks/invoice/useRecipeUpdate
 *
 * @remarks
 * Updates matching entries in `invoice.possibleRecipes` through the invoices
 * Zustand store. This hook currently performs a client-side mutation only; it
 * does not call an invoice server action.
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice, Recipe} from "@/types/invoices";
import {useCallback, useState} from "react";

/**
 * Hook output type for recipe updates.
 */
type HookOutputType = Readonly<{
  /** Whether a recipe update operation is in progress. */
  isUpdating: boolean;
  /** Replaces recipes with the given name in the local invoice store. */
  updateRecipeCallback: (recipeName: string, updated: Recipe) => Promise<Invoice>;
}>;

/**
 * Manages updating recipes on the current invoice.
 *
 * @remarks
 * Recipe matching is name-based and replaces every recipe whose `name` exactly
 * equals `recipeName`. The hook returns a locally updated invoice snapshot and
 * leaves toast notifications and persistence decisions to the caller.
 *
 * Recipe names are assumed unique within an invoice; every matching name is replaced.
 * Callers should await the mutation and resulting refresh before triggering another recipe mutation.
 *
 * @param invoice - The invoice on which the recipe will be updated.
 * @returns Hook state with update progress and the recipe update callback.
 *
 * @example
 * ```tsx
 * const {isUpdating, updateRecipeCallback} = useRecipeUpdate(invoice);
 *
 * await updateRecipeCallback("Dinner idea", updatedRecipe);
 * ```
 */
export function useRecipeUpdate(invoice: Invoice): Readonly<HookOutputType> {
  const updateRecipeClientSide = useInvoicesStore((state) => state.updateEntity);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateRecipeCallback = useCallback(
    async (recipeName: string, updated: Recipe): Promise<Invoice> => {
      setIsUpdating(true);
      try {
        // TODO: add server side mutation and handle errors with toasts
        const updatedRecipes = invoice.possibleRecipes.map((r) => (r.name === recipeName ? updated : r));
        const updatedInvoice = {...invoice, possibleRecipes: updatedRecipes};
        updateRecipeClientSide(invoice.id, {possibleRecipes: updatedRecipes});
        return updatedInvoice;
      } finally {
        setIsUpdating(false);
      }
    },
    [invoice, updateRecipeClientSide],
  );

  return {isUpdating, updateRecipeCallback} as const;
}
