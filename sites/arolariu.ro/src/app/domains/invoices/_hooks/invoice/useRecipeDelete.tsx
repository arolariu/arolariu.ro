"use client";

/**
 * @fileoverview Hook for deleting a recipe from an invoice's possibleRecipes array via patchInvoice.
 * @module app/domains/invoices/_hooks/useRecipeDelete
 */

import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import {useInvoicesStore} from "@/stores";
import type {Invoice} from "@/types/invoices";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";

type HookOutputType = Readonly<{
  isDeleting: boolean;
  /** Removes the recipe with the given name from invoice.possibleRecipes via patchInvoice. Throws on failure. NO toast — caller decides. */
  performDelete: (recipeName: string) => Promise<Invoice>;
}>;

/**
 * Manages deleting recipes from the current invoice.
 * Recipe names are assumed unique within an invoice; every matching name is removed.
 * Callers should await the mutation and resulting refresh before triggering another recipe mutation.
 *
 * @param invoice - The invoice from which the recipe will be deleted.
 * @returns State and callback for deleting a recipe.
 * @throws {Error} When patchInvoice reports a failure.
 */
export function useRecipeDelete(invoice: Invoice): Readonly<HookOutputType> {
  const t = useTranslations("IMS--Hooks.useRecipeDelete");
  const upsertEntity = useInvoicesStore((state) => state.upsertEntity);
  const [isDeleting, setIsDeleting] = useState(false);

  const performDelete = useCallback(
    async (recipeName: string): Promise<Invoice> => {
      setIsDeleting(true);
      try {
        const updatedRecipes = invoice.possibleRecipes.filter((recipe) => recipe.name !== recipeName);
        const result = await patchInvoice({
          invoiceId: invoice.id,
          payload: {possibleRecipes: updatedRecipes},
        });

        if (!result.success) {
          throw new Error(result.error || t("error"));
        }

        upsertEntity(result.invoice);
        return result.invoice;
      } finally {
        setIsDeleting(false);
      }
    },
    [invoice.id, invoice.possibleRecipes, t, upsertEntity],
  );

  return {isDeleting, performDelete};
}
