"use client";

/**
 * @fileoverview Structured recipe preview dialog.
 * @module domains/invoices/edit-invoice/[id]/dialogs/PreviewRecipeDialog
 */

import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {RecipeSuggestionDetails} from "../../../_components/analysis/StructuredAnalysisDetails";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./PreviewRecipeDialog.module.scss";

/** Displays ordered recipe data returned by analysis without a synthetic URL. */
export default function PreviewRecipeDialog(): React.JSX.Element {
  const t = useTranslations();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__RECIPE_PREVIEW", "view");
  const recipe = payload?.recipe ?? null;
  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen) close();
    },
    [close],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{recipe?.name ?? t((m) => m.dialogs.invoices.recipeDialog.read.missingRecipe)}</DialogTitle>
          <DialogDescription>{recipe?.description ?? t((m) => m.dialogs.invoices.recipeDialog.read.missingRecipe)}</DialogDescription>
        </DialogHeader>
        {recipe === null ? null : (
          <div className={styles["formBody"]}>
            <RecipeSuggestionDetails recipe={recipe} />
          </div>
        )}
        <DialogFooter className={styles["dialogFooter"]}>
          <Button
            type='button'
            onClick={close}>
            {t((m) => m.dialogs.invoices.recipeDialog.buttons.close)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
