"use client";

/**
 * @fileoverview Structured recipe preview dialog.
 * @module domains/invoices/edit-invoice/[id]/dialogs/PreviewRecipeDialog
 */

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
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
            <div className={styles["fieldGroup"]}>
              <Label>{t((m) => m.dialogs.invoices.recipeDialog.fields.ingredients)}</Label>
              <ul className={styles["ingredientReadList"]}>
                {recipe.purchasedIngredients.map((ingredient) => (
                  <li key={`${ingredient.name}-${ingredient.quantity}`}>
                    {ingredient.name} — {ingredient.quantity}
                  </li>
                ))}
              </ul>
            </div>
            <div className={styles["fieldGroup"]}>
              <Badge>{recipe.difficulty}</Badge>
              <span>{recipe.servings}</span>
            </div>
            <ol className={styles["ingredientReadList"]}>
              {recipe.steps.map((step) => (
                <li key={step.sequence}>
                  {step.instruction}
                  {step.notes === null ? null : ` (${step.notes})`}
                </li>
              ))}
            </ol>
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
