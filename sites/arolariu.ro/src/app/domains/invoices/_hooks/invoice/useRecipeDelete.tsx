"use client";

/**
 * @fileoverview Hook for removing recipes from an invoice in local state.
 * @module app/domains/invoices/_hooks/invoice/useRecipeDelete
 *
 * @remarks
 * Removes matching entries from `invoice.possibleRecipes` through the invoices
 * Zustand store. This hook currently performs a client-side mutation only; it
 * does not call an invoice server action.
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {useCallback, useState} from "react";

/**
 * Hook output type for recipe deletion.
 */
type HookOutputType = Readonly<{
  /** Whether a recipe delete operation is in progress. */
  isDeleting: boolean;
  /** Removes recipes with the given name from the local invoice store. */
  removeRecipeCallback: (recipeName: string) => Promise<Invoice>;
}>;

/**
 * Manages deleting recipes from the current invoice.
 *
 * @remarks
 * Recipe matching is name-based and removes every recipe whose `name` exactly
 * equals `recipeName`. The hook returns a locally updated invoice snapshot and
 * leaves toast notifications and persistence decisions to the caller.
 *
 * Recipe names are assumed unique within an invoice; every matching name is removed.
 * Callers should await the mutation and resulting refresh before triggering another recipe mutation.
 *
 * @param invoice - The invoice from which the recipe will be deleted.
 * @returns Hook state with delete progress and the recipe remove callback.
 *
 * @example
 * ```tsx
 * const {isDeleting, removeRecipeCallback} = useRecipeDelete(invoice);
 *
 * await removeRecipeCallback("Dinner idea");
 * ```
 */
export function useRecipeDelete(invoice: Invoice): Readonly<HookOutputType> {
  const removeRecipeClientSide = useInvoicesStore((state) => state.updateEntity);
  const [isDeleting, setIsDeleting] = useState(false);

  const removeRecipeCallback = useCallback(
    async (recipeName: string): Promise<Invoice> => {
      setIsDeleting(true);
      try {
        // TODO: add server side mutation and handle errors with toasts
        const updatedRecipes = invoice.possibleRecipes.filter((r) => r.name !== recipeName);
        const updatedInvoice = {...invoice, possibleRecipes: updatedRecipes};
        removeRecipeClientSide(invoice.id, {possibleRecipes: updatedRecipes});
        return updatedInvoice;
      } finally {
        setIsDeleting(false);
      }
    },
    [invoice.id, invoice.possibleRecipes, removeRecipeClientSide],
  );

  return {isDeleting, removeRecipeCallback} as const;
}
