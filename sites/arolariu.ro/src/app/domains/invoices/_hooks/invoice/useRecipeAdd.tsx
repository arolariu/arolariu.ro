"use client";

/**
 * @fileoverview Hook for adding a recipe to an invoice's possibleRecipes array via patchInvoice.
 * @module app/domains/invoices/_hooks/useRecipeAdd
 */

import {useInvoicesStore} from "@/stores";
import type {Invoice, Recipe} from "@/types/invoices";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";

type HookOutputType = Readonly<{
  isAdding: boolean;
  /** Appends a recipe to invoice.possibleRecipes via patchInvoice; throws on failure. NO toast — caller decides. */
  addRecipeCallback: (recipe: Recipe) => Promise<Invoice>;
}>;

/**
 * Manages adding a recipe to the current invoice read from EditInvoiceContext.
 * Callers should await the mutation and resulting refresh before triggering another recipe mutation.
 *
 * @returns State and callback for adding a recipe.
 * @throws {Error} When patchInvoice reports a failure.
 */
export function useRecipeAdd(invoice: Invoice): Readonly<HookOutputType> {
  const t = useTranslations("IMS--Hooks.useRecipeAdd");
  const addRecipeClientSide = useInvoicesStore((state) => state.updateEntity);
  const [isAdding, setIsAdding] = useState(false);

  const addRecipeCallback = useCallback(
    async (recipe: Recipe): Promise<Invoice> => {
      setIsAdding(true);
      try {
        // TODO: add server side mudation
        const updatedRecipes = [...invoice.possibleRecipes, recipe];
        const updatedInvoice = {...invoice, possibleRecipes: updatedRecipes};
        addRecipeClientSide(invoice.id, {possibleRecipes: updatedRecipes});
        return updatedInvoice;
      } finally {
        setIsAdding(false);
      }
    },
    [invoice.id, invoice.possibleRecipes, t, addRecipeClientSide],
  );

  return {isAdding, addRecipeCallback};
}
