"use client";

import {RecipeComplexity} from "@/types/invoices";
import {Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Label} from "@arolariu/components";
import {useTranslations} from "next-intl";
import {useCallback} from "react";
import {TbClock, TbToolsKitchen3} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./RecipeDialog.module.scss";

function getBadgeVariant(complexity: RecipeComplexity): "default" | "secondary" | "outline" {
  if (complexity === RecipeComplexity.Easy) return "default";
  if (complexity === RecipeComplexity.Normal) return "secondary";
  return "outline";
}

export default function PreviewRecipeDialog(): React.JSX.Element {
  const t = useTranslations("IMS--Dialogs.recipeDialog");
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
          <DialogTitle>{recipe?.name ?? t("read.missingRecipe")}</DialogTitle>
          <DialogDescription>{recipe ? t("read.description") : t("read.missingRecipe")}</DialogDescription>
        </DialogHeader>

        {recipe ? (
          <div className={styles["formBody"]}>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-preview-description'>{t("fields.description")}</Label>
              <p
                id='recipe-preview-description'
                className={styles["readText"]}>
                {recipe.description || t("read.noDescription")}
              </p>
            </div>

            <div className={styles["fieldGroup"]}>
              <Label>{t("fields.ingredients")}</Label>
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
              <Label htmlFor='recipe-preview-complexity'>{t("fields.complexity")}</Label>
              <Badge
                id='recipe-preview-complexity'
                variant={getBadgeVariant(recipe.complexity)}>
                {recipe.complexity || t("difficulty.medium").toUpperCase()}
              </Badge>
            </div>

            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-preview-instructions'>{t("fields.instructions")}</Label>
              <p
                id='recipe-preview-instructions'
                className={styles["readText"]}>
                {recipe.instructions || t("read.notSpecified")}
              </p>
            </div>

            <div className={styles["timeGrid"]}>
              <div className={styles["timeRow"]}>
                <TbClock className={styles["mutedIcon"]} />
                <span>
                  {t("fields.prepTime")}: {recipe.preparationTime || t("read.notSpecified")}
                </span>
              </div>
              <div className={styles["timeRow"]}>
                <TbToolsKitchen3 className={styles["mutedIcon"]} />
                <span>
                  {t("fields.cookTime")}: {recipe.cookingTime || t("read.notSpecified")}
                </span>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className={styles["dialogFooter"]}>
          <Button
            type='button'
            onClick={close}>
            {t("buttons.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
