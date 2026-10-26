"use client";

import {RecipeDifficulty, getAllergenLabelKey, type RecipeSuggestion} from "@/types/invoices";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {TbClock, TbEdit, TbHeart, TbLayoutBottombarExpand, TbSeparatorHorizontal, TbTrash, TbToolsKitchen, TbUsers} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import styles from "./RecipeCard.module.scss";

type Props = {
  readonly recipe: RecipeSuggestion;
  readonly recipeIndex: number;
};

function getDifficultyBadgeVariant(difficulty: RecipeDifficulty): "default" | "secondary" | "outline" {
  if (difficulty === RecipeDifficulty.Easy) return "default";
  if (difficulty === RecipeDifficulty.Medium) return "secondary";
  return "outline";
}

/**
 * Displays a structured recipe card with all 12 RecipeSuggestion fields.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Recipe Details Displayed**:
 * - Name + difficulty badge
 * - Description
 * - Servings count
 * - Prep / cook / total minutes
 * - Total purchased ingredient count
 * - Allergen warnings via canonical EU-14 labels
 *
 * **CRUD Operations** (via dropdown menu):
 * - **Edit**: Opens `UpdateRecipeDialog`
 * - **Delete**: Opens `DeleteRecipeDialog`
 * - **View**: Opens `PreviewRecipeDialog` via "View Recipe" button
 *
 * @param props - Component properties containing the recipe to display
 * @returns Client-rendered card with recipe details and action menu
 */
export default function RecipeCard({recipe, recipeIndex}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const {
    name,
    difficulty,
    description,
    purchasedIngredients,
    assumedPantryStaples,
    missingOptionalIngredients,
    preparationMinutes,
    cookingMinutes,
    totalMinutes,
    servings,
    allergenWarnings,
    steps,
  } = recipe;

  const totalIngredients = purchasedIngredients.length + assumedPantryStaples.length + missingOptionalIngredients.length;

  const {open: openEditDialog} = useDialog("EDIT_INVOICE__RECIPE_UPDATE", "edit", {recipe, recipeIndex});
  const {open: openViewDialog} = useDialog("EDIT_INVOICE__RECIPE_PREVIEW", "view", {recipe});
  const {open: openDeleteDialog} = useDialog("EDIT_INVOICE__RECIPE_DELETE", "delete", {recipe, recipeIndex});

  return (
    <Card className={styles["card"]}>
      <CardHeader className={styles["cardHeader"]}>
        <CardTitle>
          <h3 className={styles["title"]}>{name}</h3>
          <Badge
            variant={getDifficultyBadgeVariant(difficulty)}
            className={styles["complexityBadge"]}>
            {t((m) => m.cards.invoices.recipeCard.difficulty[difficulty])}
          </Badge>
        </CardTitle>
        <CardAction className={styles["cardAction"]}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant='ghost'
                  size='icon'>
                  <TbSeparatorHorizontal className={styles["icon4"]} />
                </Button>
              }
            />
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                className={styles["menuItem"]}
                onClick={openViewDialog}>
                <TbLayoutBottombarExpand className={styles["menuIcon"]} />
                {t((m) => m.cards.invoices.recipeCard.dropdown.view)}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={styles["menuItem"]}
                onClick={openEditDialog}>
                <TbEdit className={styles["menuIcon"]} />
                {t((m) => m.cards.invoices.recipeCard.dropdown.edit)}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={styles["menuItemDestructive"]}
                onClick={openDeleteDialog}>
                <TbTrash className={styles["menuIcon"]} />
                {t((m) => m.cards.invoices.recipeCard.dropdown.delete)}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={styles["menuItemMuted"]}>
                <TbHeart className={styles["menuIcon"]} />
                {t((m) => m.cards.invoices.recipeCard.dropdown.markAsFavorite)}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <p className={styles["description"]}>{description}</p>

        <div className={styles["metaRow"]}>
          <span className={styles["metaItem"]}>
            <TbUsers className={styles["timeIcon"]} />
            {t((m) => m.cards.invoices.recipeCard.servings, {count: String(servings)})}
          </span>
          <span className={styles["metaItem"]}>
            {t((m) => m.cards.invoices.recipeCard.ingredients.total, {count: String(totalIngredients)})}
          </span>
          <span className={styles["metaItem"]}>{t((m) => m.cards.invoices.recipeCard.steps.count, {count: String(steps.length)})}</span>
        </div>

        <div className={styles["timingRow"]}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className={styles["timeItem"]}>
                    <TbClock className={styles["timeIcon"]} />
                    {t((m) => m.cards.invoices.recipeCard.timing.prepLabel, {minutes: String(preparationMinutes)})}
                  </div>
                }
              />
              <TooltipContent side='bottom'>
                <p>{t((m) => m.cards.invoices.recipeCard.timing.prepTooltip, {minutes: String(preparationMinutes)})}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className={styles["timeItem"]}>
                    <TbToolsKitchen className={styles["timeIcon"]} />
                    {t((m) => m.cards.invoices.recipeCard.timing.cookLabel, {minutes: String(cookingMinutes)})}
                  </div>
                }
              />
              <TooltipContent side='bottom'>
                <p>{t((m) => m.cards.invoices.recipeCard.timing.cookTooltip, {minutes: String(cookingMinutes)})}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className={styles["timeItem"]}>
                    <TbClock className={styles["timeIcon"]} />
                    {t((m) => m.cards.invoices.recipeCard.timing.totalLabel, {minutes: String(totalMinutes)})}
                  </div>
                }
              />
              <TooltipContent side='bottom'>
                <p>{t((m) => m.cards.invoices.recipeCard.timing.totalTooltip, {minutes: String(totalMinutes)})}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {allergenWarnings.length > 0 && (
          <div
            className={styles["allergensSection"]}
            aria-label={t((m) => m.cards.invoices.recipeCard.allergens.sectionLabel)}>
            <span className={styles["allergensLabel"]}>{t((m) => m.cards.invoices.recipeCard.allergens.sectionLabel)}:</span>
            <div className={styles["allergensList"]}>
              {allergenWarnings.map((code) => (
                <Badge
                  key={code}
                  variant='destructive'
                  className={styles["allergenBadge"]}>
                  {t(selectorFromPath(getAllergenLabelKey(code)))}
                </Badge>
              ))}
            </div>
          </div>
        )}
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
