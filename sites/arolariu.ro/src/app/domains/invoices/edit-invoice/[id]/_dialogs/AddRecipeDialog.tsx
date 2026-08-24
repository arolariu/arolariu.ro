"use client";

import {AllergenCode, RecipeDifficulty, type RecipeIngredient, type RecipeStep, type RecipeSuggestion} from "@/types/invoices";
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
import {useCallback, useState} from "react";
import {TbDisc, TbMinus, TbPlus} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {useRecipeAdd} from "../../../_hooks/invoice";
import {useEditInvoiceContext} from "../_context/EditInvoiceContext";
import styles from "./AddRecipeDialog.module.scss";

type IngredientRow = {name: string; quantity: string; preparation: string};
type StepRow = {instruction: string; notes: string};

function emptyIngredient(): IngredientRow {
  return {name: "", quantity: "", preparation: ""};
}
function emptyStep(): StepRow {
  return {instruction: "", notes: ""};
}

function toRecipeIngredient(row: IngredientRow): RecipeIngredient {
  return {name: row.name, quantity: row.quantity, preparation: row.preparation || null};
}
function toRecipeStep(row: StepRow, sequence: number): RecipeStep {
  return {sequence, instruction: row.instruction, notes: row.notes || null};
}

const ALL_ALLERGEN_CODES = Object.values(AllergenCode);

