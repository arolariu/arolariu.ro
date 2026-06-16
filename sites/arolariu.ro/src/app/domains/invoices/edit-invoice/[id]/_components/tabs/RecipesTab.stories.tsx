import {storyRecipes, WithInvoiceDialogs} from "@/app/domains/invoices/_storybook";
import type {Meta, StoryObj} from "@storybook/react";
import RecipesTab from "./RecipesTab";

/**
 * RecipesTab displays a paginated grid of `RecipeCard`s generated from invoice
 * items, with generate-more and add-recipe actions.
 *
 * @remarks
 * The real component depends on `useDialog` (via the dialog context) for the
 * add/edit/delete/share recipe dialogs. Stories mount the real component wrapped
 * in `WithInvoiceDialogs` and pass recipe fixtures through the `recipes` prop.
 */
const meta = {
  title: "arolariu.ro/IMS/Tabs/Recipe/RecipesTab",
  component: RecipesTab,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <WithInvoiceDialogs>
        <Story />
      </WithInvoiceDialogs>
    ),
  ],
} satisfies Meta<typeof RecipesTab>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Recipes tab populated with the story recipe fixtures. */
export const WithRecipes: Story = {
  args: {recipes: storyRecipes},
};

/** Empty recipes tab showing the create-first-recipe state. */
export const NoRecipes: Story = {
  args: {recipes: []},
};
