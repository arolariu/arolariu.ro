/** @format */

"use client";

import {Recipe, RecipeComplexity} from "@/types/invoices";
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
  toast,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@arolariu/components";
import {Clock, Plus, Save, Sparkles, Trash, Utensils, Wand2, X} from "lucide-react";
import {useState} from "react";

// Mock invoice data for product suggestions
const invoiceData = {
  items: [
    {id: "1", name: "Tomatoes"},
    {id: "2", name: "Basil"},
    {id: "3", name: "Mozzarella Cheese"},
    {id: "4", name: "Olive Oil"},
    {id: "5", name: "Garlic"},
    {id: "6", name: "Onion"},
    {id: "7", name: "Pasta"},
    {id: "8", name: "Chicken Breast"},
    {id: "9", name: "Broccoli"},
    {id: "10", name: "Salmon"},
  ],
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: Recipe;
  mode: "view" | "edit" | "add";
  onSave?: (recipe: Recipe) => void;
  onDelete?: (recipeId: string) => void;
};

// Update the RecipeDialog component to include product suggestions and difficulty
export function RecipeDialog({open, onOpenChange, recipe, mode, onSave, onDelete}: Readonly<Props>) {
  const isViewMode = mode === "view";
  const isAddMode = mode === "add";

  const [formData, setFormData] = useState<Recipe>(
    recipe ||
      ({
        name: "",
        description: "",
        ingredients: [],
        duration: "",
        complexity: RecipeComplexity.Unknown,
        referenceForMoreDetails: "",
      } satisfies Recipe),
  );

  // Add state for ingredient input and suggestions
  const [currentIngredient, setCurrentIngredient] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Mock function for AI name generation
  const generateRecipeName = () => {
    // In a real app, this would call an AI service
    const baseNames = ["Delicious", "Homemade", "Gourmet", "Quick", "Healthy", "Savory", "Fresh"];
    const mainIngredients = formData.ingredients.slice(0, 2).map((product) => product.rawName);

    const randomBase = baseNames[Math.floor(Math.random() * baseNames.length)];
    const ingredientText = mainIngredients.join(" & ");

    const newName = `${randomBase} ${ingredientText}`;

    setFormData((prev) => ({...prev, name: newName}));
    toast("Recipe name generated", {
      description: "AI has suggested a name based on your ingredients and difficulty",
    });
  };

  // Add a function for enhancing instructions with AI after the generateRecipeName function
  const enhanceInstructions = () => {
    // In a real app, this would call an AI service
    if (!formData.ingredients) return;

    const enhancedInstructions = formData.instructions.trim();
    const steps = enhancedInstructions
      .split(/\d+\./)
      .filter(Boolean)
      .map((step) => step.trim());

    // Add more detailed instructions
    const enhancedSteps = steps.map((step, index) => {
      const stepNumber = index + 1;
      const extraDetails = [
        "Make sure to use medium heat.",
        "Stir occasionally to prevent sticking.",
        "This should take about 2-3 minutes.",
        "Ensure ingredients are evenly distributed.",
        "Use a wooden spoon for best results.",
        "The texture should be smooth and consistent.",
      ];
      const randomDetail = extraDetails[Math.floor(Math.random() * extraDetails.length)];
      return `${stepNumber}. ${step} ${randomDetail}`;
    });

    setFormData((prev) => ({
      ...prev,
      instructions: enhancedSteps.join("\n\n"),
    }));

    toast("Instructions enhanced!", {
      description: "AI has added more details to your cooking instructions",
    });
  };

  // Get products from invoice for ingredient suggestions
  const productSuggestions = invoiceData.items.map((item) => item.name);

  // Filter suggestions based on current input
  const filteredSuggestions = productSuggestions.filter((product) =>
    product.toLowerCase().includes(currentIngredient.toLowerCase()),
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = e.target;
    setFormData((prev) => ({...prev, [name]: value}));
  };

  const handleIngredientChange = (index: number, value: string) => {
    setCurrentIngredient(value);
    setShowSuggestions(true);
  };

  const selectSuggestion = (index: number, suggestion: string) => {
    setCurrentIngredient("");
    setShowSuggestions(false);
  };

  const addIngredient = () => {
    setCurrentIngredient("");
  };

  const removeIngredient = (index: number) => {
    if (formData.ingredients.length <= 1) return;
    const newIngredients = [...formData.ingredients];
    newIngredients.splice(index, 1);
    setFormData((prev) => ({...prev, ingredients: newIngredients}));
  };

  const handleSave = () => {
    // Filter out empty ingredients
    const cleanedRecipe = {
      ...formData,
      ingredients: formData.ingredients,
    };

    if (cleanedRecipe.name.trim() === "") {
      toast("Recipe name required!", {
        description: "Please provide a name for the recipe",
      });
      return;
    }

    if (cleanedRecipe.ingredients.length === 0) {
      toast("Ingredients required!", {
        description: "Please add at least one ingredient",
      });
      return;
    }

    onSave?.(cleanedRecipe);
    toast(`Recipe ${isAddMode ? "added" : "updated"}`, {
      description: `${cleanedRecipe.name} has been ${isAddMode ? "added" : "updated"} successfully`,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (recipe) {
      onDelete?.(recipe.name);
      toast("Recipe deleted", {
        description: `${recipe.name} has been removed`,
      });
      onOpenChange(false);
    }
  };

  // Check if we can generate a name (need ingredients and difficulty)
  const canGenerateName = !isViewMode && formData.ingredients?.length > 0 && formData.complexity;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md md:max-w-lg'>
        <DialogHeader>
          <DialogTitle>{isViewMode ? recipe?.name : isAddMode ? "Add New Recipe" : "Edit Recipe"}</DialogTitle>
          <DialogDescription>
            {isViewMode
              ? "Recipe details and cooking instructions"
              : "Fill in the details to create or update a recipe"}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          {!isViewMode && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='name'>Recipe Name</Label>
                {canGenerateName && (
                  <div className='flex items-center'>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type='button'
                            variant='outline'
                            size='sm'
                            onClick={generateRecipeName}
                            className='flex items-center gap-1'>
                            <Sparkles className='h-3 w-3' />
                            Generate Name
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className='max-w-xs'>
                            Generate a recipe name based on your ingredients and difficulty level using AI
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
              <Input
                id='name'
                name='name'
                value={formData.name}
                onChange={handleChange}
                placeholder='Enter recipe name'
                disabled={isViewMode}
              />
            </div>
          )}

          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <Label>Ingredients</Label>
              {!isViewMode && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={addIngredient}>
                  <Plus className='mr-1 h-4 w-4' />
                  Add
                </Button>
              )}
            </div>

            {isViewMode ? (
              <ul className='list-disc space-y-1 pl-5'>
                {recipe?.ingredients.map((ingredient, idx) => (
                  <li
                    key={idx}
                    className='text-sm'>
                    {ingredient.genericName}
                  </li>
                ))}
              </ul>
            ) : (
              <div className='space-y-2'>
                {formData.ingredients.map((ingredient, idx) => (
                  <div
                    key={idx}
                    className='relative'>
                    <div className='flex gap-2'>
                      <div className='relative flex-1'>
                        <Input
                          value={ingredient.genericName}
                          onChange={(e) => handleIngredientChange(idx, e.target.value)}
                          placeholder={`Ingredient ${idx + 1} (from receipt or custom)`}
                          onFocus={() => setShowSuggestions(true)}
                          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        />

                        {/* Add "Save External Ingredient" button when no matches found */}
                        {ingredient &&
                          !filteredSuggestions.some((s) => s.toLowerCase() === ingredient.toLowerCase()) &&
                          showSuggestions && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type='button'
                                    size='sm'
                                    variant='outline'
                                    className='absolute right-2 top-1/2 h-7 -translate-y-1/2 px-2'
                                    onClick={() => {
                                      // Just close suggestions, the ingredient is already in the input
                                      setShowSuggestions(false);
                                      toast("External ingredient added!", {
                                        description: `"${ingredient}" was not found in the invoice but has been added to the recipe.`,
                                      });
                                    }}>
                                    <Plus className='mr-1 h-3 w-3' />
                                    Add
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>This ingredient was not found in the invoice</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                      </div>
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon'
                        onClick={() => removeIngredient(idx)}
                        disabled={formData.ingredients.length <= 1}>
                        <X className='h-4 w-4' />
                      </Button>
                    </div>

                    {/* Suggestions dropdown */}
                    {showSuggestions && ingredient && filteredSuggestions.length > 0 && (
                      <div className='bg-popover absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border shadow-md'>
                        <div className='py-1'>
                          {filteredSuggestions.map((suggestion, suggestionIdx) => (
                            <div
                              key={suggestionIdx}
                              className='hover:bg-muted cursor-pointer px-4 py-2 text-sm'
                              onClick={() => selectSuggestion(idx, suggestion)}>
                              {suggestion}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add difficulty selector */}
          {(isViewMode && recipe?.complexity) || !isViewMode ? (
            <div className='space-y-2'>
              <Label htmlFor='difficulty'>Difficulty Level</Label>
              {isViewMode ? (
                <Badge
                  variant={
                    recipe?.complexity === RecipeComplexity.Easy
                      ? "default"
                      : recipe?.complexity === RecipeComplexity.Normal
                        ? "secondary"
                        : "destructive"
                  }>
                  {recipe?.complexity || "MEDIUM"}
                </Badge>
              ) : (
                <Select
                  value={RecipeComplexity[formData.complexity]}
                  onValueChange={(value) =>
                    setFormData((prev) => ({...prev, difficulty: value as "EASY" | "MEDIUM" | "HARD"}))
                  }>
                  <SelectTrigger>
                    <SelectValue placeholder='Select difficulty' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='EASY'>Easy</SelectItem>
                    <SelectItem value='MEDIUM'>Medium</SelectItem>
                    <SelectItem value='HARD'>Hard</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          ) : null}

          {(isViewMode && recipe?.instructions) || !isViewMode ? (
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='instructions'>Instructions</Label>
                {!isViewMode && formData.instructions && (
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
                )}
              </div>
              <Textarea
                id='instructions'
                name='instructions'
                value={formData.instructions}
                onChange={handleChange}
                placeholder='Enter cooking instructions'
                rows={4}
                disabled={isViewMode}
              />
            </div>
          ) : null}

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label htmlFor='prepTime'>Prep Time</Label>
              <div className='flex items-center'>
                <Clock className='text-muted-foreground mr-2 h-4 w-4' />
                {isViewMode ? (
                  <span>{recipe?.prepTime || "Not specified"}</span>
                ) : (
                  <Input
                    id='prepTime'
                    name='prepTime'
                    value={formData.prepTime}
                    onChange={handleChange}
                    placeholder='e.g. 15 minutes'
                    disabled={isViewMode}
                  />
                )}
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='cookTime'>Cook Time</Label>
              <div className='flex items-center'>
                <Utensils className='text-muted-foreground mr-2 h-4 w-4' />
                {isViewMode ? (
                  <span>{recipe?.cookTime || "Not specified"}</span>
                ) : (
                  <Input
                    id='cookTime'
                    name='cookTime'
                    value={formData.cookTime}
                    onChange={handleChange}
                    placeholder='e.g. 30 minutes'
                    disabled={isViewMode}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className='flex items-center justify-between sm:justify-between'>
          {isViewMode ? (
            <Button
              type='button'
              onClick={() => onOpenChange(false)}>
              Close
            </Button>
          ) : (
            <>
              <div>
                {!isAddMode && (
                  <Button
                    type='button'
                    variant='destructive'
                    onClick={handleDelete}>
                    <Trash className='mr-2 h-4 w-4' />
                    Delete
                  </Button>
                )}
              </div>
              <div className='flex gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type='button'
                  onClick={handleSave}>
                  <Save className='mr-2 h-4 w-4' />
                  Save
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
