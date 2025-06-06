/** @format */

"use client";

import {type Recipe, RecipeComplexity} from "@/types/invoices";
import {
  Badge,
  Button,
  Card,
  CardFooter,
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

type Props = {
  recipe: Recipe;
};

/**
 * The RecipeCard component displays information about a recipe.
 * It includes the recipe's name, complexity, description, ingredients, preparation time, and cooking time.
 * The card also provides options to edit, delete, or share the recipe.
 * @returns The RecipeCard component, CSR'ed.
 */
export default function RecipeCard({recipe}: Readonly<Props>): React.JSX.Element {
  const {name, complexity, description, ingredients, preparationTime, cookingTime} = recipe;

  const complexityKey = Object.keys(RecipeComplexity).at(complexity);
  const complexityAsString = RecipeComplexity[complexityKey as keyof typeof RecipeComplexity];

  const getBadgeVariant = () => {
    if (complexity === RecipeComplexity.Easy) return "default";
    if (complexity === RecipeComplexity.Normal) return "secondary";
    return "destructive";
  };

  const {open: openEditDialog} = useDialog("INVOICE_RECIPE", "edit", recipe);
  const {open: openViewDialog} = useDialog("INVOICE_RECIPE", "view", recipe);
  const {open: openDeleteDialog} = useDialog("INVOICE_RECIPE", "delete", recipe);
  const {open: openShareDialog} = useDialog("INVOICE_RECIPE", "share", recipe);

  return (
    <Card className='overflow-hidden transition-shadow duration-300 hover:shadow-md'>
      <div className='h-full p-4'>
        <div className='mb-2 flex items-start justify-between'>
          <div>
            <h3 className='text-lg font-semibold'>{name}</h3>
            <Badge
              variant={getBadgeVariant()}
              className='mt-1'>
              {complexityAsString}
            </Badge>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant='ghost'
                size='icon'>
                <TbSeparatorHorizontal className='h-4 w-4' />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end'>
              <DropdownMenuItem
                className='cursor-pointer'
                onClick={openEditDialog}>
                <TbEdit className='mr-2 h-4 w-4' />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className='cursor-pointer text-red-500'
                onClick={openDeleteDialog}>
                <TbTrash className='mr-2 h-4 w-4' />
                Delete
              </DropdownMenuItem>
              <DropdownMenuItem
                className='cursor-pointer text-blue-500'
                onClick={openShareDialog}>
                <TbShare className='mr-2 h-4 w-4' />
                Share
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className='text-muted-foreground cursor-pointer'>
                <TbHeart className='mr-2 h-4 w-4' />
                Mark as Favorite
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <p className='text-muted-foreground mb-2 text-sm'>{description}</p>

        <div className='space-y-4'>
          <h4 className='text-muted-foreground text-sm'>Ingredients:</h4>
          <ul className='list-disc pl-5 text-sm'>
            {ingredients.slice(0, 3).map((ingredient) => (
              <li key={ingredient.rawName}>{ingredient.rawName}</li>
            ))}
            {ingredients.length > 3 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <li className='text-muted-foreground cursor-help'>+{ingredients.length - 3} more</li>
                  </TooltipTrigger>
                  <TooltipContent className='max-w-xs'>
                    <p className='mb-1 font-medium'>Additional ingredients:</p>
                    <ul className='list-disc pl-5'>
                      {ingredients.slice(3).map((ingredient) => (
                        <li key={ingredient.rawName}>{ingredient.rawName}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </ul>
        </div>

        {/** Prep + Cook times */}
        <div className='text-muted-foreground flex cursor-help gap-4 pt-4 text-xs'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='flex items-center'>
                  <TbClock className='mr-1 h-3 w-3' />
                  Prep: {preparationTime}&lsquo;
                </div>
              </TooltipTrigger>
              <TooltipContent side='bottom'>
                <p>Preparation time is {preparationTime} minutes.</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className='flex items-center'>
                  <TbToolsKitchen className='mr-1 h-3 w-3' />
                  Cook: {cookingTime}&lsquo;
                </div>
              </TooltipTrigger>
              <TooltipContent side='bottom'>
                <p>Cooking time is {cookingTime} minutes.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <CardFooter className='bg-muted/50 px-4 py-2'>
        <div className='mx-auto flex flex-col justify-around gap-6 md:flex-row'>
          <Button
            variant='ghost'
            size='sm'>
            Visit Reference
            <TbExternalLink className='ml-2 h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5' />
          </Button>
          <Button
            variant='default'
            size='sm'
            onClick={openViewDialog}>
            View Recipe
            <TbLayoutBottombarExpand />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
