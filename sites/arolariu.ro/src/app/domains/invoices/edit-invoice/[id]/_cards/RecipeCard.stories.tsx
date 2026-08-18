import {DialogProvider} from "@/app/domains/invoices/_contexts/DialogContext";
import {buildRecipe} from "../../../../../../../tests/helpers/builders/domain";
import type {Meta, StoryObj} from "@storybook/react";
import RecipeCard from "./RecipeCard";

const meta = {
  title: "Invoices/EditInvoice/Cards/RecipeCard",
  component: RecipeCard,
  decorators: [
    (Story) => (
      <DialogProvider>
        <Story />
      </DialogProvider>
    ),
  ],
  parameters: {layout: "padded"},
} satisfies Meta<typeof RecipeCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Displays complete structured ingredients, ordered preparation, timing, and warnings. */
export const Complete: Story = {
  args: {
    recipe: buildRecipe({
      purchasedIngredients: [{name: "Pasta", quantity: "200 g", preparation: null}],
      assumedPantryStaples: [{name: "Salt", quantity: "a pinch", preparation: null}],
      missingOptionalIngredients: [{name: "Basil", quantity: "a handful", preparation: "torn"}],
      allergenWarnings: ["cerealsContainingGluten"],
    }),
  },
};
