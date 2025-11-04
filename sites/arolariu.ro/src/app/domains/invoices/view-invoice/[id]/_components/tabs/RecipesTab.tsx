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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {motion} from "motion/react";
import {TbConfetti, TbPlus} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import RecipeCard from "../cards/RecipeCard";

type Props = {
  recipes: Recipe[];
};

/**
 * The recipes tab from the view-invoice page.
 * This tab displays a list of recipes that can be made with the items in the invoice.
 * It also provides a button to add a new recipe and a button to generate a recipe using AI.
 * @returns The recipes tab component, CSR'ed.
 */
export default function RecipesTab({recipes}: Readonly<Props>): React.JSX.Element {
  const {open: openAddDialog} = useDialog("INVOICE_RECIPE", "add");

  const {paginatedItems, currentPage, setCurrentPage, totalPages} = usePaginationWithSearch({items: recipes, initialPageSize: 4});

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleGenerateRecipe = () => {
    // TODO: Implement AI recipe generation
  };

  const handleCreateFirstRecipe = () => {
    openAddDialog();
  };

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
                    onClick={() => {}}
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
                onClick={() => {}}
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