export default function AddRecipeDialog(): React.JSX.Element {
  const t = useTranslations();
  const router = useRouter();
  const {invoice} = useEditInvoiceContext();
  const {addRecipeCallback, isAdding} = useRecipeAdd(invoice);
  const {isOpen, close} = useDialog("EDIT_INVOICE__RECIPE_ADD", "add");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [servings, setServings] = useState(2);
  const [difficulty, setDifficulty] = useState<RecipeDifficulty>(RecipeDifficulty.Easy);
  const [preparationMinutes, setPreparationMinutes] = useState(0);
  const [cookingMinutes, setCookingMinutes] = useState(0);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [purchased, setPurchased] = useState<IngredientRow[]>([emptyIngredient()]);
  const [pantry, setPantry] = useState<IngredientRow[]>([emptyIngredient()]);
  const [missing, setMissing] = useState<IngredientRow[]>([emptyIngredient()]);
  const [steps, setSteps] = useState<StepRow[]>([emptyStep()]);
  const [allergens, setAllergens] = useState<AllergenCode[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (servings <= 0) newErrors["servings"] = t((m) => m.dialogs.invoices.recipeDialog.validation.servingsPositive);
    if (totalMinutes < preparationMinutes + cookingMinutes)
      newErrors["totalMinutes"] = t((m) => m.dialogs.invoices.recipeDialog.validation.totalTimeConstraint);
    const validSteps = steps.filter((s) => s.instruction.trim().length > 0);
    if (validSteps.length === 0) newErrors["steps"] = t((m) => m.dialogs.invoices.recipeDialog.validation.stepRequired);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [servings, totalMinutes, preparationMinutes, cookingMinutes, steps, t]);

  const handleCreate = useCallback(async () => {
    if (!validate()) return;
    try {
      const recipe: RecipeSuggestion = {
        name,
        description,
        servings,
        preparationMinutes,
        cookingMinutes,
        totalMinutes,
        difficulty,
        purchasedIngredients: purchased.filter((r) => r.name.trim()).map(toRecipeIngredient),
        assumedPantryStaples: pantry.filter((r) => r.name.trim()).map(toRecipeIngredient),
        missingOptionalIngredients: missing.filter((r) => r.name.trim()).map(toRecipeIngredient),
        steps: steps
          .filter((s) => s.instruction.trim())
          .map((s, i) => toRecipeStep(s, i + 1)),
        allergenWarnings: allergens,
      };
      await addRecipeCallback(recipe);
      toast.success(t((m) => m.dialogs.invoices.recipeDialog.create.success));
      close();
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(message || t((m) => m.dialogs.invoices.recipeDialog.create.error));
    }
  }, [validate, name, description, servings, preparationMinutes, cookingMinutes, totalMinutes, difficulty, purchased, pantry, missing, steps, allergens, addRecipeCallback, t, close, router]);

  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen) close();
    },
    [close],
  );

  const updateIngredientRow = (
    setter: React.Dispatch<React.SetStateAction<IngredientRow[]>>,
    index: number,
    field: keyof IngredientRow,
    value: string,
  ) => {
    setter((rows) => rows.map((r, i) => (i === index ? {...r, [field]: value} : r)));
  };

  const toggleAllergen = useCallback((code: AllergenCode) => {
    setAllergens((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }, []);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={handleOpenChange}>
      <DialogContent className={styles["dialogContent"]}>
        <DialogHeader>
          <DialogTitle>{t((m) => m.dialogs.invoices.recipeDialog.create.title)}</DialogTitle>
          <DialogDescription>{t((m) => m.dialogs.invoices.recipeDialog.create.description)}</DialogDescription>
        </DialogHeader>

        <form className={styles["formBody"]}>
          {/* Name */}
          <div className={styles["fieldGroup"]}>
            <Label htmlFor='recipe-add-name'>{t((m) => m.dialogs.invoices.recipeDialog.fields.recipeName)}</Label>
            <Input
              id='recipe-add-name'
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.recipeName)}
            />
          </div>

          {/* Description */}
          <div className={styles["fieldGroup"]}>
            <Label htmlFor='recipe-add-description'>{t((m) => m.dialogs.invoices.recipeDialog.fields.description)}</Label>
            <Textarea
              id='recipe-add-description'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.description)}
              rows={2}
            />
          </div>

          {/* Servings + Difficulty + Times */}
          <div className={styles["timeGrid"]}>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-add-servings'>{t((m) => m.dialogs.invoices.recipeDialog.fields.servings)}</Label>
              <Input
                id='recipe-add-servings'
                type='number'
                min={1}
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.servings)}
              />
              {errors["servings"] && <p className={styles["errorText"]}>{errors["servings"]}</p>}
            </div>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-add-difficulty'>{t((m) => m.dialogs.invoices.recipeDialog.fields.difficulty)}</Label>
              <Select
                value={difficulty}
                onValueChange={(v) => setDifficulty(v as RecipeDifficulty)}>
                <SelectTrigger id='recipe-add-difficulty'>
                  <SelectValue placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.selectDifficulty)} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={RecipeDifficulty.Easy}>{t((m) => m.dialogs.invoices.recipeDialog.difficulty.easy)}</SelectItem>
                  <SelectItem value={RecipeDifficulty.Medium}>{t((m) => m.dialogs.invoices.recipeDialog.difficulty.medium)}</SelectItem>
                  <SelectItem value={RecipeDifficulty.Hard}>{t((m) => m.dialogs.invoices.recipeDialog.difficulty.hard)}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-add-prep'>{t((m) => m.dialogs.invoices.recipeDialog.fields.prepTime)}</Label>
              <Input
                id='recipe-add-prep'
                type='number'
                min={0}
                value={preparationMinutes}
                onChange={(e) => setPreparationMinutes(Number(e.target.value))}
              />
            </div>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-add-cook'>{t((m) => m.dialogs.invoices.recipeDialog.fields.cookTime)}</Label>
              <Input
                id='recipe-add-cook'
                type='number'
                min={0}
                value={cookingMinutes}
                onChange={(e) => setCookingMinutes(Number(e.target.value))}
              />
            </div>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-add-total'>{t((m) => m.dialogs.invoices.recipeDialog.fields.totalDuration)}</Label>
              <Input
                id='recipe-add-total'
                type='number'
                min={0}
                value={totalMinutes}
                onChange={(e) => setTotalMinutes(Number(e.target.value))}
              />
              {errors["totalMinutes"] && <p className={styles["errorText"]}>{errors["totalMinutes"]}</p>}
            </div>
          </div>

          {/* Ingredient sections */}
          {([
            {key: "purchased", label: t((m) => m.dialogs.invoices.recipeDialog.fields.purchasedIngredients), rows: purchased, setter: setPurchased},
            {key: "pantry", label: t((m) => m.dialogs.invoices.recipeDialog.fields.pantryStaples), rows: pantry, setter: setPantry},
            {key: "missing", label: t((m) => m.dialogs.invoices.recipeDialog.fields.missingIngredients), rows: missing, setter: setMissing},
          ] as const).map(({key, label, rows, setter}) => (
            <div
              key={key}
              className={styles["fieldGroup"]}>
              <div className={styles["fieldHeader"]}>
                <Label>{label}</Label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => setter((r) => [...r, emptyIngredient()])}>
                  <TbPlus className={styles["addIcon"]} />
                  {t((m) => m.dialogs.invoices.recipeDialog.buttons.add)}
                </Button>
              </div>
              {rows.map((row, i) => (
                <div
                  key={i}
                  className={styles["ingredientRow"]}>
                  <Input
                    value={row.name}
                    onChange={(e) => updateIngredientRow(setter, i, "name", e.target.value)}
                    placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.ingredientName)}
                    className={styles["ingredientInput"]}
                  />
                  <Input
                    value={row.quantity}
                    onChange={(e) => updateIngredientRow(setter, i, "quantity", e.target.value)}
                    placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.ingredientQuantity)}
                    className={styles["ingredientInput"]}
                  />
                  <Input
                    value={row.preparation}
                    onChange={(e) => updateIngredientRow(setter, i, "preparation", e.target.value)}
                    placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.ingredientPreparation)}
                    className={styles["ingredientInput"]}
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    disabled={rows.length <= 1}
                    onClick={() => setter((r) => r.filter((_, idx) => idx !== i))}>
                    <TbMinus className={styles["icon4"]} />
                  </Button>
                </div>
              ))}
            </div>
          ))}

          {/* Steps */}
          <div className={styles["fieldGroup"]}>
            <div className={styles["fieldHeader"]}>
              <Label>{t((m) => m.dialogs.invoices.recipeDialog.fields.steps)}</Label>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setSteps((s) => [...s, emptyStep()])}>
                <TbPlus className={styles["addIcon"]} />
                {t((m) => m.dialogs.invoices.recipeDialog.buttons.add)}
              </Button>
            </div>
            {errors["steps"] && <p className={styles["errorText"]}>{errors["steps"]}</p>}
            {steps.map((step, i) => (
              <div
                key={i}
                className={styles["stepRow"]}>
                <span className={styles["stepSequence"]}>{i + 1}.</span>
                <Textarea
                  value={step.instruction}
                  onChange={(e) => setSteps((s) => s.map((r, idx) => (idx === i ? {...r, instruction: e.target.value} : r)))}
                  placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.stepInstruction)}
                  rows={2}
                  className={styles["stepInput"]}
                />
                <Input
                  value={step.notes}
                  onChange={(e) => setSteps((s) => s.map((r, idx) => (idx === i ? {...r, notes: e.target.value} : r)))}
                  placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.stepNotes)}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={steps.length <= 1}
                  onClick={() => setSteps((s) => s.filter((_, idx) => idx !== i))}>
                  <TbMinus className={styles["icon4"]} />
                </Button>
              </div>
            ))}
          </div>

          {/* Allergen warnings */}
          <div className={styles["fieldGroup"]}>
            <Label>{t((m) => m.dialogs.invoices.recipeDialog.fields.allergens)}</Label>
            <TooltipProvider>
              <div className={styles["allergenGrid"]}>
                {ALL_ALLERGEN_CODES.map((code) => (
                  <Tooltip key={code}>
                    <TooltipTrigger
                      render={
                        <Button
                          type='button'
                          variant={allergens.includes(code) ? "default" : "outline"}
                          size='sm'
                          onClick={() => toggleAllergen(code)}>
                          {code}
                        </Button>
                      }
                    />
                    <TooltipContent>
                      <p>{code}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </TooltipProvider>
          </div>
        </form>

        <DialogFooter className={styles["dialogFooter"]}>
          <div className={styles["footerActions"]}>
            <Button
              type='button'
              variant='outline'
              onClick={close}
              disabled={isAdding}>
              {t((m) => m.dialogs.invoices.recipeDialog.buttons.cancel)}
            </Button>
            <Button
              type='button'
              onClick={handleCreate}
              disabled={isAdding}>
              <TbDisc className={styles["saveIcon"]} />
              {isAdding ? t((m) => m.dialogs.invoices.recipeDialog.buttons.saving) : t((m) => m.dialogs.invoices.recipeDialog.buttons.save)}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
