"use client";

/**
 * @fileoverview Structured recipe-suggestion card.
 * @module domains/invoices/edit-invoice/[id]/cards/RecipeCard
 */

import {type RecipeSuggestion} from "@/types/invoices";
import {RecipeSuggestionDetails} from "../../../_components/analysis/StructuredAnalysisDetails";
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
import {TbEdit, TbLayoutBottombarExpand, TbSeparatorHorizontal, TbTrash} from "react-icons/tb";
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
        <RecipeSuggestionDetails recipe={recipe} />
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
