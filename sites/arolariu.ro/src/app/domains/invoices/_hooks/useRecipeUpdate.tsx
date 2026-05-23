"use client";

/**
 * @fileoverview Hook for updating a recipe in an invoice's possibleRecipes array via patchInvoice.
 * @module app/domains/invoices/_hooks/useRecipeUpdate
 */

import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import {useInvoicesStore} from "@/stores";
import type {Invoice, Recipe} from "@/types/invoices";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {useEditInvoiceContext} from "../edit-invoice/[id]/_context/EditInvoiceContext";

type UseRecipeUpdateOutput = Readonly<{
  isUpdating: boolean;
  /** Replaces the recipe with the given name with `updated` via patchInvoice. Throws on failure. NO toast — caller decides. */
  performUpdate: (recipeName: string, updated: Recipe) => Promise<Invoice>;
}>;

/**
 * Manages updating recipes on the current invoice read from EditInvoiceContext.
 * Recipe names are assumed unique within an invoice; every matching name is replaced.
 * Callers should await the mutation and resulting refresh before triggering another recipe mutation.
 *
 * @returns State and callback for updating a recipe.
 * @throws {Error} When patchInvoice reports a failure.
 */
export function useRecipeUpdate(): UseRecipeUpdateOutput {
  const t = useTranslations("IMS--Hooks.useRecipeUpdate");
  const {invoice} = useEditInvoiceContext();
  const upsertEntity = useInvoicesStore((state) => state.upsertEntity);
  const [isUpdating, setIsUpdating] = useState(false);

  const performUpdate = useCallback(
    async (recipeName: string, updated: Recipe): Promise<Invoice> => {
      setIsUpdating(true);
      try {
        const updatedRecipes = invoice.possibleRecipes.map((recipe) => (recipe.name === recipeName ? updated : recipe));
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
        setIsUpdating(false);
      }
    },
    [invoice.id, invoice.possibleRecipes, t, upsertEntity],
  );

  return {isUpdating, performUpdate};
}
