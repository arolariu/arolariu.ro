"use client";

/**
 * @fileoverview Structured recipe-suggestion card.
 * @module domains/invoices/edit-invoice/[id]/cards/RecipeCard
 */

import {type RecipeSuggestion} from "@/types/invoices";
import {getAllergenCodeLabel} from "../../../_utils/classificationUtilities";
import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@arolariu/components";
import {useTranslations} from "next-intl-selector";
import {TbClock, TbEdit, TbLayoutBottombarExpand, TbSeparatorHorizontal, TbTrash, TbAlertTriangle} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./RecipeCard.module.scss";

interface Props {
  /** Structured recipe returned by the analysis API. */
  readonly recipe: RecipeSuggestion;
}

/**
 * Renders purchased ingredients, pantry assumptions, optional gaps, ordered
 * instructions, timing, and cautious allergen warnings for one recipe.
 */
export default function RecipeCard({recipe}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const {open: openEditDialog} = useDialog("EDIT_INVOICE__RECIPE_UPDATE", "edit", {recipe});
  const {open: openViewDialog} = useDialog("EDIT_INVOICE__RECIPE_PREVIEW", "view", {recipe});
  const {open: openDeleteDialog} = useDialog("EDIT_INVOICE__RECIPE_DELETE", "delete", {recipe});

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle>
          <h3 className={styles["title"]}>{recipe.name}</h3>
          <Badge className={styles["complexityBadge"]}>{recipe.difficulty}</Badge>
        </CardTitle>
        <CardAction className={styles["cardAction"]}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon'
                  aria-label={t((m) => m.cards.invoices.recipeCard.dropdown.view)}>
                  <TbSeparatorHorizontal className={styles["icon4"]} />
                </Button>
              }
            />
            <DropdownMenuContent align='end'>
              <DropdownMenuItem onClick={openViewDialog}>
                <TbLayoutBottombarExpand className={styles["menuIcon"]} />
                {t((m) => m.cards.invoices.recipeCard.dropdown.view)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openEditDialog}>
                <TbEdit className={styles["menuIcon"]} />
                {t((m) => m.cards.invoices.recipeCard.dropdown.edit)}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={openDeleteDialog}>
                <TbTrash className={styles["menuIcon"]} />
                {t((m) => m.cards.invoices.recipeCard.dropdown.delete)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <p className={styles["description"]}>{recipe.description}</p>
        <div className={styles["ingredientsSection"]}>
          <h4 className={styles["ingredientsLabel"]}>{t((m) => m.cards.invoices.recipeCard.ingredients.label)}</h4>
          <ul className={styles["ingredientsList"]}>
            {recipe.purchasedIngredients.map((ingredient) => (
              <li key={`${ingredient.name}-${ingredient.quantity}`}>
                {ingredient.name} — {ingredient.quantity}
                {ingredient.preparation === null ? null : ` (${ingredient.preparation})`}
              </li>
            ))}
          </ul>
          <ul className={styles["ingredientsList"]}>
            {recipe.assumedPantryStaples.map((ingredient) => (
              <li key={`${ingredient.name}-${ingredient.quantity}`}>
                {ingredient.name} — {ingredient.quantity}
                {ingredient.preparation === null ? null : ` (${ingredient.preparation})`}
              </li>
            ))}
          </ul>
          <ul className={styles["ingredientsList"]}>
            {recipe.missingOptionalIngredients.map((ingredient) => (
              <li key={`${ingredient.name}-${ingredient.quantity}`}>
                {ingredient.name} — {ingredient.quantity}
                {ingredient.preparation === null ? null : ` (${ingredient.preparation})`}
              </li>
            ))}
          </ul>
        </div>
        <ol className={styles["ingredientsList"]}>
          {recipe.steps.map((step) => (
            <li key={step.sequence}>
              {step.instruction}
              {step.notes === null ? null : ` (${step.notes})`}
            </li>
          ))}
        </ol>
        {recipe.allergenWarnings.length === 0 ? null : (
          <ul className={styles["ingredientsList"]}>
            {recipe.allergenWarnings.map((warning) => (
              <li key={warning}>
                <TbAlertTriangle className={styles["menuIcon"]} />
                {getAllergenCodeLabel(warning)}
              </li>
            ))}
          </ul>
        )}
        <div className={styles["timingRow"]}>
          <span className={styles["timeItem"]}>
            <TbClock className={styles["timeIcon"]} />
            {t((m) => m.cards.invoices.recipeCard.timing.prepLabel, {minutes: String(recipe.preparationMinutes)})}
          </span>
          <span className={styles["timeItem"]}>
            <TbClock className={styles["timeIcon"]} />
            {t((m) => m.cards.invoices.recipeCard.timing.cookLabel, {minutes: String(recipe.cookingMinutes)})}
          </span>
        </div>
      </CardContent>
      <CardFooter className={styles["cardFooter"]}>
        <Button
          variant='default'
          size='sm'
          onClick={openViewDialog}>
          {t((m) => m.cards.invoices.recipeCard.buttons.viewRecipe)}
          <TbLayoutBottombarExpand />
        </Button>
      </CardFooter>
    </Card>
  );
}
