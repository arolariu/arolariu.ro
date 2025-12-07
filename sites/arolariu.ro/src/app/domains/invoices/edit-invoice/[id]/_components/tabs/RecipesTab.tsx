"use client";

import {usePaginationWithSearch} from "@/hooks";
import type {Recipe} from "@/types/invoices";
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
import {useCallback} from "react";
import {TbConfetti, TbPlus} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import RecipeCard from "../cards/RecipeCard";

type Props = {
  recipes: Recipe[];
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
 * - **Add Recipe**: Opens `RecipeDialog` in add mode for manual recipe creation
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
 * @see {@link RecipeCard} - Individual recipe display component
 * @see {@link RecipeDialog} - Dialog for recipe CRUD operations
 * @see {@link usePaginationWithSearch} - Pagination hook
 */
export default function RecipesTab({recipes}: Readonly<Props>): React.JSX.Element {
  const {open: openAddDialog} = useDialog("INVOICE_RECIPE", "add");

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
    toast("AI recipe generation coming soon", {
      description: "This feature is currently under development.",
    });
  }, []);

  const handleCreateFirstRecipe = useCallback(() => {
    openAddDialog();
  }, [openAddDialog]);

  return (
    <motion.div
      initial={{opacity: 0, y: 10}}
      animate={{opacity: 1, y: 0}}
      exit={{opacity: 0, y: -10}}
      transition={{duration: 0.2}}>
      <Card className='group transition-shadow duration-300 hover:shadow-md'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <div>
            <CardTitle>Recipes You Can Make</CardTitle>
            <CardDescription>Based on items in this invoice</CardDescription>
          </div>
          <TooltipProvider>
            <div className='flex flex-row gap-4'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    className='cursor-pointer'
                    onClick={handleGenerateRecipe}
                    size='sm'>
                    <TbConfetti className='mr-2 h-4 w-4' />
                    Generate
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='bottom'>
                  <p>Generate a recipe using AI!</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className='cursor-pointer'
                    onClick={openAddDialog}
                    size='sm'>
                    <TbPlus className='mr-2 h-4 w-4' />
                    Add Recipe
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create a new recipe with these ingredients</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </CardHeader>
        <CardContent>
          {paginatedItems.length > 0 ? (
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              {recipes.map((recipe) => (
                <RecipeCard
                  key={recipe.name}
                  recipe={recipe}
                />
              ))}
            </div>
          ) : (
            <div className='py-8 text-center'>
              <p className='text-muted-foreground mb-4'>No recipes available yet</p>
              <Button
                onClick={handleCreateFirstRecipe}
                variant='outline'
                className='cursor-pointer'>
                <TbPlus className='mr-2 h-4 w-4' />
                Create Your First Recipe
              </Button>
            </div>
          )}
          {totalPages > 1 && (
            <div className='flex items-center justify-between pt-4'>
              <Button
                variant='ghost'
                size='sm'
                onClick={handlePreviousPage}
                disabled={currentPage === 1}>
                Previous
              </Button>
              <div className='text-sm'>
                Page {currentPage} of {totalPages}
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleNextPage}
                disabled={currentPage === totalPages}>
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
