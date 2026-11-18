// @vitest-environment happy-dom

import "@testing-library/jest-dom/vitest";
import "fake-indexeddb/auto";
import {DialogProvider, useDialogs} from "@/app/domains/invoices/_contexts/DialogContext";
import {useInvoicesStore} from "@/stores";
import type {Invoice, RecipeSuggestion} from "@/types/invoices";
import {Toaster, toast} from "@arolariu/components";
import {act, cleanup, fireEvent, render, screen, waitFor, within} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {MotionGlobalConfig} from "motion/react";
import {NextIntlClientProvider} from "next-intl";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import messages from "../../../../../../../messages/en.json";
import {buildInvoice, buildRecipeSuggestion} from "../../../../../../../tests/helpers/builders/domain";
import {apiUrl, fetchAtHttp} from "../../../../../../../tests/setup/server-http";
import {EditInvoiceContextProvider} from "../_context/EditInvoiceContext";
import AddRecipeDialog from "./AddRecipeDialog";
import UpdateRecipeDialog from "./UpdateRecipeDialog";

const refresh = vi.hoisted(() => vi.fn<() => void>());
vi.mock("next/navigation", () => ({useRouter: () => ({refresh})}));
vi.mock("next/cache", () => ({revalidatePath: vi.fn()}));

function RecipeControls({recipe}: Readonly<{recipe: RecipeSuggestion | undefined}>): React.JSX.Element {
  const {openDialog, isOpen} = useDialogs();
  return (
    <>
      <button onClick={() => openDialog("EDIT_INVOICE__RECIPE_ADD", "add")}>Open add recipe</button>
      <button onClick={() => openDialog("EDIT_INVOICE__RECIPE_UPDATE", "edit", recipe ? {recipe, recipeIndex: 1} : undefined)}>
        Open update recipe
      </button>
      {isOpen("EDIT_INVOICE__RECIPE_ADD") ? <AddRecipeDialog /> : null}
      {isOpen("EDIT_INVOICE__RECIPE_UPDATE") ? <UpdateRecipeDialog /> : null}
    </>
  );
}

function renderRecipes(invoice: Invoice): ReturnType<typeof userEvent.setup> {
  useInvoicesStore.getState().setEntities([invoice]);
  render(
    <NextIntlClientProvider
      locale='en'
      messages={{dialogs: {invoices: {recipeDialog: messages.dialogs.invoices.recipeDialog}}, shared: messages.shared}}>
      <EditInvoiceContextProvider
        invoice={invoice}
        merchant={null}>
        <DialogProvider>
          <RecipeControls recipe={invoice.possibleRecipes[1]} />
          <Toaster />
        </DialogProvider>
      </EditInvoiceContextProvider>
    </NextIntlClientProvider>,
  );
  return userEvent.setup();
}

const invoice = buildInvoice({
  id: "11111111-1111-4111-8111-111111111111",
  userIdentifier: "22222222-2222-4222-8222-222222222222",
  merchantReference: "33333333-3333-4333-8333-333333333333",
});

