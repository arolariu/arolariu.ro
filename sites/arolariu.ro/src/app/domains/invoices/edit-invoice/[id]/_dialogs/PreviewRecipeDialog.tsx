"use client";

import {RecipeDifficulty, getAllergenLabelKey, type RecipeSuggestion} from "@/types/invoices";
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

type IngredientEntry = Readonly<{
  ingredient: RecipeSuggestion["purchasedIngredients"][number];
  key: string;
}>;

function buildIngredientEntries(ingredients: RecipeSuggestion["purchasedIngredients"]): IngredientEntry[] {
  const occurrences = new Map<string, number>();
  return ingredients.map((ingredient) => {
    const identity = JSON.stringify([ingredient.name, ingredient.quantity, ingredient.preparation]);
    const occurrence = occurrences.get(identity) ?? 0;
    occurrences.set(identity, occurrence + 1);
    return {ingredient, key: `${identity}-${String(occurrence)}`};
  });
}

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
  const ingredientEntries = buildIngredientEntries(ingredients);

  return (
    <div className={styles["fieldGroup"]}>
      <Label>{heading}</Label>
      {ingredients.length > 0 ? (
        <ul className={styles["ingredientReadList"]}>
          {ingredientEntries.map(({ingredient, key}) => (
            <li
              key={key}
              className={styles["readText"]}>
              <strong>{ingredient.name}</strong> — {ingredient.quantity}
              {ingredient.preparation ? ` (${ingredient.preparation})` : null}
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
              <p className={styles["readText"]}>{recipe.description || t((m) => m.dialogs.invoices.recipeDialog.read.noDescription)}</p>
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
                  .toSorted((a, b) => a.sequence - b.sequence)
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
                      {t(selectorFromPath(getAllergenLabelKey(code)))}
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
