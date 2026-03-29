"use client";

// TODO: refactor.
/* eslint-disable no-console -- TODO: replace console.log with proper logging */

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
import {useTranslations} from "next-intl";
import {useCallback, useState} from "react";
import {TbClock, TbDisc, TbPlus, TbSparkles, TbToolsKitchen, TbToolsKitchen3, TbWand, TbX} from "react-icons/tb";
import {useDialog} from "../../../../_contexts/DialogContext";
import styles from "./RecipeDialog.module.scss";

/** Rich text renderer for bold/strong text in translations */
function RichTextStrong(chunks: React.ReactNode): React.JSX.Element {
  return <strong>{chunks}</strong>;
}

const CreateDialog = () => {
  const t = useTranslations("Invoices.EditInvoice.recipeDialog");
  const {isOpen, open, close} = useDialog("EDIT_INVOICE__RECIPE");
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
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
          <DialogDescription>{t("create.description")}</DialogDescription>
        </DialogHeader>

        <form className={styles["formBody"]}>
          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label htmlFor='name'>{t("fields.recipeName")}</Label>
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={() => {}}
                          className={styles["generateButton"]}>
                          <TbSparkles className={styles["sparklesIcon"]} />
                          {t("actions.generateName")}
                        </Button>
                      }
                    />
                    <TooltipContent>
                      <p className={styles["tooltipText"]}>{t("tooltips.generateName")}</p>
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
              placeholder={t("placeholders.recipeName")}
            />
          </div>

          {/* Add description field */}
          <div className={styles["fieldGroup"]}>
            <Label htmlFor='description'>{t("fields.description")}</Label>
            <Textarea
              id='description'
              name='description'
              value={recipe.description} // updated from formData to recipe
              onChange={handleChange}
              placeholder={t("placeholders.description")}
              rows={2}
            />
          </div>

          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label>{t("fields.ingredients")}</Label>
              <Button
                type='button'
                variant='outline'
                size='sm'>
                <TbPlus className={styles["addIcon"]} />
                {t("buttons.add")}
              </Button>
            </div>

            <div className={styles["fieldGroup"]}>
              {recipe.ingredients.map((ingredient, idx) => (
                <div
                  key={idx}
                  className={styles["ingredientItem"]}>
                  <div className={styles["ingredientRow"]}>
                    <div className={styles["ingredientInput"]}>
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
                      <TbX className={styles["icon4"]} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add difficulty selector */}
          <div className={styles["fieldGroup"]}>
            <Label htmlFor='difficulty'>{t("fields.difficulty")}</Label>
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
                <SelectValue placeholder={t("placeholders.selectDifficulty")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='EASY'>{t("difficulty.easy")}</SelectItem>
                <SelectItem value='MEDIUM'>{t("difficulty.medium")}</SelectItem>
                <SelectItem value='HARD'>{t("difficulty.hard")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add instructions field */}
          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label htmlFor='instructions'>{t("fields.instructions")}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => {}}>
                        <TbWand className={styles["addIcon"]} />
                        {t("actions.enhanceInstructions")}
                      </Button>
                    }
                  />
                  <TooltipContent>
                    <p>{t("tooltips.enhanceInstructions")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id='instructions'
              name='instructions'
              value={recipe.instructions}
              onChange={handleChange}
              placeholder={t("placeholders.instructions")}
              rows={4}
            />
          </div>

          {/* Add preparation time field */}
          <div className={styles["timeGrid"]}>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='prepTime'>{t("fields.prepTime")}</Label>
              <div className={styles["timeRow"]}>
                <TbClock className={styles["mutedIcon"]} />
                <Input
                  id='prepTime'
                  name='prepTime'
                  value={recipe.preparationTime}
                  onChange={handleChange}
                  placeholder={t("placeholders.prepTime")}
                />
              </div>
            </div>

            {/* Add cooking time field */}
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='cookTime'>{t("fields.cookTime")}</Label>
              <div className={styles["timeRow"]}>
                <TbToolsKitchen className={styles["mutedIcon"]} />
                <Input
                  id='cookTime'
                  name='cookTime'
                  value={recipe.cookingTime}
                  onChange={handleChange}
                  placeholder={t("placeholders.cookTime")}
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className={styles["dialogFooter"]}>
          <div className={styles["footerActions"]}>
            <Button
              type='button'
              variant='outline'
              onClick={close}>
              {t("buttons.cancel")}
            </Button>
            <Button
              type='button'
              onClick={handleCreate}>
              <TbDisc className={styles["saveIcon"]} />
              {t("buttons.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ReadDialog = ({recipe}: Readonly<{recipe: Recipe}>) => {
  const t = useTranslations("Invoices.EditInvoice.recipeDialog");
  const {isOpen, open, close} = useDialog("EDIT_INVOICE__RECIPE");

  return (
    <Dialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{recipe.name}</DialogTitle>
          <DialogDescription>{t("read.description")}</DialogDescription>
        </DialogHeader>

        <div className={styles["formBody"]}>
          {/* Add description field */}
          <div className={styles["fieldGroup"]}>
            <Label htmlFor='description'>{t("fields.description")}</Label>
            <p className={styles["readText"]}>{recipe?.description || t("read.noDescription")}</p>
          </div>

          <div className={styles["fieldGroup"]}>
            <Label>{t("fields.ingredients")}</Label>
            <ul className={styles["ingredientReadList"]}>
              {recipe?.ingredients.map((ingredient, idx) => (
                <li
                  key={idx}
                  className={styles["readText"]}>
                  {ingredient.rawName}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles["fieldGroup"]}>
            <Label htmlFor='complexity'>{t("fields.complexity")}</Label>
            <Badge
              variant={
                recipe?.complexity === RecipeComplexity.Easy
                  ? "default"
                  : recipe?.complexity === RecipeComplexity.Normal
                    ? "secondary"
                    : "outline"
              }>
              {recipe?.complexity || t("difficulty.medium").toUpperCase()}
            </Badge>
          </div>

          <div className={styles["fieldGroup"]}>
            <Label htmlFor='instructions'>{t("fields.instructions")}</Label>

            <div className={styles["timeGrid"]}>
              <Label htmlFor='preparationTime'>{t("fields.prepTime")}</Label>
              <TbClock className={styles["mutedIcon"]} />
              <span>{recipe?.preparationTime || t("read.notSpecified")}</span>
            </div>
          </div>

          <div className={styles["fieldGroup"]}>
            <Label htmlFor='cookingTime'>{t("fields.cookTime")}</Label>
            <TbToolsKitchen3 className={styles["mutedIcon"]} />
            <span>{recipe?.cookingTime || t("read.notSpecified")}</span>
          </div>
        </div>

        <DialogFooter className={styles["dialogFooter"]}>
          <Button
            type='button'
            onClick={close}>
            {t("buttons.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const UpdateDialog = ({recipe}: Readonly<{recipe: Recipe}>) => {
  const t = useTranslations("Invoices.EditInvoice.recipeDialog");
  const {isOpen, open, close} = useDialog("EDIT_INVOICE__RECIPE");

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
      <DialogContent className={styles["dialogContentWide"]}>
        <DialogHeader>
          <DialogTitle>{t("update.title")}</DialogTitle>
          <DialogDescription>{t("update.description")}</DialogDescription>
        </DialogHeader>

        <form className={styles["formBody"]}>
          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label htmlFor='name'>{t("fields.recipeName")}</Label>
              <div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger
                      render={
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={generateName}
                          className={styles["generateButton"]}>
                          <TbSparkles className={styles["sparklesIcon"]} />
                          {t("actions.generateName")}
                        </Button>
                      }
                    />
                    <TooltipContent>
                      <p className={styles["tooltipText"]}>{t("tooltips.generateName")}</p>
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
              placeholder={t("placeholders.recipeName")}
            />
          </div>

          {/* Add description field */}
          <div className={styles["fieldGroup"]}>
            <Label htmlFor='description'>{t("fields.description")}</Label>
            <Textarea
              id='description'
              name='description'
              value={recipeDetails.description} // updated from formData to recipe
              onChange={handleChange}
              placeholder={t("placeholders.description")}
              rows={2}
            />
          </div>

          {/* Add ingredients field */}
          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label>{t("fields.ingredients")}</Label>
              <Button
                type='button'
                variant='outline'
                size='sm'>
                <TbPlus className={styles["addIcon"]} />
                {t("buttons.add")}
              </Button>
            </div>

            <div className={styles["fieldGroup"]}>
              {recipeDetails.ingredients.map((ingredient, idx) => (
                <div
                  key={ingredient.rawName}
                  className={styles["ingredientItem"]}>
                  <div className={styles["ingredientRow"]}>
                    <div className={styles["ingredientInput"]}>
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
                      <TbX className={styles["icon4"]} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add difficulty selector */}
          <div className={styles["fieldGroup"]}>
            <Label htmlFor='difficulty'>{t("fields.difficulty")}</Label>
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
                <SelectValue placeholder={t("placeholders.selectDifficulty")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='EASY'>{t("difficulty.easy")}</SelectItem>
                <SelectItem value='MEDIUM'>{t("difficulty.medium")}</SelectItem>
                <SelectItem value='HARD'>{t("difficulty.hard")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Add instructions field */}
          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label htmlFor='instructions'>{t("fields.instructions")}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={enhanceInstructions}>
                        <TbWand className={styles["addIcon"]} />
                        {t("actions.enhanceInstructions")}
                      </Button>
                    }
                  />
                  <TooltipContent>
                    <p>{t("tooltips.enhanceInstructions")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id='instructions'
              name='instructions'
              value={recipeDetails.instructions}
              onChange={handleChange}
              placeholder={t("placeholders.instructions")}
              rows={4}
            />
          </div>

          {/* Add preparation time field */}
          <div className={styles["timeGrid"]}>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='prepTime'>{t("fields.prepTime")}</Label>
              <div className={styles["timeRow"]}>
                <TbClock className={styles["mutedIcon"]} />
                <Input
                  id='prepTime'
                  name='prepTime'
                  value={recipeDetails.preparationTime}
                  onChange={handleChange}
                  placeholder={t("placeholders.prepTime")}
                />
              </div>
            </div>

            {/* Add cooking time field */}
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='cookTime'>{t("fields.cookTime")}</Label>
              <div className={styles["timeRow"]}>
                <TbToolsKitchen className={styles["mutedIcon"]} />
                <Input
                  id='cookTime'
                  name='cookTime'
                  value={recipeDetails.cookingTime}
                  onChange={handleChange}
                  placeholder={t("placeholders.cookTime")}
                />
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className={styles["dialogFooter"]}>
          <div className={styles["footerActions"]}>
            <Button
              type='button'
              variant='outline'
              onClick={close}>
              {t("buttons.cancel")}
            </Button>
            <Button
              type='button'
              onClick={handleCreate}>
              <TbDisc className={styles["saveIcon"]} />
              {t("buttons.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const DeleteDialog = ({recipe}: Readonly<{recipe: Recipe}>) => {
  const t = useTranslations("Invoices.EditInvoice.recipeDialog");
  const {isOpen, open, close} = useDialog("EDIT_INVOICE__RECIPE");

  const handleDelete = useCallback(() => {}, []);

  return (
    <AlertDialog
      open={isOpen}
      // eslint-disable-next-line react/jsx-no-bind -- this is a simple fn.
      onOpenChange={(shouldOpen) => (shouldOpen ? open() : close())}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t.rich("delete.description", {name: recipe.name, strong: RichTextStrong})}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("buttons.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className={styles["deleteAction"]}>
            {t("buttons.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

/**
 * Multi-mode dialog for managing recipes with full CRUD operations.
 *
 * @remarks
 * **Rendering Context**: Client Component (`"use client"` directive).
 *
 * **Mode-Based Rendering**: Switches between dialog variants based on `mode`:
 * - **add**: `CreateDialog` - Form for creating new recipes with ingredients
 * - **edit**: `UpdateDialog` - Form for modifying existing recipe details
 * - **delete**: `DeleteDialog` - Confirmation alert for removing recipes
 * - **view**: `ReadDialog` - Read-only display of full recipe details
 *
 * **Recipe Fields**:
 * - `name`: Recipe title
 * - `description`: Brief overview
 * - `ingredients`: Array of Product items from invoice
 * - `preparationTime` / `cookingTime`: Duration in minutes
 * - `complexity`: Easy, Normal, or Hard (via `RecipeComplexity` enum)
 * - `instructions`: Step-by-step cooking instructions
 * - `referenceForMoreDetails`: External URL for full recipe
 *
 * **AI Features** (placeholder implementations):
 * - Generate recipe name based on ingredients
 * - Auto-fill instructions from AI suggestions
 *
 * **Dialog Integration**: Uses `useDialog` hook with `INVOICE_RECIPE` type.
 * Payload contains `Recipe` object for edit/delete/view operations.
 *
 * **Domain Context**: Part of the edit-invoice recipes tab, enabling users
 * to create and manage recipes based on purchased grocery items.
 *
 * @returns Client-rendered dialog variant based on current mode, or false if no valid mode
 *
 * @example
 * ```tsx
 * // Opened via RecipesTab or RecipeCard:
 * const {open: openAdd} = useDialog("INVOICE_RECIPE", "add");
 * const {open: openView} = useDialog("INVOICE_RECIPE", "view", recipe);
 * ```
 *
 * @see {@link RecipesTab} - Tab component with add/generate buttons
 * @see {@link RecipeCard} - Card component with edit/delete/share actions
 * @see {@link Recipe} - Recipe type definition
 * @see {@link RecipeComplexity} - Complexity enum
 */
export default function RecipeDialog(): React.JSX.Element {
  const {
    currentDialog: {mode, payload},
  } = useDialog("EDIT_INVOICE__RECIPE");

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
      return <></>;
  }
}
