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
import {useTranslations} from "next-intl";
import {useRouter} from "next/navigation";
import {useCallback, useState} from "react";
import {TbClock, TbDisc, TbPlus, TbSparkles, TbToolsKitchen, TbToolsKitchen3, TbWand, TbX} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {useRecipeAdd} from "../../../_hooks/invoice";
import {useEditInvoiceContext} from "../_context/EditInvoiceContext";
import styles from "./RecipeDialog.module.scss";

function createEmptyRecipe(): Recipe {
  return {
    name: "",
    description: "",
    ingredients: [],
    approximateTotalDuration: 0,
    preparationTime: 0,
    cookingTime: 0,
    complexity: RecipeComplexity.Easy,
    instructions: "",
    referenceForMoreDetails: "",
  };
}

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

export default function AddRecipeDialog(): React.JSX.Element {
  const t = useTranslations("IMS--Dialogs.recipeDialog");
  const router = useRouter();
  const {invoice} = useEditInvoiceContext();
  const {addRecipeCallback, isAdding} = useRecipeAdd(invoice);
  const {isOpen, close} = useDialog("EDIT_INVOICE__RECIPE_ADD", "add");
  const [recipe, setRecipe] = useState<Recipe>(() => createEmptyRecipe());

  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {name, value} = event.target;
    setRecipe((current) => updateRecipeFromInput(current, name, value));
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      const preparationTime = Number(recipe.preparationTime);
      const cookingTime = Number(recipe.cookingTime);
      const newRecipe: Recipe = {
        ...recipe,
        approximateTotalDuration: preparationTime + cookingTime,
        preparationTime,
        cookingTime,
      };

      await addRecipeCallback(newRecipe);
      toast.success(t("create.success"));
      close();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || t("create.error"));
    }
  }, [recipe, t, close, router, addRecipeCallback]);

  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen) close();
    },
    [close],
  );

  const handleGenerateName = useCallback(() => {
    toast.info(t("actions.unavailable"));
  }, [t]);

  const handleDifficultyChange = useCallback((value: string) => {
    setRecipe((current) => ({
      ...current,
      complexity: mapDifficultyToComplexity(value),
    }));
  }, []);

  const handleEnhanceInstructions = useCallback(() => {
    toast.info(t("actions.unavailable"));
  }, [t]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t("create.title")}</DialogTitle>
          <DialogDescription>{t("create.description")}</DialogDescription>
        </DialogHeader>

        <form className={styles["formBody"]}>
          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label htmlFor='recipe-add-name'>{t("fields.recipeName")}</Label>
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
            <Input
              id='recipe-add-name'
              name='name'
              value={recipe.name}
              onChange={handleChange}
              placeholder={t("placeholders.recipeName")}
            />
          </div>

          <div className={styles["fieldGroup"]}>
            <Label htmlFor='recipe-add-description'>{t("fields.description")}</Label>
            <Textarea
              id='recipe-add-description'
              name='description'
              value={recipe.description}
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
              {recipe.ingredients.map((ingredient, index) => (
                <div
                  key={`ingredient-${index}`}
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
                      disabled={recipe.ingredients.length <= 1}>
                      <TbX className={styles["icon4"]} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles["fieldGroup"]}>
            <Label htmlFor='recipe-add-difficulty'>{t("fields.difficulty")}</Label>
            <Select
              value={formatEnum(RecipeComplexity, recipe.complexity) || "Unknown"}
              onValueChange={handleDifficultyChange}>
              <SelectTrigger id='recipe-add-difficulty'>
                <SelectValue placeholder={t("placeholders.selectDifficulty")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='Easy'>{t("difficulty.easy")}</SelectItem>
                <SelectItem value='Normal'>{t("difficulty.medium")}</SelectItem>
                <SelectItem value='Hard'>{t("difficulty.hard")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label htmlFor='recipe-add-instructions'>{t("fields.instructions")}</Label>
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
              id='recipe-add-instructions'
              name='instructions'
              value={recipe.instructions}
              onChange={handleChange}
              placeholder={t("placeholders.instructions")}
              rows={4}
            />
          </div>

          <div className={styles["timeGrid"]}>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-add-preparation-time'>{t("fields.prepTime")}</Label>
              <div className={styles["timeRow"]}>
                <TbClock className={styles["mutedIcon"]} />
                <Input
                  id='recipe-add-preparation-time'
                  name='preparationTime'
                  type='number'
                  value={recipe.preparationTime}
                  onChange={handleChange}
                  placeholder={t("placeholders.prepTime")}
                />
              </div>
            </div>

            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-add-cooking-time'>{t("fields.cookTime")}</Label>
              <div className={styles["timeRow"]}>
                <TbToolsKitchen className={styles["mutedIcon"]} />
                <Input
                  id='recipe-add-cooking-time'
                  name='cookingTime'
                  type='number'
                  value={recipe.cookingTime}
                  onChange={handleChange}
                  placeholder={t("placeholders.cookTime")}
                />
              </div>
            </div>
          </div>

          {(Number(recipe.preparationTime) > 0 || Number(recipe.cookingTime) > 0) && (
            <div className={styles["fieldGroup"]}>
              <Label>{t("fields.totalDuration")}</Label>
              <div className={styles["timeRow"]}>
                <TbToolsKitchen3 className={styles["mutedIcon"]} />
                <span>
                  {Number(recipe.preparationTime) + Number(recipe.cookingTime)} {t("minutes")}
                </span>
              </div>
            </div>
          )}
        </form>

        <DialogFooter className={styles["dialogFooter"]}>
          <div className={styles["footerActions"]}>
            <Button
              type='button'
              variant='outline'
              onClick={close}
              disabled={isAdding}>
              {t("buttons.cancel")}
            </Button>
            <Button
              type='button'
              onClick={handleCreate}
              disabled={isAdding}>
              <TbDisc className={styles["saveIcon"]} />
              {isAdding ? t("buttons.saving") : t("buttons.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
