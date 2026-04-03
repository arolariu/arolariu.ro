"use client";

import {type Recipe, RecipeComplexity} from "@/types/invoices";
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
import {useTranslations} from "next-intl";
import {
  TbClock,
  TbEdit,
  TbExternalLink,
  TbHeart,
  TbLayoutBottombarExpand,
  TbSeparatorHorizontal,
  TbShare,
  TbToolsKitchen,
  TbTrash,
} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./RecipeCard.module.scss";

type Props = {
  recipe: Recipe;
};

/**
 * Displays a recipe card with full CRUD operations via dialog-based editing.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Recipe Details Displayed**:
 * - **Name**: Recipe title with complexity badge (Easy/Normal/Hard)
 * - **Description**: Brief recipe overview
 * - **Ingredients**: First 3 shown with expandable tooltip for remaining
 * - **Timing**: Preparation and cooking time with clock icons
 *
 * **CRUD Operations** (via dropdown menu):
 * - **Edit**: Opens `RecipeDialog` in edit mode for modifying recipe details
 * - **Delete**: Opens `RecipeDialog` in delete mode for confirmation
 * - **Share**: Opens `RecipeDialog` in share mode for sharing options
 * - **View**: Opens `RecipeDialog` in view mode via "View Recipe" button
 * - **Mark as Favorite**: Placeholder for future implementation
 *
 * **Visual Design**:
 * - Complexity badge color varies by difficulty (default/secondary/destructive)
 * - Hover shadow effect for card interactivity
 * - External link button for recipe reference URL
 *
 * **Domain Context**: Part of the recipes tab in edit-invoice, allowing users
 * to manage recipes that can be made with invoice items.
 *
 * @param props - Component properties containing the recipe to display
 * @returns Client-rendered card with recipe details and action menu
 *
 * @example
 * ```tsx
 * <RecipeCard recipe={recipe} />
 * // Displays: Recipe name, complexity, ingredients, timing, action menu
 * ```
 *
 * @see {@link RecipeDialog} - Multi-mode dialog for recipe CRUD operations
 * @see {@link Recipe} - Recipe type definition
 * @see {@link RecipeComplexity} - Complexity enum for badge styling
 */
export default function RecipeCard({recipe}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations("Invoices.EditInvoice.recipeCard");
  const {name, complexity, description, ingredients, preparationTime, cookingTime} = recipe;

  const complexityLabelMap: Readonly<Record<RecipeComplexity, string>> = {
    [RecipeComplexity.Unknown]: t("complexity.unknown"),
    [RecipeComplexity.Easy]: t("complexity.easy"),
    [RecipeComplexity.Normal]: t("complexity.normal"),
    [RecipeComplexity.Hard]: t("complexity.hard"),
  };

  const getBadgeVariant = () => {
    switch (complexity) {
      case RecipeComplexity.Easy:
        return "default";
      case RecipeComplexity.Normal:
        return "secondary";
      default:
        return "destructive";
    }
  };

  const {open: openEditDialog} = useDialog("EDIT_INVOICE__RECIPE", "edit", recipe);
  const {open: openViewDialog} = useDialog("EDIT_INVOICE__RECIPE", "view", recipe);
  const {open: openDeleteDialog} = useDialog("EDIT_INVOICE__RECIPE", "delete", recipe);
  const {open: openShareDialog} = useDialog("EDIT_INVOICE__RECIPE", "share", recipe);

  return (
    <Card className={styles["card"]}>
      <CardHeader>
        <CardTitle>
          <h3 className={styles["title"]}>{name}</h3>
          <Badge
            variant={getBadgeVariant()}
            className={styles["complexityBadge"]}>
            {complexityLabelMap[complexity]}
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
                <TbEdit className={styles["menuIcon"]} />
                {t("dropdown.view")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={styles["menuItem"]}
                onClick={openEditDialog}>
                <TbEdit className={styles["menuIcon"]} />
                {t("dropdown.edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={styles["menuItemDestructive"]}
                onClick={openDeleteDialog}>
                <TbTrash className={styles["menuIcon"]} />
                {t("dropdown.delete")}
              </DropdownMenuItem>
              <DropdownMenuItem
                className={styles["menuItemAccent"]}
                onClick={openShareDialog}>
                <TbShare className={styles["menuIcon"]} />
                {t("dropdown.share")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className={styles["menuItemMuted"]}>
                <TbHeart className={styles["menuIcon"]} />
                {t("dropdown.markAsFavorite")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </CardAction>
      </CardHeader>
      <CardContent className={styles["cardContent"]}>
        <p className={styles["description"]}>{description}</p>

        <div className={styles["ingredientsSection"]}>
          <h4 className={styles["ingredientsLabel"]}>{t("ingredients.label")}</h4>
          <ul className={styles["ingredientsList"]}>
            {ingredients.slice(0, 3).map((ingredient, index) => (
              <li key={`${ingredient}-${index}`}>{ingredient}</li>
            ))}
            {ingredients.length > 3 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={<li className={styles["moreIngredients"]}>{t("ingredients.more", {count: String(ingredients.length - 3)})}</li>}
                  />
                  <TooltipContent className={styles["tooltipContent"]}>
                    <p className={styles["tooltipTitle"]}>{t("ingredients.additionalLabel")}</p>
                    <ul className={styles["tooltipIngredientsList"]}>
                      {ingredients.slice(3).map((ingredient, index) => (
                        <li key={`${ingredient}-${index + 3}`}>{ingredient}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </ul>
        </div>

        {/** Prep + Cook times */}
        <div className={styles["timingRow"]}>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className={styles["timeItem"]}>
                    <TbClock className={styles["timeIcon"]} />
                    {t("timing.prepLabel", {minutes: String(preparationTime)})}
                  </div>
                }
              />
              <TooltipContent side='bottom'>
                <p>{t("timing.prepTooltip", {minutes: String(preparationTime)})}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className={styles["timeItem"]}>
                    <TbToolsKitchen className={styles["timeIcon"]} />
                    {t("timing.cookLabel", {minutes: String(cookingTime)})}
                  </div>
                }
              />
              <TooltipContent side='bottom'>
                <p>{t("timing.cookTooltip", {minutes: String(cookingTime)})}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardContent>

      <CardFooter className={styles["cardFooter"]}>
        <Button
          variant='ghost'
          size='sm'>
          {t("buttons.visitReference")}
          <TbExternalLink className={styles["externalLinkIcon"]} />
        </Button>
        <Button
          variant='default'
          size='sm'
          onClick={openViewDialog}>
          {t("buttons.viewRecipe")}
          <TbLayoutBottombarExpand />
        </Button>
      </CardFooter>
    </Card>
  );
}
