/** @format */

"use client";

import {ProductCategory, RecipeComplexity, type Allergen, type Invoice, type Product, type Recipe} from "@/types/invoices";
import {
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
import {Clock, Plus, Save, Sparkles, Utensils, Wand2, X} from "lucide-react";
import {useMemo, useState} from "react";
import {useDialog} from "../../_contexts/DialogContext";

type Props = {
  invoice: Invoice;
  recipe: Recipe;
  mode: "view" | "edit" | "add" | "delete";
  onCreate: (recipe: Recipe) => void;
  onUpdate: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
};

const CreateDialog = ({invoice, onCreate}: Readonly<{invoice: Invoice; onCreate: (recipe: Recipe) => void}>) => {
  const {isOpen, open, close} = useDialog("recipe");
  const [recipe, setRecipe] = useState<Recipe>({} as Recipe);
  const [currentIngredient, setCurrentIngredient] = useState<Product>({
    rawName: "",
    genericName: "",
    quantity: 0,
    quantityUnit: "",
    price: 0,
    totalPrice: 0,
    productCode: "",
    metadata: {
      isComplete: false,
      isEdited: false,
      isSoftDeleted: false,
    },
    category: ProductCategory.NOT_DEFINED,
    detectedAllergens: [] satisfies Allergen[],
  } satisfies Product);

  const fieldGenerationRules = {
    name: recipe.name.length === 0, // can generate name if empty
    description: true, // can always generate description
    instructions: true, // can always enhance instructions
    referenceForMoreDetails: true, // can always generate references
  };

  const generateName = () => {};
  const generateDescription = () => {};
  const enhanceInstructions = () => {};
  const generateReference = () => {};

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target;

    if (name === "ingredients") {
      const currentIngredients = recipe.ingredients || [];
      const updatedIngredients = currentIngredients.map((ingredient) =>
        ingredient.rawName === currentIngredient.rawName ? {...ingredient, rawName: value} : ingredient,
      );
      setRecipe((prev) => ({
        ...prev,
        ingredients: updatedIngredients,
      }));
    } else {
      setRecipe((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleCreate = () => {
    onCreate(recipe);
    close();
  };

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
              {fieldGenerationRules.name && (
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
                          <Sparkles className='h-3 w-3' />
                          Generate Name
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className='max-w-xs'>Generate a recipe name based on your ingredients and difficulty level using AI</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
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
                <Plus className='mr-1 h-4 w-4' />
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
                      <X className='h-4 w-4' />
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
                      onClick={enhanceInstructions}>
                      <Wand2 className='mr-1 h-4 w-4' />
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
                <Clock className='text-muted-foreground mr-2 h-4 w-4' />
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
                <Utensils className='text-muted-foreground mr-2 h-4 w-4' />
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
              <Save className='mr-2 h-4 w-4' />
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ReadDialog = ({recipe}: Readonly<{recipe: Recipe}>) => {
  const {isOpen, open, close} = useDialog("recipe");

  return (
    <Dialog
      open={isOpen}
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
              <Clock className='text-muted-foreground mr-2 h-4 w-4' />
              <span>{recipe?.preparationTime || "Not specified"}</span>
            </div>
          </div>

          <div className='space-y-2'>
            <Label htmlFor='cookingTime'>Cook Time</Label>
            <Utensils className='text-muted-foreground mr-2 h-4 w-4' />
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

// Update the RecipeDialog component to include product suggestions and difficulty
export function RecipeDialog(props: Readonly<Props>) {
  const {invoice, recipe, mode, onCreate, onUpdate, onDelete} = props;

  const DialogComponent = useMemo(() => {
    switch (mode) {
      case "add":
        return (
          <CreateDialog
            invoice={invoice}
            onCreate={onCreate}
          />
        );
      case "view":
        return <ReadDialog recipe={recipe} />;
      case "edit":
        return <></>;
      case "delete":
        return <></>;
      default:
        return null;
    }
  }, [mode, invoice, recipe, onCreate, onUpdate, onDelete]);

  return DialogComponent;
}
