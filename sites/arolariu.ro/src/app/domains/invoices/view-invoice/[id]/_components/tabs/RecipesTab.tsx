/** @format */

"use client";
import {Recipe} from "@/types/invoices";
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
import {motion} from "framer-motion";
import {Plus} from "lucide-react";
import {TbConfetti} from "react-icons/tb";
import {RecipeCard} from "../cards/RecipeCard";

type Props = {
  recipes: Recipe[];
};

export function RecipesTab(props: Readonly<Props>) {
  const {recipes} = props;

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
                    variant={"ghost"}
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
                    onClick={() => {}}
                    size='sm'>
                    <Plus className='mr-2 h-4 w-4' />
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
          {recipes.length > 0 ? (
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
                variant='outline'>
                <Plus className='mr-2 h-4 w-4' />
                Create Your First Recipe
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

