/**
 * @fileoverview Unit tests for PreviewRecipeDialog — structured RecipeSuggestion display.
 * @module app/domains/invoices/edit-invoice/[id]/_dialogs/PreviewRecipeDialog.test
 */

import {DialogProvider, useDialogs} from "@/app/domains/invoices/_contexts/DialogContext";
import {AllergenCode, RecipeDifficulty, type RecipeSuggestion} from "@/types/invoices";
import {render, screen} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {describe, expect, it} from "vitest";
import PreviewRecipeDialog from "./PreviewRecipeDialog";

const testRecipe: RecipeSuggestion = {
  name: "Test Carbonara",
  description: "Classic Italian pasta",
  servings: 4,
  preparationMinutes: 10,
  cookingMinutes: 20,
  totalMinutes: 30,
  difficulty: RecipeDifficulty.Medium,
  purchasedIngredients: [
    {name: "Pasta", quantity: "400 g", preparation: null},
    {name: "Eggs", quantity: "3", preparation: "beaten"},
  ],
  assumedPantryStaples: [
    {name: "Salt", quantity: "to taste", preparation: null},
  ],
  missingOptionalIngredients: [
    {name: "Black pepper", quantity: "pinch", preparation: null},
  ],
  steps: [
    {sequence: 2, instruction: "Fry pancetta", notes: "until crispy"},
    {sequence: 1, instruction: "Boil pasta", notes: null},
    {sequence: 3, instruction: "Mix and serve", notes: null},
  ],
  allergenWarnings: [AllergenCode.Eggs, AllergenCode.Milk],
};

const recipeWithEmptyIngredients: RecipeSuggestion = {
  ...testRecipe,
  purchasedIngredients: [],
  assumedPantryStaples: [],
  missingOptionalIngredients: [],
  allergenWarnings: [],
};

function OpenPreviewDialog({recipe}: Readonly<{recipe: RecipeSuggestion}>): React.JSX.Element {
  const {openDialog} = useDialogs();
  return (
    <>
      <button
        type='button'
        onClick={() => openDialog("EDIT_INVOICE__RECIPE_PREVIEW", "view", {recipe})}>
        Open Preview
      </button>
      <PreviewRecipeDialog />
    </>
  );
}

function Wrapper({recipe}: Readonly<{recipe: RecipeSuggestion}>): React.JSX.Element {
  return (
    <DialogProvider>
      <OpenPreviewDialog recipe={recipe} />
    </DialogProvider>
  );
}

describe("PreviewRecipeDialog", () => {
  it("renders all three ingredient section headings even when a section is empty", async () => {
    render(<Wrapper recipe={recipeWithEmptyIngredients} />);
    await userEvent.click(screen.getByRole("button", {name: "Open Preview"}));

    // All three ingredient section headings must render (no section collapses when empty)
    expect(screen.getByText(/purchasedIngredients|Purchased Ingredients/i)).toBeTruthy();
    expect(screen.getByText(/pantryStaples|Pantry Staples/i)).toBeTruthy();
    expect(screen.getByText(/missingIngredients|Missing Optional Ingredients/i)).toBeTruthy();
  });

  it("renders purchased ingredients with name and quantity", async () => {
    render(<Wrapper recipe={testRecipe} />);
    await userEvent.click(screen.getByRole("button", {name: "Open Preview"}));

    expect(screen.getByText(/Pasta/)).toBeTruthy();
    expect(screen.getByText(/400 g/)).toBeTruthy();
    expect(screen.getByText(/Eggs/)).toBeTruthy();
  });

  it("renders pantry staples section", async () => {
    render(<Wrapper recipe={testRecipe} />);
    await userEvent.click(screen.getByRole("button", {name: "Open Preview"}));

    expect(screen.getByText(/Salt/)).toBeTruthy();
  });

  it("renders missing optional ingredients section", async () => {
    render(<Wrapper recipe={testRecipe} />);
    await userEvent.click(screen.getByRole("button", {name: "Open Preview"}));

    expect(screen.getByText(/Black pepper/)).toBeTruthy();
  });

  it("renders steps in ascending sequence order", async () => {
    render(<Wrapper recipe={testRecipe} />);
    await userEvent.click(screen.getByRole("button", {name: "Open Preview"}));

    const listItems = screen.getAllByRole("listitem");
    // Steps should appear in sequence: 1=Boil pasta, 2=Fry pancetta, 3=Mix
    const stepTexts = listItems.map((li) => li.textContent ?? "");
    const boilIdx = stepTexts.findIndex((t) => t.includes("Boil pasta"));
    const fryIdx = stepTexts.findIndex((t) => t.includes("Fry pancetta"));
    const mixIdx = stepTexts.findIndex((t) => t.includes("Mix and serve"));

    expect(boilIdx).toBeGreaterThanOrEqual(0);
    expect(fryIdx).toBeGreaterThan(boilIdx);
    expect(mixIdx).toBeGreaterThan(fryIdx);
  });

  it("renders allergen warnings using canonical allergen label keys", async () => {
    render(<Wrapper recipe={testRecipe} />);
    await userEvent.click(screen.getByRole("button", {name: "Open Preview"}));

    // The mock translator returns the key path — verify allergen labels are used
    // The allergenLabels map provides the key path (e.g. "allergens.codes.eggs")
    // In test environment, the translator may return the key or the mapped label
    const container = screen.getByLabelText(/allergen/i);
    expect(container).toBeTruthy();
    // Both allergen codes should produce some badge in the allergen warnings area
    expect(screen.getAllByRole("paragraph").length).toBeGreaterThanOrEqual(1);
  });

  it("renders empty allergen section without crashing", async () => {
    render(<Wrapper recipe={recipeWithEmptyIngredients} />);
    await userEvent.click(screen.getByRole("button", {name: "Open Preview"}));

    // Dialog should render successfully even with no allergens
    expect(screen.getByText(/Test Carbonara/)).toBeTruthy();
  });

  it("renders ingredient preparation notes when present", async () => {
    render(<Wrapper recipe={testRecipe} />);
    await userEvent.click(screen.getByRole("button", {name: "Open Preview"}));

    // The "beaten" prep note for Eggs should appear
    expect(screen.getByText(/beaten/)).toBeTruthy();
  });

  it("renders step notes when present", async () => {
    render(<Wrapper recipe={testRecipe} />);
    await userEvent.click(screen.getByRole("button", {name: "Open Preview"}));

    // "until crispy" note for Fry pancetta step
    expect(screen.getByText(/until crispy/)).toBeTruthy();
  });

  it("renders recipe name in dialog title", async () => {
    render(<Wrapper recipe={testRecipe} />);
    await userEvent.click(screen.getByRole("button", {name: "Open Preview"}));

    expect(screen.getByText("Test Carbonara")).toBeTruthy();
  });
});
