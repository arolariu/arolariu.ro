"use client";

import {
  AllergenCode,
  RecipeDifficulty,
  getAllergenLabelKey,
  hasValidRecipeTiming,
  isAllergenCode,
  isNonNegativeInteger,
  isRecipeDifficulty,
  isRecipeText,
  type RecipeIngredient,
  type RecipeStep,
  type RecipeSuggestion,
} from "@/types/invoices";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldError,
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
import {selectorFromPath, useTranslations} from "next-intl-selector";
import {useRouter} from "next/navigation";
import {useCallback, useMemo, useState, type ChangeEvent, type Dispatch, type SetStateAction} from "react";
import {TbDisc, TbMinus, TbPlus} from "react-icons/tb";
import {useDialog} from "../../../_contexts/DialogContext";
import {useRecipeAdd} from "../../../_hooks/invoice";
import {useEditInvoiceContext} from "../_context/EditInvoiceContext";
import styles from "./AddRecipeDialog.module.scss";

type IngredientRow = {id: string; name: string; quantity: string; preparation: string};
type StepRow = {id: string; instruction: string; notes: string};
type IngredientSectionKey = "purchased" | "pantry" | "missing";
type IngredientField = "name" | "quantity" | "preparation";
type StepField = "instruction" | "notes";
type IngredientRowsSetter = Dispatch<SetStateAction<IngredientRow[]>>;

let rowIdentifierSequence = 0;

function nextRowIdentifier(prefix: "ingredient" | "step"): string {
  rowIdentifierSequence += 1;
  return `${prefix}-${String(rowIdentifierSequence)}`;
}

function emptyIngredient(): IngredientRow {
  return {id: nextRowIdentifier("ingredient"), name: "", quantity: "", preparation: ""};
}
function emptyStep(): StepRow {
  return {id: nextRowIdentifier("step"), instruction: "", notes: ""};
}

function toRecipeIngredient(row: IngredientRow): RecipeIngredient {
  return {name: row.name, quantity: row.quantity, preparation: row.preparation || null};
}
function toRecipeStep(row: StepRow, sequence: number): RecipeStep {
  return {sequence, instruction: row.instruction, notes: row.notes || null};
}

function isIngredientSectionKey(value: string | undefined): value is IngredientSectionKey {
  return value === "purchased" || value === "pantry" || value === "missing";
}

function isIngredientField(value: string | undefined): value is IngredientField {
  return value === "name" || value === "quantity" || value === "preparation";
}

function isStepField(value: string | undefined): value is StepField {
  return value === "instruction" || value === "notes";
}

function updateIngredientRows(rows: IngredientRow[], rowIdentifier: string, field: IngredientField, value: string): IngredientRow[] {
  return rows.map((row) => (row.id === rowIdentifier ? {...row, [field]: value} : row));
}

function updateStepRows(rows: StepRow[], rowIdentifier: string, field: StepField, value: string): StepRow[] {
  return rows.map((row) => (row.id === rowIdentifier ? {...row, [field]: value} : row));
}

function getValidationMessageId(message: string | undefined, identifier: string): string | undefined {
  if (!isRecipeText(message)) return undefined;
  return identifier;
}

function getTotalMinutesErrorId(errors: Readonly<Record<string, string>>, prefix: string): string | undefined {
  const minutesErrorId = getValidationMessageId(errors["minutes"], `${prefix}-minutes-error`);
  if (minutesErrorId !== undefined) return minutesErrorId;
  return getValidationMessageId(errors["totalMinutes"], `${prefix}-total-error`);
}

