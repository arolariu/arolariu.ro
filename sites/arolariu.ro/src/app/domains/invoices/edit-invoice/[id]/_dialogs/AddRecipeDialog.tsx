"use client";

/**
 * @fileoverview Notice dialog for server-owned recipe suggestions.
 * @module domains/invoices/edit-invoice/[id]/dialogs/AddRecipeDialog
 */

import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useDialog} from "../../../_contexts/DialogContext";

/** Recipe suggestions are analysis output and cannot be fabricated client-side. */
export default function AddRecipeDialog(): React.JSX.Element {
  const t = useTranslations();
  const {isOpen, close} = useDialog("EDIT_INVOICE__RECIPE_ADD", "add");
  return (
    <Dialog
      open={isOpen}
      onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t((m) => m.pages.invoices.editInvoice.recipesTab.header.title)}</DialogTitle>
          <DialogDescription>{t((m) => m.pages.invoices.editInvoice.recipesTab.emptyState.noRecipesAvailable)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={close}>{t((m) => m.dialogs.invoices.recipeDialog.buttons.close)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
