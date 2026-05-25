"use client";

/**
 * @fileoverview Hook for updating a recipe in an invoice's possibleRecipes array via patchInvoice.
 * @module app/domains/invoices/_hooks/useRecipeUpdate
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice, Recipe} from "@/types/invoices";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";

type HookOutputType = Readonly<{
  isUpdating: boolean;
  /** Replaces the recipe with the given name with `updated` via patchInvoice. Throws on failure. NO toast — caller decides. */
  updateRecipeCallback: (recipeName: string, updated: Recipe) => Promise<Invoice>;
}>;

/**
 * Manages updating recipes on the current invoice.
 * Recipe names are assumed unique within an invoice; every matching name is replaced.
 * Callers should await the mutation and resulting refresh before triggering another recipe mutation.
 *
 * @param invoice - The invoice on which the recipe will be updated.
 * @returns State and callback for updating a recipe.
 * @throws {Error} When patchInvoice reports a failure.
 */
export function useRecipeUpdate(invoice: Invoice): Readonly<HookOutputType> {
  const t = useTranslations("IMS--Hooks.useRecipeUpdate");
  const updateRecipeClientSide = useInvoicesStore((state) => state.updateEntity);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateRecipeCallback = useCallback(
    async (recipeName: string, updated: Recipe): Promise<Invoice> => {
      setIsUpdating(true);
      try {
        // TODO. add server side mutation
        const updatedRecipes = invoice.possibleRecipes.map((r) => (r.name === recipeName ? updated : r));
        const updatedInvoice = {...invoice, possibleRecipes: updatedRecipes};
        updateRecipeClientSide(invoice.id, {possibleRecipes: updatedRecipes});
        return updatedInvoice;
      } finally {
        setIsUpdating(false);
      }
    },
    [invoice.id, invoice.possibleRecipes, t, updateRecipeClientSide],
  );

  return {isUpdating, updateRecipeCallback};
}