function getIngredientQuantityErrorId(row: IngredientRow, message: string | undefined, identifier: string): string | undefined {
  if (!isRecipeText(message) || !isRecipeText(row.name) || isRecipeText(row.quantity)) return undefined;
  return identifier;
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
  const [purchased, setPurchased] = useState<IngredientRow[]>(() => [emptyIngredient()]);
  const [pantry, setPantry] = useState<IngredientRow[]>(() => [emptyIngredient()]);
  const [missing, setMissing] = useState<IngredientRow[]>(() => [emptyIngredient()]);
  const [steps, setSteps] = useState<StepRow[]>(() => [emptyStep()]);
  const [allergens, setAllergens] = useState<AllergenCode[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const totalMinutesErrorId = getTotalMinutesErrorId(errors, "recipe-add");

  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    if (!isRecipeText(name)) newErrors["name"] = t((m) => m.dialogs.invoices.recipeDialog.validation.nameRequired);
    if (!isRecipeText(description)) newErrors["description"] = t((m) => m.dialogs.invoices.recipeDialog.validation.descriptionRequired);
    if (!Number.isSafeInteger(servings) || servings <= 0)
      newErrors["servings"] = t((m) => m.dialogs.invoices.recipeDialog.validation.servingsPositive);
    if (!isNonNegativeInteger(preparationMinutes) || !isNonNegativeInteger(cookingMinutes) || !isNonNegativeInteger(totalMinutes))
      newErrors["minutes"] = t((m) => m.dialogs.invoices.recipeDialog.validation.minutesNonNegativeInteger);
    else if (!hasValidRecipeTiming(preparationMinutes, cookingMinutes, totalMinutes))
      newErrors["totalMinutes"] = t((m) => m.dialogs.invoices.recipeDialog.validation.totalTimeConstraint);
    const retainedIngredients = [...purchased, ...pantry, ...missing].filter((row) => isRecipeText(row.name));
    if (retainedIngredients.some((row) => !isRecipeText(row.quantity)))
      newErrors["ingredients"] = t((m) => m.dialogs.invoices.recipeDialog.validation.ingredientQuantityRequired);
    const validSteps = steps.filter((s) => s.instruction.trim().length > 0);
    if (validSteps.length === 0) newErrors["steps"] = t((m) => m.dialogs.invoices.recipeDialog.validation.stepRequired);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, description, servings, totalMinutes, preparationMinutes, cookingMinutes, purchased, pantry, missing, steps, t]);

  const handleCreate = useCallback(async () => {
    if (!validate()) return;
    try {
      const recipe: RecipeSuggestion = {
        name: name.trim(),
        description: description.trim(),
        servings,
        preparationMinutes,
        cookingMinutes,
        totalMinutes,
        difficulty,
        purchasedIngredients: purchased.filter((r) => r.name.trim()).map((row) => toRecipeIngredient(row)),
        assumedPantryStaples: pantry.filter((r) => r.name.trim()).map((row) => toRecipeIngredient(row)),
        missingOptionalIngredients: missing.filter((r) => r.name.trim()).map((row) => toRecipeIngredient(row)),
        steps: steps.filter((s) => s.instruction.trim()).map((s, i) => toRecipeStep(s, i + 1)),
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
  }, [
    validate,
    name,
    description,
    servings,
    preparationMinutes,
    cookingMinutes,
    totalMinutes,
    difficulty,
    purchased,
    pantry,
    missing,
    steps,
    allergens,
    addRecipeCallback,
    t,
    close,
    router,
  ]);

  const handleOpenChange = useCallback(
    (shouldOpen: boolean) => {
      if (!shouldOpen) close();
    },
    [close],
  );

  const ingredientSetters = useMemo<Record<IngredientSectionKey, IngredientRowsSetter>>(
    () => ({purchased: setPurchased, pantry: setPantry, missing: setMissing}),
    [],
  );

  const handleNameChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setName(event.currentTarget.value);
  }, []);
  const handleDescriptionChange = useCallback((event: ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(event.currentTarget.value);
  }, []);
  const handleServingsChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setServings(Number(event.currentTarget.value));
  }, []);
  const handleDifficultyChange = useCallback((value: string) => {
    if (!isRecipeDifficulty(value)) throw new Error(`Unsupported recipe difficulty: ${value}`);
    setDifficulty(value);
  }, []);
  const handlePreparationMinutesChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setPreparationMinutes(Number(event.currentTarget.value));
  }, []);
  const handleCookingMinutesChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setCookingMinutes(Number(event.currentTarget.value));
  }, []);
  const handleTotalMinutesChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setTotalMinutes(Number(event.currentTarget.value));
  }, []);
  const handleIngredientAdd = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const {section} = event.currentTarget.dataset;
      if (!isIngredientSectionKey(section)) return;
      ingredientSetters[section]((rows) => [...rows, emptyIngredient()]);
    },
    [ingredientSetters],
  );
  const handleIngredientChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const {field, rowId, section} = event.currentTarget.dataset;
      if (!isIngredientSectionKey(section) || !isIngredientField(field) || rowId === undefined) return;
      const {value} = event.currentTarget;
      ingredientSetters[section]((rows) => updateIngredientRows(rows, rowId, field, value));
    },
    [ingredientSetters],
  );
  const handleIngredientRemove = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      const {rowId, section} = event.currentTarget.dataset;
      if (!isIngredientSectionKey(section) || rowId === undefined) return;
      ingredientSetters[section]((rows) => rows.filter((row) => row.id !== rowId));
    },
    [ingredientSetters],
  );
  const handleStepAdd = useCallback(() => {
    setSteps((currentSteps) => [...currentSteps, emptyStep()]);
  }, []);
  const handleStepChange = useCallback((event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const {field, rowId} = event.currentTarget.dataset;
    if (!isStepField(field) || rowId === undefined) return;
    const {value} = event.currentTarget;
    setSteps((currentSteps) => updateStepRows(currentSteps, rowId, field, value));
  }, []);
  const handleStepRemove = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const {rowId} = event.currentTarget.dataset;
    if (rowId === undefined) return;
    setSteps((currentSteps) => currentSteps.filter((step) => step.id !== rowId));
  }, []);
  const handleAllergenToggle = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const {code} = event.currentTarget.dataset;
    if (!isAllergenCode(code)) return;
    setAllergens((currentAllergens) =>
      currentAllergens.includes(code) ? currentAllergens.filter((currentCode) => currentCode !== code) : [...currentAllergens, code],
    );
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
              onChange={handleNameChange}
              placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.recipeName)}
              required
              aria-invalid={errors["name"] !== undefined}
              aria-describedby={getValidationMessageId(errors["name"], "recipe-add-name-error")}
            />
            <FieldError
              id='recipe-add-name-error'
              className={styles["errorText"]}>
              {errors["name"]}
            </FieldError>
          </div>

          {/* Description */}
          <div className={styles["fieldGroup"]}>
            <Label htmlFor='recipe-add-description'>{t((m) => m.dialogs.invoices.recipeDialog.fields.description)}</Label>
            <Textarea
              id='recipe-add-description'
              value={description}
              onChange={handleDescriptionChange}
              placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.description)}
              rows={2}
              required
              aria-invalid={errors["description"] !== undefined}
              aria-describedby={getValidationMessageId(errors["description"], "recipe-add-description-error")}
            />
            <FieldError
              id='recipe-add-description-error'
              className={styles["errorText"]}>
              {errors["description"]}
            </FieldError>
          </div>

          {/* Servings + Difficulty + Times */}
          <div className={styles["timeGrid"]}>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-add-servings'>{t((m) => m.dialogs.invoices.recipeDialog.fields.servings)}</Label>
              <Input
                id='recipe-add-servings'
                type='number'
                min={1}
                step={1}
                value={servings}
                onChange={handleServingsChange}
                placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.servings)}
                aria-invalid={errors["servings"] !== undefined}
                aria-describedby={getValidationMessageId(errors["servings"], "recipe-add-servings-error")}
              />
              <FieldError
                id='recipe-add-servings-error'
                className={styles["errorText"]}>
                {errors["servings"]}
              </FieldError>
            </div>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-add-difficulty'>{t((m) => m.dialogs.invoices.recipeDialog.fields.difficulty)}</Label>
              <Select
                value={difficulty}
                onValueChange={handleDifficultyChange}>
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
                step={1}
                value={preparationMinutes}
                onChange={handlePreparationMinutesChange}
                aria-invalid={errors["minutes"] !== undefined}
                aria-describedby={getValidationMessageId(errors["minutes"], "recipe-add-minutes-error")}
              />
            </div>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-add-cook'>{t((m) => m.dialogs.invoices.recipeDialog.fields.cookTime)}</Label>
              <Input
                id='recipe-add-cook'
                type='number'
                min={0}
                step={1}
                value={cookingMinutes}
                onChange={handleCookingMinutesChange}
                aria-invalid={errors["minutes"] !== undefined}
                aria-describedby={getValidationMessageId(errors["minutes"], "recipe-add-minutes-error")}
              />
            </div>
            <div className={styles["fieldGroup"]}>
              <Label htmlFor='recipe-add-total'>{t((m) => m.dialogs.invoices.recipeDialog.fields.totalDuration)}</Label>
              <Input
                id='recipe-add-total'
                type='number'
                min={0}
                step={1}
                value={totalMinutes}
                onChange={handleTotalMinutesChange}
                aria-invalid={totalMinutesErrorId !== undefined}
                aria-describedby={totalMinutesErrorId}
              />
              <FieldError
                id='recipe-add-total-error'
                className={styles["errorText"]}>
                {errors["totalMinutes"]}
              </FieldError>
            </div>
          </div>
          <FieldError
            id='recipe-add-minutes-error'
            className={styles["errorText"]}>
            {errors["minutes"]}
          </FieldError>

          {/* Ingredient sections */}
          <FieldError
            id='recipe-add-ingredients-error'
            className={styles["errorText"]}>
            {errors["ingredients"]}
          </FieldError>
          {(
            [
              {
                key: "purchased",
                label: t((m) => m.dialogs.invoices.recipeDialog.fields.purchasedIngredients),
                rows: purchased,
              },
              {key: "pantry", label: t((m) => m.dialogs.invoices.recipeDialog.fields.pantryStaples), rows: pantry},
              {
                key: "missing",
                label: t((m) => m.dialogs.invoices.recipeDialog.fields.missingIngredients),
                rows: missing,
              },
            ] as const
          ).map(({key, label, rows}) => (
            <div
              key={key}
              className={styles["fieldGroup"]}>
              <div className={styles["fieldHeader"]}>
                <Label>{label}</Label>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  data-section={key}
                  onClick={handleIngredientAdd}>
                  <TbPlus className={styles["addIcon"]} />
                  {t((m) => m.dialogs.invoices.recipeDialog.buttons.add)}
                </Button>
              </div>
              {rows.map((row) => {
                const ingredientErrorId = getIngredientQuantityErrorId(row, errors["ingredients"], "recipe-add-ingredients-error");
                return (
                  <div
                    key={row.id}
                    className={styles["ingredientRow"]}>
                    <Input
                      value={row.name}
                      data-section={key}
                      data-row-id={row.id}
                      data-field='name'
                      onChange={handleIngredientChange}
                      placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.ingredientName)}
                      className={styles["ingredientInput"]}
                    />
                    <Input
                      value={row.quantity}
                      data-section={key}
                      data-row-id={row.id}
                      data-field='quantity'
                      onChange={handleIngredientChange}
                      placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.ingredientQuantity)}
                      className={styles["ingredientInput"]}
                      aria-invalid={ingredientErrorId !== undefined}
                      aria-describedby={ingredientErrorId}
                    />
                    <Input
                      value={row.preparation}
                      data-section={key}
                      data-row-id={row.id}
                      data-field='preparation'
                      onChange={handleIngredientChange}
                      placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.ingredientPreparation)}
                      className={styles["ingredientInput"]}
                    />
                    <Button
                      type='button'
                      variant='ghost'
                      size='icon'
                      disabled={rows.length <= 1}
                      data-section={key}
                      data-row-id={row.id}
                      onClick={handleIngredientRemove}>
                      <TbMinus className={styles["icon4"]} />
                    </Button>
                  </div>
                );
              })}
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
                onClick={handleStepAdd}>
                <TbPlus className={styles["addIcon"]} />
                {t((m) => m.dialogs.invoices.recipeDialog.buttons.add)}
              </Button>
            </div>
            <FieldError
              id='recipe-add-steps-error'
              className={styles["errorText"]}>
              {errors["steps"]}
            </FieldError>
            {steps.map((step, stepIndex) => (
              <div
                key={step.id}
                className={styles["stepRow"]}>
                <span className={styles["stepSequence"]}>{stepIndex + 1}.</span>
                <Textarea
                  value={step.instruction}
                  data-row-id={step.id}
                  data-field='instruction'
                  onChange={handleStepChange}
                  placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.stepInstruction)}
                  rows={2}
                  className={styles["stepInput"]}
                  aria-invalid={errors["steps"] !== undefined}
                  aria-describedby={getValidationMessageId(errors["steps"], "recipe-add-steps-error")}
                />
                <Input
                  value={step.notes}
                  data-row-id={step.id}
                  data-field='notes'
                  onChange={handleStepChange}
                  placeholder={t((m) => m.dialogs.invoices.recipeDialog.placeholders.stepNotes)}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  disabled={steps.length <= 1}
                  data-row-id={step.id}
                  onClick={handleStepRemove}>
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
                          data-code={code}
                          onClick={handleAllergenToggle}>
                          {t(selectorFromPath(getAllergenLabelKey(code)))}
                        </Button>
                      }
                    />
                    <TooltipContent>
                      <p>{t(selectorFromPath(getAllergenLabelKey(code)))}</p>
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
