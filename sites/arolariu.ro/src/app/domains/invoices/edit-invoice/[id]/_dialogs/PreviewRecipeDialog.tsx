"use client";

import {AllergenCode, RecipeDifficulty, type RecipeSuggestion} from "@/types/invoices";
import {getAllergenLabelKey} from "../../../_components/allergens/allergenLabels";
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
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {TbClock, TbToolsKitchen3, TbUsers} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./PreviewRecipeDialog.module.scss";

function getDifficultyBadgeVariant(difficulty: RecipeDifficulty): "default" | "secondary" | "outline" {
  if (difficulty === RecipeDifficulty.Easy) return "default";
  if (difficulty === RecipeDifficulty.Medium) return "secondary";
  return "outline";
}

type IngredientSectionProps = {
  readonly heading: string;
  readonly ingredients: RecipeSuggestion["purchasedIngredients"];
  readonly emptyLabel: string;
};

function IngredientSection({heading, ingredients, emptyLabel}: Readonly<IngredientSectionProps>): React.JSX.Element {
  return (
    <div className={styles["fieldGroup"]}>
      <Label>{heading}</Label>
      {ingredients.length > 0 ? (
        <ul className={styles["ingredientReadList"]}>
          {ingredients.map((ing, i) => (
            <li
              key={`${ing.name}-${i}`}
              className={styles["readText"]}>
              <strong>{ing.name}</strong> — {ing.quantity}
              {ing.preparation ? ` (${ing.preparation})` : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles["readText"]}>{emptyLabel}</p>
      )}
    </div>
  );
}

export default function PreviewRecipeDialog(): React.JSX.Element {
  const t = useTranslations();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__RECIPE_PREVIEW", "view");
  const recipe: RecipeSuggestion | null = (payload as {recipe?: RecipeSuggestion})?.recipe ?? null;

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
          <DialogDescription>
            {recipe
              ? t((m) => m.dialogs.invoices.recipeDialog.read.description)
              : t((m) => m.dialogs.invoices.recipeDialog.read.missingRecipe)}
          </DialogDescription>
        </DialogHeader>

        {recipe ? (
          <div className={styles["formBody"]}>
            {/* Description */}
            <div className={styles["fieldGroup"]}>
              <Label>{t((m) => m.dialogs.invoices.recipeDialog.fields.description)}</Label>
              <p className={styles["readText"]}>
                {recipe.description || t((m) => m.dialogs.invoices.recipeDialog.read.noDescription)}
              </p>
            </div>

            {/* Servings + difficulty + times */}
            <div className={styles["timeGrid"]}>
              <div className={styles["fieldGroup"]}>
                <Label>{t((m) => m.dialogs.invoices.recipeDialog.fields.servings)}</Label>
                <div className={styles["timeRow"]}>
                  <TbUsers className={styles["mutedIcon"]} />
                  <span className={styles["readText"]}>{recipe.servings}</span>
                </div>
              </div>
              <div className={styles["fieldGroup"]}>
                <Label>{t((m) => m.dialogs.invoices.recipeDialog.fields.difficulty)}</Label>
                <Badge variant={getDifficultyBadgeVariant(recipe.difficulty)}>
                  {t((m) => m.dialogs.invoices.recipeDialog.difficulty[recipe.difficulty])}
                </Badge>
              </div>
              <div className={styles["fieldGroup"]}>
                <Label>{t((m) => m.dialogs.invoices.recipeDialog.fields.prepTime)}</Label>
                <div className={styles["timeRow"]}>
                  <TbClock className={styles["mutedIcon"]} />
                  <span className={styles["readText"]}>
                    {recipe.preparationMinutes} {t((m) => m.dialogs.invoices.recipeDialog.minutes)}
                  </span>
                </div>
              </div>
              <div className={styles["fieldGroup"]}>
                <Label>{t((m) => m.dialogs.invoices.recipeDialog.fields.cookTime)}</Label>
                <div className={styles["timeRow"]}>
                  <TbToolsKitchen3 className={styles["mutedIcon"]} />
                  <span className={styles["readText"]}>
                    {recipe.cookingMinutes} {t((m) => m.dialogs.invoices.recipeDialog.minutes)}
                  </span>
                </div>
              </div>
              <div className={styles["fieldGroup"]}>
                <Label>{t((m) => m.dialogs.invoices.recipeDialog.fields.totalDuration)}</Label>
                <div className={styles["timeRow"]}>
                  <TbClock className={styles["mutedIcon"]} />
                  <span className={styles["readText"]}>
                    {recipe.totalMinutes} {t((m) => m.dialogs.invoices.recipeDialog.minutes)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ingredient sections */}
            <IngredientSection
              heading={t((m) => m.dialogs.invoices.recipeDialog.fields.purchasedIngredients)}
              ingredients={recipe.purchasedIngredients}
              emptyLabel={t((m) => m.dialogs.invoices.recipeDialog.read.noIngredients)}
            />
            <IngredientSection
              heading={t((m) => m.dialogs.invoices.recipeDialog.fields.pantryStaples)}
              ingredients={recipe.assumedPantryStaples}
              emptyLabel={t((m) => m.dialogs.invoices.recipeDialog.read.noIngredients)}
            />
            <IngredientSection
              heading={t((m) => m.dialogs.invoices.recipeDialog.fields.missingIngredients)}
              ingredients={recipe.missingOptionalIngredients}
              emptyLabel={t((m) => m.dialogs.invoices.recipeDialog.read.noIngredients)}
            />

            {/* Steps */}
            <div className={styles["fieldGroup"]}>
              <Label>{t((m) => m.dialogs.invoices.recipeDialog.fields.steps)}</Label>
              <ol className={styles["stepsList"]}>
                {[...recipe.steps]
                  .sort((a, b) => a.sequence - b.sequence)
                  .map((step) => (
                    <li
                      key={step.sequence}
                      className={styles["readText"]}>
                      {step.instruction}
                      {step.notes ? <em className={styles["stepNotes"]}> — {step.notes}</em> : null}
                    </li>
                  ))}
              </ol>
            </div>

            {/* Allergen warnings */}
            <div
              className={styles["fieldGroup"]}
              aria-label={t((m) => m.dialogs.invoices.recipeDialog.fields.allergens)}>
              <Label>{t((m) => m.dialogs.invoices.recipeDialog.fields.allergens)}</Label>
              {recipe.allergenWarnings.length > 0 ? (
                <div className={styles["allergensList"]}>
                  {recipe.allergenWarnings.map((code) => (
                    <Badge
                      key={code}
                      variant='destructive'>
                      {t(selectorFromPath(getAllergenLabelKey(code as AllergenCode)))}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className={styles["readText"]}>{t((m) => m.dialogs.invoices.recipeDialog.read.noAllergens)}</p>
              )}
            </div>
          </div>
        ) : null}

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