describe("invoice recipe dialogs", () => {
  const skipAnimations = MotionGlobalConfig.skipAnimations;

  beforeEach(async () => {
    MotionGlobalConfig.skipAnimations = true;
    await useInvoicesStore.persist.rehydrate();
  });

  afterEach(() => {
    toast.close();
    cleanup();
    useInvoicesStore.getState().clearEntities();
    MotionGlobalConfig.skipAnimations = skipAnimations;
  });

  it("explains invalid timing and missing ingredient quantities without sending a patch", async () => {
    const user = renderRecipes(invoice);
    await user.click(screen.getByRole("button", {name: "Open add recipe"}));
    const dialog = within(screen.getByRole("dialog", {name: "Add new recipe"}));
    const total = dialog.getByRole("spinbutton", {name: "Total Duration"});
    const [ingredient] = dialog.getAllByPlaceholderText("e.g. Tomatoes");
    const [quantity, unnamedQuantity] = dialog.getAllByPlaceholderText("e.g. 500 g");
    const save = dialog.getByRole("button", {name: "Save"});
    expect(total).not.toHaveAttribute("aria-invalid", "true");

    fireEvent.change(dialog.getByRole("spinbutton", {name: "Prep time"}), {target: {value: "10"}});
    fireEvent.change(ingredient!, {target: {value: "Tomatoes"}});
    await user.click(save);

    expect(total).toHaveAccessibleDescription("Total time must be at least prep + cook time");
    expect(quantity).toHaveAccessibleDescription("Every named ingredient requires a quantity");
    expect(unnamedQuantity).not.toHaveAttribute("aria-invalid", "true");
    expect(dialog.getByRole("textbox", {name: "Recipe name"})).toHaveAccessibleDescription("Recipe name is required");
    expect(dialog.getByPlaceholderText("Describe this step")).toHaveAccessibleDescription("At least one step is required");

    fireEvent.change(total, {target: {value: "-1"}});
    await user.click(save);

    expect(total).toHaveAccessibleDescription("Recipe times must be non-negative whole minutes");
    expect(dialog.queryByText("Total time must be at least prep + cook time")).not.toBeInTheDocument();
    expect(fetchAtHttp).not.toHaveBeenCalled();
  });

  it("appends a normalized recipe and keeps existing recipes in the PATCH", async () => {
    const existing = buildRecipeSuggestion({name: "Soup", description: "Lunch"});
    const user = renderRecipes({...invoice, possibleRecipes: [existing]});
    const created = buildRecipeSuggestion({
      name: "Tomato salad",
      description: "Quick lunch",
      preparationMinutes: 0,
      cookingMinutes: 0,
      totalMinutes: 0,
      purchasedIngredients: [{name: "Tomatoes", quantity: "500 g", preparation: null}],
      steps: [{sequence: 1, instruction: "Slice the tomatoes", notes: null}],
    });
    const stored = {...created, name: "Stored tomato salad"};
    fetchAtHttp.mockResolvedValue(Response.json({...invoice, possibleRecipes: [existing, stored]}));
    await user.click(screen.getByRole("button", {name: "Open add recipe"}));
    const dialog = within(screen.getByRole("dialog", {name: "Add new recipe"}));

    fireEvent.change(dialog.getByRole("textbox", {name: "Recipe name"}), {target: {value: "  Tomato salad  "}});
    fireEvent.change(dialog.getByRole("textbox", {name: "Description"}), {target: {value: "  Quick lunch  "}});
    const [ingredient] = dialog.getAllByPlaceholderText("e.g. Tomatoes");
    const [quantity] = dialog.getAllByPlaceholderText("e.g. 500 g");
    fireEvent.change(ingredient!, {target: {value: "Tomatoes"}});
    fireEvent.change(quantity!, {target: {value: "500 g"}});
    fireEvent.change(dialog.getByPlaceholderText("Describe this step"), {target: {value: "Slice the tomatoes"}});
    await act(() => user.click(dialog.getByRole("button", {name: "Save"})));

    await waitFor(() => expect(screen.queryByRole("dialog", {name: "Add new recipe"})).not.toBeInTheDocument());
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetchAtHttp).toHaveBeenCalledExactlyOnceWith(
      `${apiUrl}/rest/v1/invoices/${invoice.id}`,
      expect.objectContaining({method: "PATCH"}),
    );
    expect(JSON.parse(String(fetchAtHttp.mock.calls[0]?.[1]?.body))).toEqual({possibleRecipes: [existing, created]});
    expect(useInvoicesStore.getState().getEntityById(invoice.id)?.possibleRecipes).toEqual([existing, stored]);
    expect(screen.getByText("Recipe created successfully")).toBeInTheDocument();
  });

  it("keeps a failed edit retryable and replaces the selected recipe by index after success", async () => {
    const first = buildRecipeSuggestion({name: "Soup", description: "First recipe"});
    const second = buildRecipeSuggestion({name: "Soup", description: "Second recipe"});
    const edited = {...second, description: "New description"};
    const user = renderRecipes({...invoice, possibleRecipes: [first, second]});
    fetchAtHttp
      .mockResolvedValueOnce(new Response("Conflict", {status: 409, statusText: "Conflict"}))
      .mockResolvedValueOnce(Response.json({...invoice, possibleRecipes: [first, edited]}));
    await user.click(screen.getByRole("button", {name: "Open update recipe"}));
    const dialog = within(screen.getByRole("dialog", {name: "Update recipe"}));
    const description = dialog.getByRole("textbox", {name: "Description"});
    expect(description).toHaveValue("Second recipe");

    fireEvent.change(description, {target: {value: "New description"}});
    await act(() => user.click(dialog.getByRole("button", {name: "Save"})));

    expect(await screen.findByText("Failed to update invoice: 409 Conflict")).toBeInTheDocument();
    expect(description).toHaveValue("New description");
    expect(useInvoicesStore.getState().getEntityById(invoice.id)?.possibleRecipes).toEqual([first, second]);
    expect(refresh).not.toHaveBeenCalled();

    await act(() => user.click(dialog.getByRole("button", {name: "Save"})));

    await waitFor(() => expect(screen.queryByRole("dialog", {name: "Update recipe"})).not.toBeInTheDocument());
    expect(refresh).toHaveBeenCalledOnce();
    expect(fetchAtHttp.mock.calls.map(([, options]) => JSON.parse(String(options?.body)) as unknown)).toEqual([
      {possibleRecipes: [first, edited]},
      {possibleRecipes: [first, edited]},
    ]);
    expect(useInvoicesStore.getState().getEntityById(invoice.id)?.possibleRecipes).toEqual([first, edited]);
  });
});
