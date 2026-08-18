import {DialogProvider} from "@/app/domains/invoices/_contexts/DialogContext";
import {buildRecipe} from "../../../../../../../../tests/helpers/builders/domain";
import type {Meta, StoryObj} from "@storybook/react";
import RecipesTab from "./RecipesTab";

const meta = {
  title: "Invoices/EditInvoice/Tabs/RecipesTab",
  component: RecipesTab,
  decorators: [
    (Story) => (
      <DialogProvider>
        <Story />
      </DialogProvider>
    ),
  ],
  parameters: {layout: "padded"},
} satisfies Meta<typeof RecipesTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const PaginatedRecipes: Story = {
  args: {
    recipes: Array.from({length: 5}, (_, index) =>
      buildRecipe({name: `Recipe ${String(index + 1)}`, steps: [{sequence: 1, instruction: "Prepare and serve.", notes: null}]}),
    ),
  },
};

export const Empty: Story = {args: {recipes: []}};
