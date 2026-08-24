"use client";

/**
 * @fileoverview Hook for removing recipes from an invoice, persisted through the server contract.
 * @module app/domains/invoices/_hooks/invoice/useRecipeDelete
 *
 * @remarks
 * Computes the full updated `possibleRecipes` collection after filtering out the named
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
   * Removes recipes whose `name` equals `recipeName`, persists the full replacement
   * collection through the server (sends `[]` when removing the last recipe), then
   * updates the local store.
   *
   * @throws When the server action reports failure.
   */
  removeRecipeCallback: (recipeName: string) => Promise<Invoice>;
}>;

/**
 * Manages deleting recipes from the current invoice, persisting via the server contract.
 *
 * @remarks
 * Recipe matching is name-based; every recipe whose `name` exactly equals `recipeName`
 * is removed. Sending an empty array explicitly clears the collection on the server
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
 *   await removeRecipeCallback("Dinner idea");
 * } catch (error) {
 *   // show error toast — local state was NOT mutated
 * }
 * ```
 */
export function useRecipeDelete(invoice: Invoice): Readonly<HookOutputType> {
  const updateEntity = useInvoicesStore((state) => state.updateEntity);
  const [isDeleting, setIsDeleting] = useState(false);

  const removeRecipeCallback = useCallback(
    async (recipeName: string): Promise<Invoice> => {
      setIsDeleting(true);
      try {
        // Filter produces [] when the last recipe is removed — never null.
        const updatedRecipes = invoice.possibleRecipes.filter((r) => r.name !== recipeName);
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
