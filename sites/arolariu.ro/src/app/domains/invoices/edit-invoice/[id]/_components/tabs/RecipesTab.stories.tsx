import {storyRecipeEasy, storyRecipeHard, storyRecipes, WithInvoiceDialogs} from "@/app/domains/invoices/_storybook";
import type {RecipeComplexity} from "@/types/invoices/Recipe";
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

/** Recipes tab with a single easy-complexity recipe for minimal content testing. */
export const SingleEasyRecipe: Story = {
  args: {recipes: [storyRecipeEasy]},
};

/** Recipes tab with a single hard-complexity recipe showing all ingredient details. */
export const SingleHardRecipe: Story = {
  args: {recipes: [storyRecipeHard]},
};

/** Recipes tab with many recipes to test pagination and grid overflow handling. */
export const ManyRecipes: Story = {
  args: {
    recipes: [
      storyRecipeEasy,
      storyRecipeHard,
      {
        name: "Greek Salad",
        description: "Fresh Mediterranean salad with feta cheese",
        approximateTotalDuration: 15,
        complexity: 1 as RecipeComplexity,
        ingredients: ["Tomatoes", "Cucumber", "Red Onion", "Feta Cheese", "Olives", "Olive Oil", "Lemon"],
        instructions: "1. Chop vegetables\n2. Add feta and olives\n3. Drizzle with oil and lemon",
        preparationTime: 15,
        cookingTime: 0,
        referenceForMoreDetails: "https://example.com/greek-salad",
      },
      {
        name: "Chicken Stir Fry",
        description: "Quick Asian-inspired chicken with vegetables",
        approximateTotalDuration: 20,
        complexity: 2 as RecipeComplexity,
        ingredients: ["Chicken Breast", "Soy Sauce", "Ginger", "Garlic", "Bell Peppers", "Broccoli", "Sesame Oil"],
        instructions: "1. Slice chicken and vegetables\n2. Heat wok\n3. Stir fry chicken\n4. Add vegetables\n5. Add sauce",
        preparationTime: 10,
        cookingTime: 10,
        referenceForMoreDetails: "https://example.com/stir-fry",
      },
      {
        name: "Banana Bread",
        description: "Moist and sweet banana bread for breakfast or snack",
        approximateTotalDuration: 75,
        complexity: 2 as RecipeComplexity,
        ingredients: ["Ripe Bananas", "Flour", "Sugar", "Eggs", "Butter", "Baking Soda", "Vanilla Extract", "Salt"],
        instructions: "1. Mash bananas\n2. Mix wet ingredients\n3. Combine with dry ingredients\n4. Bake at 175°C for 60 minutes",
        preparationTime: 15,
        cookingTime: 60,
        referenceForMoreDetails: "https://example.com/banana-bread",
      },
    ],
  },
};

/** Recipes tab with recipe containing very long name and ingredient list to test text overflow. */
export const LongRecipeNames: Story = {
  args: {
    recipes: [
      {
        name: "Grandma's Traditional Homemade Extra-Special Sunday Roast Beef Wellington with Mushroom Duxelles and Herb-Infused Puff Pastry",
        description:
          "An exceptionally elaborate and time-consuming recipe passed down through generations with meticulous attention to detail",
        approximateTotalDuration: 240,
        complexity: 3 as RecipeComplexity,
        ingredients: [
          "Premium Beef Tenderloin Fillet",
          "Artisanal Puff Pastry",
          "Wild Forest Mushrooms",
          "French Shallots",
          "Fresh Garlic Cloves",
          "Organic Thyme Sprigs",
          "Whole Grain Dijon Mustard",
          "Free Range Egg Yolks",
          "Grass-Fed Butter",
          "Extra Virgin Olive Oil",
          "Sea Salt Flakes",
          "Freshly Ground Black Pepper",
          "Italian Parma Ham",
          "White Wine for Deglazing",
          "Fresh Rosemary",
        ],
        instructions:
          "1. Season the premium beef tenderloin generously\n2. Sear on all sides until beautifully caramelized\n3. Prepare the mushroom duxelles with precision\n4. Layer the pastry with ham and duxelles\n5. Wrap and seal meticulously\n6. Bake to golden perfection",
        preparationTime: 90,
        cookingTime: 150,
        referenceForMoreDetails: "https://example.com/elaborate-beef-wellington-recipe-traditional-family-version",
      },
    ],
  },
};

/** Recipes tab with mix of all complexity levels to test filter and display variety. */
export const MixedComplexity: Story = {
  args: {
    recipes: [
      storyRecipeEasy,
      {
        name: "Pasta Aglio e Olio",
        description: "Simple Italian pasta with garlic and olive oil",
        approximateTotalDuration: 20,
        complexity: 1 as RecipeComplexity,
        ingredients: ["Spaghetti", "Garlic", "Olive Oil", "Red Pepper Flakes", "Parsley", "Parmesan"],
        instructions: "1. Cook pasta\n2. Sauté garlic in oil\n3. Toss pasta with garlic oil\n4. Add pepper flakes and parsley",
        preparationTime: 5,
        cookingTime: 15,
        referenceForMoreDetails: "https://example.com/aglio-olio",
      },
      {
        name: "Homemade Pizza Margherita",
        description: "Classic Italian pizza with fresh mozzarella and basil",
        approximateTotalDuration: 150,
        complexity: 2 as RecipeComplexity,
        ingredients: ["Pizza Dough", "Tomato Sauce", "Fresh Mozzarella", "Fresh Basil", "Olive Oil", "Salt"],
        instructions:
          "1. Prepare and rest dough for 2 hours\n2. Roll out dough\n3. Spread sauce\n4. Add mozzarella\n5. Bake at 250°C for 12 minutes\n6. Top with fresh basil",
        preparationTime: 120,
        cookingTime: 30,
        referenceForMoreDetails: "https://example.com/pizza-margherita",
      },
      storyRecipeHard,
    ],
  },
};
