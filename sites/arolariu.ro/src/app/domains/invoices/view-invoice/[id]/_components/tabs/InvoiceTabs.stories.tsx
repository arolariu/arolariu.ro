import {generateRandomMerchant, InvoiceBuilder} from "@/data/mocks";
import {AllergenCode, RecipeDifficulty, type Invoice, type RecipeSuggestion} from "@/types/invoices";
import type {Decorator, Meta, StoryObj} from "@storybook/react";
import {DialogProvider, InvoiceContextProvider} from "../../../../../../../../.storybook/providers";
import {InvoiceTabs} from "./InvoiceTabs";

/**
 * InvoiceTabs displays AI-generated recipe suggestions and additional invoice
 * metadata. Reads the invoice via `useInvoiceContext`, and its child
 * components (`RecipeCard`, `MetadataTab`) call `useDialog` for their CRUD
 * actions, so every story mounts the real component inside both the real
 * `InvoiceContextProvider` and `DialogProvider` re-exported from
 * `.storybook/providers`.
 */
const mockMerchant = generateRandomMerchant();

const sampleRecipes: RecipeSuggestion[] = [
  {
    name: "Pasta Carbonara",
    description: "A classic Italian recipe using ingredients from your purchase.",
    servings: 2,
    preparationMinutes: 15,
    cookingMinutes: 20,
    totalMinutes: 35,
    difficulty: RecipeDifficulty.Medium,
    purchasedIngredients: [
      {name: "Spaghetti", quantity: "200 g", preparation: null},
      {name: "Eggs", quantity: "2", preparation: null},
      {name: "Bacon", quantity: "100 g", preparation: "diced"},
    ],
    assumedPantryStaples: [{name: "Parmesan cheese", quantity: "50 g", preparation: "grated"}],
    missingOptionalIngredients: [],
    steps: [
      {sequence: 1, instruction: "Cook the spaghetti until al dente.", notes: null},
      {sequence: 2, instruction: "Fry the bacon until crisp.", notes: null},
      {sequence: 3, instruction: "Mix eggs and cheese, then combine with hot pasta and bacon.", notes: "Off the heat to avoid scrambling."},
    ],
    allergenWarnings: [AllergenCode.Eggs, AllergenCode.Milk],
  },
  {
    name: "Caesar Salad",
    description: "A quick, easy salad using fresh produce from your purchase.",
    servings: 2,
    preparationMinutes: 15,
    cookingMinutes: 0,
    totalMinutes: 15,
    difficulty: RecipeDifficulty.Easy,
    purchasedIngredients: [{name: "Romaine lettuce", quantity: "1 head", preparation: "chopped"}],
    assumedPantryStaples: [{name: "Caesar dressing", quantity: "3 tbsp", preparation: null}],
    missingOptionalIngredients: [{name: "Croutons", quantity: "1 cup", preparation: null}],
    steps: [{sequence: 1, instruction: "Toss lettuce with dressing and serve.", notes: null}],
    allergenWarnings: [],
  },
];

function withInvoice(invoice: Invoice): Decorator {
  return (Story) => (
    <DialogProvider>
      <InvoiceContextProvider
        invoice={invoice}
        merchant={mockMerchant}>
        <Story />
      </InvoiceContextProvider>
    </DialogProvider>
  );
}

const meta = {
  title: "Invoices/ViewInvoice/InvoiceTabs",
  component: InvoiceTabs,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof InvoiceTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** With recipe suggestions visible. */
export const WithRecipes: Story = {
  decorators: [
    withInvoice(
      new InvoiceBuilder()
        .withPossibleRecipes(sampleRecipes)
        .withAdditionalMetadata({source: "mobile-app", requiresAnalysis: "false"})
        .build(),
    ),
  ],
};

/** Empty recipes state — no AI suggestions available for this invoice. */
export const EmptyRecipes: Story = {
  decorators: [withInvoice(new InvoiceBuilder().withPossibleRecipes([]).build())],
};
