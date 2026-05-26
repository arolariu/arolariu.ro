"use client";

import {formatEnum} from "@/lib/utils.generic";
import {RecipeComplexity, type Recipe} from "@/types/invoices";
import {
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
import {useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useEffect, useState} from "react";
import {TbClock, TbDisc, TbPlus, TbSparkles, TbToolsKitchen, TbWand, TbX} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {useRecipeUpdate} from "../../../_hooks/invoice";
import {useEditInvoiceContext} from "../_context/EditInvoiceContext";
import styles from "./UpdateRecipeDialog.module.scss";

function mapDifficultyToComplexity(difficulty: string): RecipeComplexity {
  switch (difficulty) {
    case "Easy":
      return RecipeComplexity.Easy;
    case "Hard":
      return RecipeComplexity.Hard;
    default:
      return RecipeComplexity.Normal;
  }
}

function updateRecipeFromInput(recipe: Recipe, name: string, value: string): Recipe {
  switch (name) {
    case "preparationTime":
    case "cookingTime":
      return {...recipe, [name]: Number(value)};
    case "name":
    case "description":
    case "instructions":
    case "referenceForMoreDetails":
      return {...recipe, [name]: value};
    default:
      return recipe;
  }
}

export default function UpdateRecipeDialog(): React.JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const {
    currentDialog: {payload},
    isOpen,
    close,
  } = useDialog("EDIT_INVOICE__RECIPE_UPDATE", "edit");
  const recipe = payload?.recipe ?? null;
  const {invoice} = useEditInvoiceContext();
  const {isUpdating, updateRecipeCallback} = useRecipeUpdate(invoice);
  const [recipeDetails, setRecipeDetails] = useState<Recipe | null>(recipe);

  useEffect(() => {
    setRecipeDetails(recipe);
  }, [recipe]);

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = event.target;
    setRecipeDetails((current) => (current ? updateRecipeFromInput(current, name, value) : current));
  }, []);

  const handleDifficultyChange = useCallback((value: string) => {
    setRecipeDetails((current) => (current ? {...current, complexity: mapDifficultyToComplexity(value)} : current));
  }, []);

  const handleGenerateName = useCallback(() => {
    toast.info(t((m) => m["IMS--Dialogs"].recipeDialog.actions.unavailable));
  }, [t]);

  const handleEnhanceInstructions = useCallback(() => {
    toast.info(t((m) => m["IMS--Dialogs"].recipeDialog.actions.unavailable));
  }, [t]);

  const handleSave = useCallback(async () => {
    if (!recipe || !recipeDetails) {
      toast.error(t((m) => m["IMS--Dialogs"].recipeDialog.update.missingRecipe));
      return;
    }

    try {
      const preparationTime = Number(recipeDetails.preparationTime);
      const cookingTime = Number(recipeDetails.cookingTime);
      await updateRecipeCallback(recipe.name, {
        ...recipeDetails,
        preparationTime,
        cookingTime,
        approximateTotalDuration: preparationTime + cookingTime,
      });
      toast.success(t((m) => m["IMS--Dialogs"].recipeDialog.update.success));
      close();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || t((m) => m["IMS--Dialogs"].recipeDialog.update.error));
    }
  }, [recipe, recipeDetails, updateRecipeCallback, close, router, t]);

  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen) close();
    },
    [close],
  );

  if (!recipeDetails) {
    return (
      <Dialog
        open={isOpen}
        onOpenChange={handleOpenChange}>
        <DialogContent className={styles["dialogContent"]}>
          <DialogHeader>
            <DialogTitle>{t((m) => m["IMS--Dialogs"].recipeDialog.update.title)}</DialogTitle>
            <DialogDescription>{t((m) => m["IMS--Dialogs"].recipeDialog.update.missingRecipe)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={close}>{t((m) => m["IMS--Dialogs"].recipeDialog.buttons.close)}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["dialogContentWide"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m["IMS--Dialogs"].recipeDialog.update.title)}</DialogTitle>
          <DialogDescription>{t((m) => m["IMS--Dialogs"].recipeDialog.update.description)}</DialogDescription>
        </DialogHeader>

        <form className={styles["formBody"]}>
          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label htmlFor='recipe-update-name'>{t((m) => m["IMS--Dialogs"].recipeDialog.fields.recipeName)}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={handleGenerateName}
                        className={styles["generateButton"]}>
                        <TbSparkles className={styles["sparklesIcon"]} />
                        {t((m) => m["IMS--Dialogs"].recipeDialog.actions.generateName)}
                      </Button>
                    }
                  />
                  <TooltipContent>
                    <p className={styles["tooltipText"]}>{t((m) => m["IMS--Dialogs"].recipeDialog.tooltips.generateName)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id='recipe-update-name'
              name='name'
              value={recipeDetails.name}
              onChange={handleChange}
              placeholder={t((m) => m["IMS--Dialogs"].recipeDialog.placeholders.recipeName)}
            />
          </div>

          <div className={styles["fieldGroup"]}>
            <Label htmlFor='recipe-update-description'>{t((m) => m["IMS--Dialogs"].recipeDialog.fields.description)}</Label>
            <Textarea
              id='recipe-update-description'
              name='description'
              value={recipeDetails.description}
              onChange={handleChange}
              placeholder={t((m) => m["IMS--Dialogs"].recipeDialog.placeholders.description)}
              rows={2}
            />
          </div>

          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label>{t((m) => m["IMS--Dialogs"].recipeDialog.fields.ingredients)}</Label>
              <Button
                type='button'
                variant='outline'
                size='sm'>
                <TbPlus className={styles["addIcon"]} />
                {t((m) => m["IMS--Dialogs"].recipeDialog.buttons.add)}
              </Button>
            </div>

            <div className={styles["fieldGroup"]}>
              {recipeDetails.ingredients.map((ingredient, index) => (
                <div
                  key={`${ingredient}-${index}`}
                  className={styles["ingredientItem"]}>
                  <div className={styles["ingredientRow"]}>
                    <div className={styles["ingredientInput"]}>
                      <Input
                        value={ingredient}
                        placeholder={`Ingredient ${index + 1} (from receipt or custom)`}
                        readOnly
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

          <div className={styles["fieldGroup"]}>
            <Label htmlFor='recipe-update-difficulty'>{t((m) => m["IMS--Dialogs"].recipeDialog.fields.difficulty)}</Label>
            <Select
              value={formatEnum(RecipeComplexity, recipeDetails.complexity) || "Unknown"}
              onValueChange={handleDifficultyChange}>
              <SelectTrigger id='recipe-update-difficulty'>
                <SelectValue placeholder={t((m) => m["IMS--Dialogs"].recipeDialog.placeholders.selectDifficulty)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='Easy'>{t((m) => m["IMS--Dialogs"].recipeDialog.difficulty.easy)}</SelectItem>
                <SelectItem value='Normal'>{t((m) => m["IMS--Dialogs"].recipeDialog.difficulty.medium)}</SelectItem>
                <SelectItem value='Hard'>{t((m) => m["IMS--Dialogs"].recipeDialog.difficulty.hard)}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label htmlFor='recipe-update-instructions'>{t((m) => m["IMS--Dialogs"].recipeDialog.fields.instructions)}</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={handleEnhanceInstructions}>
                        <TbWand className={styles["addIcon"]} />
                        {t((m) => m["IMS--Dialogs"].recipeDialog.actions.enhanceInstructions)}
                      </Button>
                    }
                  />
                  <TooltipContent>
                    <p>{t((m) => m["IMS--Dialogs"].recipeDialog.tooltips.enhanceInstructions)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              id='recipe-update-instructions'
              name='instructions'
              value={recipeDetails.instructions}
              onChange={handleChange}
              placeholder={t((m) => m["IMS--Dialogs"].recipeDialog.placeholders.instructions)}
              rows={4}
            />
          </div>

          <div className={styles["timeGrid"]}>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-update-preparation-time'>{t((m) => m["IMS--Dialogs"].recipeDialog.fields.prepTime)}</Label>
              <div className={styles["timeRow"]}>
                <TbClock className={styles["mutedIcon"]} />
                <Input
                  id='recipe-update-preparation-time'
                  name='preparationTime'
                  type='number'
                  value={recipeDetails.preparationTime}
                  onChange={handleChange}
                  placeholder={t((m) => m["IMS--Dialogs"].recipeDialog.placeholders.prepTime)}
                />
              </div>
            </div>

            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-update-cooking-time'>{t((m) => m["IMS--Dialogs"].recipeDialog.fields.cookTime)}</Label>
              <div className={styles["timeRow"]}>
                <TbToolsKitchen className={styles["mutedIcon"]} />
                <Input
                  id='recipe-update-cooking-time'
                  name='cookingTime'
                  type='number'
                  value={recipeDetails.cookingTime}
                  onChange={handleChange}
                  placeholder={t((m) => m["IMS--Dialogs"].recipeDialog.placeholders.cookTime)}
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
              onClick={close}
              disabled={isUpdating}>
              {t((m) => m["IMS--Dialogs"].recipeDialog.buttons.cancel)}
            </Button>
            <Button
              type='button'
              onClick={handleSave}
              disabled={isUpdating}>
              <TbDisc className={styles["saveIcon"]} />
              {isUpdating ? t((m) => m["IMS--Dialogs"].recipeDialog.buttons.saving) : t((m) => m["IMS--Dialogs"].recipeDialog.buttons.save)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
