"use client";

import {usePaginationWithSearch} from "@/hooks";
import type {RecipeSuggestion} from "@/types/invoices";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {useTranslations} from "next-intl-selector";
import {useCallback} from "react";
import {TbConfetti, TbPlus} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import RecipeCard from "../../_cards/RecipeCard";
import styles from "./RecipesTab.module.scss";

type Props = {
  recipes: readonly RecipeSuggestion[];
};

/**
 * Displays recipes that can be made with invoice items, with add and generate capabilities.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Recipe Display**:
 * - Paginated grid of `RecipeCard` components (4 per page)
 * - Each recipe card shows name, complexity, ingredients, and timing
 * - Empty state prompts user to create first recipe
 *
 * **Recipe Actions**:
 * - **Add Recipe**: Opens `AddRecipeDialog` for manual recipe creation
 * - **Generate**: Placeholder for AI-based recipe generation from invoice items
 * - Individual recipe CRUD via `RecipeCard` dropdown menus
 *
 * **Pagination**: Uses `usePaginationWithSearch` hook for client-side pagination
 * with Previous/Next navigation and page indicator.
 *
 * **Domain Context**: Part of the edit-invoice tabbed interface, providing
 * recipe suggestions and management based on purchased food items. Helps users
 * discover cooking ideas from their grocery receipts.
 *
 * @param props - Component properties containing recipes array from invoice
 * @returns Client-rendered card with paginated recipe grid and action buttons
 *
 * @example
 * ```tsx
 * <RecipesTab recipes={invoice.possibleRecipes} />
 * // Displays: Recipe grid with add/generate buttons and pagination
 * ```
 *
 * @see {@link AddRecipeDialog} - Dialog for creating recipes
 * @see {@link RecipeCard} - Opens focused recipe action dialogs for existing recipes
 * @see {@link usePaginationWithSearch} - Pagination hook
 */
export default function RecipesTab({recipes}: Readonly<Props>): React.JSX.Element {
  const t = useTranslations();
  const {open: openAddDialog} = useDialog("EDIT_INVOICE__RECIPE_ADD", "add");

  const {paginatedItems, currentPage, setCurrentPage, totalPages} = usePaginationWithSearch({items: recipes, initialPageSize: 4});

  const handleNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  }, [currentPage, totalPages, setCurrentPage]);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  }, [currentPage, setCurrentPage]);

  const handleGenerateRecipe = useCallback(() => {
    // TODO: Implement AI recipe generation
    toast(
      t((m) => m.pages.invoices.editInvoice.recipesTab.toasts.aiGenerationComingSoon.title),
      {
        description: t((m) => m.pages.invoices.editInvoice.recipesTab.toasts.aiGenerationComingSoon.description),
      },
    );
  }, [t]);

  const handleCreateFirstRecipe = useCallback(() => {
    openAddDialog();
  }, [openAddDialog]);

  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -10}}
      transition={{duration: 0.2}}>
      <Card className={styles["card"]}>
        <CardHeader className={styles["cardHeader"]}>
          <div>
            <CardTitle>{t((m) => m.pages.invoices.editInvoice.recipesTab.header.title)}</CardTitle>
            <CardDescription>{t((m) => m.pages.invoices.editInvoice.recipesTab.header.description)}</CardDescription>
          </div>
          <TooltipProvider>
            <div className={styles["headerActions"]}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant='ghost'
                      className={styles["generateButton"]}
                      onClick={handleGenerateRecipe}
                      size='sm'>
                      <TbConfetti className={styles["buttonIcon"]} />
                      {t((m) => m.pages.invoices.editInvoice.recipesTab.buttons.generate)}
                    </Button>
                  }
                />
                <TooltipContent side='bottom'>
                  <p>{t((m) => m.pages.invoices.editInvoice.recipesTab.tooltips.generateRecipeUsingAi)}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      className={styles["addButton"]}
                      onClick={openAddDialog}
                      size='sm'>
                      <TbPlus className={styles["buttonIcon"]} />
                      {t((m) => m.pages.invoices.editInvoice.recipesTab.buttons.addRecipe)}
                    </Button>
                  }
                />
                <TooltipContent>
                  <p>{t((m) => m.pages.invoices.editInvoice.recipesTab.tooltips.createRecipeWithIngredients)}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </CardHeader>
        <CardContent>
          {paginatedItems.length > 0 ? (
            <div className={styles["recipesGrid"]}>
              {paginatedItems.map((recipe) => (
                <RecipeCard
                  key={recipe.name}
                  recipe={recipe}
                />
              ))}
            </div>
          ) : (
            <div className={styles["emptyState"]}>
              <p className={styles["emptyText"]}>{t((m) => m.pages.invoices.editInvoice.recipesTab.emptyState.noRecipesAvailable)}</p>
              <Button
                onClick={handleCreateFirstRecipe}
                variant='outline'
                className={styles["createButton"]}>
                <TbPlus className={styles["buttonIcon"]} />
                {t((m) => m.pages.invoices.editInvoice.recipesTab.buttons.createFirstRecipe)}
              </Button>
            </div>
          )}
          {totalPages > 1 && (
            <div className={styles["paginationBar"]}>
              <Button
                variant='ghost'
                size='sm'
                onClick={handlePreviousPage}
                disabled={currentPage === 1}>
                {t((m) => m.pages.invoices.editInvoice.recipesTab.pagination.previous)}
              </Button>
              <div className={styles["pageInfo"]}>
                {t((m) => m.pages.invoices.editInvoice.recipesTab.pagination.pageOf, {
                  currentPage: String(currentPage),
                  totalPages: String(totalPages),
                })}
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleNextPage}
                disabled={currentPage === totalPages}>
                {t((m) => m.pages.invoices.editInvoice.recipesTab.pagination.next)}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
