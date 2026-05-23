"use client";

/**
 * @fileoverview Hook for adding a recipe to an invoice's possibleRecipes array via patchInvoice.
 * @module app/domains/invoices/_hooks/useRecipeAdd
 */

import patchInvoice from "@/lib/actions/invoices/patchInvoice";
import {useInvoicesStore} from "@/stores";
import type {Invoice, Recipe} from "@/types/invoices";
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {useEditInvoiceContext} from "../edit-invoice/[id]/_context/EditInvoiceContext";

type UseRecipeAddOutput = Readonly<{
  isAdding: boolean;
  /** Appends a recipe to invoice.possibleRecipes via patchInvoice; throws on failure. NO toast — caller decides. */
  performAdd: (recipe: Recipe) => Promise<Invoice>;
}>;

/**
 * Manages adding a recipe to the current invoice read from EditInvoiceContext.
 * Callers should await the mutation and resulting refresh before triggering another recipe mutation.
 *
 * @returns State and callback for adding a recipe.
 * @throws {Error} When patchInvoice reports a failure.
 */
export function useRecipeAdd(): UseRecipeAddOutput {
  const t = useTranslations("IMS--Hooks.useRecipeAdd");
  const {invoice} = useEditInvoiceContext();
  const upsertEntity = useInvoicesStore((state) => state.upsertEntity);
  const [isAdding, setIsAdding] = useState(false);

  const performAdd = useCallback(
    async (recipe: Recipe): Promise<Invoice> => {
      setIsAdding(true);
      try {
        const updatedRecipes = [...invoice.possibleRecipes, recipe];
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
        setIsAdding(false);
      }
    },
    [invoice.id, invoice.possibleRecipes, t, upsertEntity],
  );

  return {isAdding, performAdd};
}
