"use client";

// TODO: refactor.
/* eslint-disable */

import {RecipeComplexity, type Recipe} from "@/types/invoices";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {useCallback, useState} from "react";
import {TbClock, TbDisc, TbPlus, TbSparkles, TbToolsKitchen, TbToolsKitchen3, TbWand, TbX} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";

const CreateDialog = () => {
  const {isOpen, open, close} = useDialog("INVOICE_RECIPE");
  const [recipe, setRecipe] = useState<Recipe>({
    name: "",
    description: "",
    ingredients: [],
    duration: -1,
    preparationTime: -1,
    cookingTime: -1,
    complexity: RecipeComplexity.Easy,
    instructions: "",
    referenceForMoreDetails: "",
  } satisfies Recipe);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target;
    console.log(name, value);
    setRecipe((prev) => ({
      ...prev,
      [name]: value,
    }));
  }, []);

  const handleCreate = useCallback(() => {
    console.log("Recipe created:", recipe);
    close();
  }, [recipe]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md md:max-w-lg'>
        <DialogHeader>
          <DialogTitle>Add New Recipe</DialogTitle>
          <DialogDescription>Fill in the details to create a recipe.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4 py-2'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='name'>Recipe Name</Label>
              <div className='flex items-center'>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {}}
                        className='flex items-center gap-1'>
                        <TbSparkles className='h-3 w-3' />
                        Generate Name
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className='max-w-xs'>Generate a recipe name based on your ingredients and difficulty level using AI</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Input
              id='name'
              name='name'
              value={recipe.name}
              onChange={handleChange}
              placeholder='Enter recipe name'
            />
          </div>

          {/* Add description field */}
          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              name='description'
              value={recipe.description} // updated from formData to recipe
              onChange={handleChange}
              placeholder='Enter a brief description of the recipe'
              rows={2}
            />
          </div>

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label>Ingredients</Label>
              <Button
                type='button'
                variant='outline'
                size='sm'>
                <TbPlus className='mr-1 h-4 w-4' />
                Add
              </Button>
            </div>

            <div className='space-y-2'>
              {recipe.ingredients.map((ingredient, idx) => (
                <div
                  key={idx}
                  className='relative'>
                  <div className='flex gap-2'>
                    <div className='relative flex-1'>
                      <Input
                        value={ingredient.rawName}
                        placeholder={`Ingredient ${idx + 1} (from receipt or custom)`}
                      />
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      disabled={recipe.ingredients.length <= 1}>
                      <TbX className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add difficulty selector */}
          <div className='space-y-2'>
            <Label htmlFor='difficulty'>Difficulty Level</Label>
            <Select
              value={RecipeComplexity[recipe.complexity]}
              onValueChange={(value) => {
                const complexity = RecipeComplexity[value as keyof typeof RecipeComplexity];
                setRecipe((prev) => ({
                  ...prev,
                  complexity: complexity,
                }));
              }}>
              <SelectTrigger>
                <SelectValue placeholder='Select difficulty' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='EASY'>Easy</SelectItem>
                <SelectItem value='MEDIUM'>Medium</SelectItem>
                <SelectItem value='HARD'>Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add instructions field */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='instructions'>Instructions</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={() => {}}>
                      <TbWand className='mr-1 h-4 w-4' />
                      Enhance Instructions
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Use AI to enhance your instructions with more details</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id='instructions'
              name='instructions'
              value={recipe.instructions}
              onChange={handleChange}
              placeholder='Enter cooking instructions'
              rows={4}
            />
          </div>

          {/* Add preparation time field */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='prepTime'>Prep Time</Label>
              <div className='flex items-center'>
                <TbClock className='text-muted-foreground mr-2 h-4 w-4' />
                <Input
                  id='prepTime'
                  name='prepTime'
                  value={recipe.preparationTime}
                  onChange={handleChange}
                  placeholder='e.g. 15 minutes'
                />
              </div>
            </div>

            {/* Add cooking time field */}
            <div className='space-y-2'>
              <Label htmlFor='cookTime'>Cook Time</Label>
              <div className='flex items-center'>
                <TbToolsKitchen className='text-muted-foreground mr-2 h-4 w-4' />
                <Input
                  id='cookTime'
                  name='cookTime'
                  value={recipe.cookingTime}
                  onChange={handleChange}
                  placeholder='e.g. 30 minutes'
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className='flex items-center justify-between sm:justify-between'>
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={close}>
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleCreate}>
              <TbDisc className='mr-2 h-4 w-4' />
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ReadDialog = ({recipe}: Readonly<{recipe: Recipe}>) => {
  const {isOpen, open, close} = useDialog("INVOICE_RECIPE");

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-md md:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{recipe.name}</DialogTitle>
          <DialogDescription>Recipe details and cooking instructions</DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          {/* Add description field */}
          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <p className='text-sm'>{recipe?.description || "No description provided."}</p>
          </div>

          <div className='space-y-2'>
            <Label>Ingredients</Label>
            <ul className='list-disc space-y-1 pl-5'>
              {recipe?.ingredients.map((ingredient, idx) => (
                <li
                  key={idx}
                  className='text-sm'>
                  {ingredient.rawName}
                </li>
              ))}
            </ul>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='complexity'>Complexity Level</Label>
            <Badge
              variant={
                recipe?.complexity === RecipeComplexity.Easy
                  ? "default"
                  : recipe?.complexity === RecipeComplexity.Normal
                    ? "secondary"
                    : "outline"
              }>
              {recipe?.complexity || "MEDIUM"}
            </Badge>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='instructions'>Instructions</Label>

            <div className='grid grid-cols-2 gap-4'>
              <Label htmlFor='preparationTime'>Prep Time</Label>
              <TbClock className='text-muted-foreground mr-2 h-4 w-4' />
              <span>{recipe?.preparationTime || "Not specified"}</span>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='cookingTime'>Cook Time</Label>
            <TbToolsKitchen3 className='text-muted-foreground mr-2 h-4 w-4' />
            <span>{recipe?.cookingTime || "Not specified"}</span>
          </div>
        </div>

        <DialogFooter className='flex items-center justify-between sm:justify-between'>
          <Button
            type='button'
            onClick={close}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UpdateDialog = ({recipe}: Readonly<{recipe: Recipe}>) => {
  const {isOpen, open, close} = useDialog("INVOICE_RECIPE");

  const [recipeDetails, setRecipeDetails] = useState<Recipe>(recipe);

  const generateName = () => {};
  const enhanceInstructions = () => {};

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target;
    console.log(name, value);
  };

  const handleCreate = () => {
    close();
  };

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className='sm:max-w-lg md:max-w-6xl'>
        <DialogHeader>
          <DialogTitle>Add New Recipe</DialogTitle>
          <DialogDescription>Fill in the details to create a recipe.</DialogDescription>
        </DialogHeader>

        <form className='space-y-4 py-2'>
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='name'>Recipe Name</Label>
              <div className='flex items-center'>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={generateName}
                        className='flex items-center gap-1'>
                        <TbSparkles className='h-3 w-3' />
                        Generate Name
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className='max-w-xs'>Generate a recipe name based on your ingredients and difficulty level using AI</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <Input
              id='name'
              name='name'
              value={recipeDetails.name}
              onChange={handleChange}
              placeholder='Enter recipe name'
            />
          </div>

          {/* Add description field */}
          <div className='space-y-2'>
            <Label htmlFor='description'>Description</Label>
            <Textarea
              id='description'
              name='description'
              value={recipeDetails.description} // updated from formData to recipe
              onChange={handleChange}
              placeholder='Enter a brief description of the recipe'
              rows={2}
            />
          </div>

          {/* Add ingredients field */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label>Ingredients</Label>
              <Button
                type='button'
                variant='outline'
                size='sm'>
                <TbPlus className='mr-1 h-4 w-4' />
                Add
              </Button>
            </div>

            <div className='space-y-2'>
              {recipeDetails.ingredients.map((ingredient, idx) => (
                <div
                  key={ingredient.rawName}
                  className='relative'>
                  <div className='flex gap-2'>
                    <div className='relative flex-1'>
                      <Input
                        value={ingredient.rawName}
                        placeholder={`Ingredient ${idx + 1} (from receipt or custom)`}
                      />
                    </div>
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      disabled={recipeDetails.ingredients.length <= 1}>
                      <TbX className='h-4 w-4' />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add difficulty selector */}
          <div className='space-y-2'>
            <Label htmlFor='difficulty'>Difficulty Level</Label>
            <Select
              value={RecipeComplexity[recipe.complexity]}
              onValueChange={(value) => {
                const complexity = RecipeComplexity[value as keyof typeof RecipeComplexity];
                setRecipeDetails((prev) => ({
                  ...prev,
                  complexity: complexity,
                }));
              }}>
              <SelectTrigger>
                <SelectValue placeholder='Select difficulty' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='EASY'>Easy</SelectItem>
                <SelectItem value='MEDIUM'>Medium</SelectItem>
                <SelectItem value='HARD'>Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add instructions field */}
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='instructions'>Instructions</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={enhanceInstructions}>
                      <TbWand className='mr-1 h-4 w-4' />
                      Enhance Instructions
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Use AI to enhance your instructions with more details</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id='instructions'
              name='instructions'
              value={recipeDetails.instructions}
              onChange={handleChange}
              placeholder='Enter cooking instructions'
              rows={4}
            />
          </div>

          {/* Add preparation time field */}
          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='prepTime'>Prep Time</Label>
              <div className='flex items-center'>
                <TbClock className='text-muted-foreground mr-2 h-4 w-4' />
                <Input
                  id='prepTime'
                  name='prepTime'
                  value={recipeDetails.preparationTime}
                  onChange={handleChange}
                  placeholder='e.g. 15 minutes'
                />
              </div>
            </div>

            {/* Add cooking time field */}
            <div className='space-y-2'>
              <Label htmlFor='cookTime'>Cook Time</Label>
              <div className='flex items-center'>
                <TbToolsKitchen className='text-muted-foreground mr-2 h-4 w-4' />
                <Input
                  id='cookTime'
                  name='cookTime'
                  value={recipeDetails.cookingTime}
                  onChange={handleChange}
                  placeholder='e.g. 30 minutes'
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className='flex items-center justify-between sm:justify-between'>
          <div className='flex gap-2'>
            <Button
              type='button'
              variant='outline'
              onClick={close}>
              Cancel
            </Button>
            <Button
              type='button'
              onClick={handleCreate}>
              <TbDisc className='mr-2 h-4 w-4' />
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteDialog = ({recipe}: Readonly<{recipe: Recipe}>) => {
  const {isOpen, open, close} = useDialog("INVOICE_RECIPE");

  const handleDelete = useCallback(() => {}, []);

  return (
    <AlertDialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the recipe <strong>{recipe.name}</strong> and all its associated
            data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className='bg-destructive text-destructive-foreground'>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Dialog component for managing recipes.
 * It handles adding, editing, deleting, and viewing recipes.
 * @returns The rendered dialog component for recipes.
 */
export default function RecipeDialog(): React.JSX.Element {
  const {
    currentDialog: {mode, payload},
  } = useDialog("INVOICE_RECIPE");

  const recipe = payload as Recipe;

  switch (mode) {
    case "add":
      return <CreateDialog />;
    case "delete":
      return <DeleteDialog recipe={recipe} />;
    case "edit":
      return <UpdateDialog recipe={recipe} />;
    case "view":
      return <ReadDialog recipe={recipe} />;
    default:
      return false as unknown as React.JSX.Element;
  }
}
