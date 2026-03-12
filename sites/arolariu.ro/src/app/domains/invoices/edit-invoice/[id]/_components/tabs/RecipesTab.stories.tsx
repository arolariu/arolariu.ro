import type {Meta, StoryObj} from "@storybook/react";

/**
 * RecipesTab displays recipe cards generated from invoice items, with
 * pagination and a generate-more action. Depends on `useDialog`.
 *
 * This story renders a static preview of the recipes tab layout.
 */
const meta = {
  title: "Invoices/EditInvoice/Tabs/RecipesTab",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview with recipe cards. */
export const WithRecipes: Story = {
  render: () => (
    <div className='rounded-lg border bg-white dark:bg-gray-900'>
      <div className='flex items-center justify-between border-b p-4'>
        <div>
          <h3 className='text-lg font-semibold'>AI-Generated Recipes</h3>
          <p className='text-sm text-gray-500'>Recipes created from your invoice items</p>
        </div>
        <div className='flex gap-2'>
          <button
            type='button'
            className='rounded-md border px-3 py-1.5 text-sm dark:border-gray-600'>
            🎉 Generate More
          </button>
          <button
            type='button'
            className='rounded-md border px-3 py-1.5 text-sm dark:border-gray-600'>
            ➕ Add Recipe
          </button>
        </div>
      </div>
      <div className='grid gap-4 p-4 md:grid-cols-2'>
        {[
          {name: "Creamy Pasta", complexity: "Easy", time: "30 min"},
          {name: "Grilled Chicken Salad", complexity: "Easy", time: "25 min"},
          {name: "Beef Stir-Fry", complexity: "Medium", time: "40 min"},
        ].map((recipe) => (
          <div
            key={recipe.name}
            className='rounded-lg border p-4 hover:shadow-sm dark:border-gray-700'>
            <h4 className='font-medium'>{recipe.name}</h4>
            <div className='mt-1 flex gap-2'>
              <span className='rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
                {recipe.complexity}
              </span>
              <span className='text-xs text-gray-500'>⏱ {recipe.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  ),
};

/** Empty recipes tab. */
export const NoRecipes: Story = {
  render: () => (
    <div className='rounded-lg border bg-white dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='text-lg font-semibold'>AI-Generated Recipes</h3>
        <p className='text-sm text-gray-500'>No recipes generated yet</p>
      </div>
      <div className='flex flex-col items-center gap-3 p-8 text-center'>
        <p className='text-sm text-gray-500'>No recipes have been generated for this invoice yet.</p>
        <button
          type='button'
          className='rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700'>
          🎉 Generate Recipes
        </button>
      </div>
    </div>
  ),
};
