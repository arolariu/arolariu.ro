"use client";

/**
 * @fileoverview Read-only dialog for structured analysis recipes.
 * @module domains/invoices/edit-invoice/[id]/dialogs/UpdateRecipeDialog
 */

import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useDialog} from "../../../_contexts/DialogContext";

/** Prevents client edits to analysis-owned recipe data pending a supported API. */
export default function UpdateRecipeDialog(): React.JSX.Element {
  const t = useTranslations();
  const {isOpen, close} = useDialog("EDIT_INVOICE__RECIPE_UPDATE", "edit");
  return (
    <Dialog
      open={isOpen}
      onOpenChange={close}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.recipeDialog.read.missingRecipe)}</DialogTitle>
          <DialogDescription>{t((m) => m.dialogs.invoices.recipeDialog.read.description)}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={close}>{t((m) => m.dialogs.invoices.recipeDialog.buttons.close)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
