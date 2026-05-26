"use client";

import {RecipeComplexity} from "@/types/invoices";
import {Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {TbClock, TbToolsKitchen3} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./PreviewRecipeDialog.module.scss";

function getBadgeVariant(complexity: RecipeComplexity): "default" | "secondary" | "outline" {
  if (complexity === RecipeComplexity.Easy) return "default";
  if (complexity === RecipeComplexity.Normal) return "secondary";
  return "outline";
}

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
          <DialogTitle>{recipe?.name ?? t((m) => m["IMS--Dialogs"].recipeDialog.read.missingRecipe)}</DialogTitle>
          <DialogDescription>{recipe ? t((m) => m["IMS--Dialogs"].recipeDialog.read.description) : t((m) => m["IMS--Dialogs"].recipeDialog.read.missingRecipe)}</DialogDescription>
        </DialogHeader>

        {recipe ? (
          <div className={styles["formBody"]}>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-preview-description'>{t((m) => m["IMS--Dialogs"].recipeDialog.fields.description)}</Label>
              <p
                id='recipe-preview-description'
                className={styles["readText"]}>
                {recipe.description || t((m) => m["IMS--Dialogs"].recipeDialog.read.noDescription)}
              </p>
            </div>

            <div className={styles["fieldGroup"]}>
              <Label>{t((m) => m["IMS--Dialogs"].recipeDialog.fields.ingredients)}</Label>
              <ul className={styles["ingredientReadList"]}>
                {recipe.ingredients.map((ingredient, index) => (
                  <li
                    key={`read-ingredient-${index}`}
                    className={styles["readText"]}>
                    {ingredient}
                  </li>
                ))}
              </ul>
            </div>

            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-preview-complexity'>{t((m) => m["IMS--Dialogs"].recipeDialog.fields.complexity)}</Label>
              <Badge
                id='recipe-preview-complexity'
                variant={getBadgeVariant(recipe.complexity)}>
                {recipe.complexity || t((m) => m["IMS--Dialogs"].recipeDialog.difficulty.medium).toUpperCase()}
              </Badge>
            </div>

            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-preview-instructions'>{t((m) => m["IMS--Dialogs"].recipeDialog.fields.instructions)}</Label>
              <p
                id='recipe-preview-instructions'
                className={styles["readText"]}>
                {recipe.instructions || t((m) => m["IMS--Dialogs"].recipeDialog.read.notSpecified)}
              </p>
            </div>

            <div className={styles["timeGrid"]}>
              <div className={styles["timeRow"]}>
                <TbClock className={styles["mutedIcon"]} />
                <span>
                  {t((m) => m["IMS--Dialogs"].recipeDialog.fields.prepTime)}: {recipe.preparationTime || t((m) => m["IMS--Dialogs"].recipeDialog.read.notSpecified)}
                </span>
              </div>
              <div className={styles["timeRow"]}>
                <TbToolsKitchen3 className={styles["mutedIcon"]} />
                <span>
                  {t((m) => m["IMS--Dialogs"].recipeDialog.fields.cookTime)}: {recipe.cookingTime || t((m) => m["IMS--Dialogs"].recipeDialog.read.notSpecified)}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className={styles["dialogFooter"]}>
          <Button
            type='button'
            onClick={close}>
            {t((m) => m["IMS--Dialogs"].recipeDialog.buttons.close)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
