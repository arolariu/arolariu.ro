import type {Meta, StoryObj} from "@storybook/react";

/**
 * RecipeCard displays a recipe with complexity badge, ingredients, timing,
 * and CRUD dropdown actions. It depends on `useDialog` for edit/delete/share.
 *
 * This story renders a static preview of the recipe card layout.
 */
const meta = {
  title: "Invoices/EditInvoice/RecipeCard",
  decorators: [
    (Story) => (
      <div className='max-w-sm'>
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of an easy recipe card. */
export const EasyRecipe: Story = {
  render: () => (
    <div className='overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md dark:bg-gray-900'>
      <div className='border-b p-4'>
        <div className='flex items-start justify-between'>
          <div>
            <h3 className='text-lg font-semibold'>Salmon Pasta</h3>
            <span className='mt-1 inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200'>
              Easy
            </span>
          </div>
          <button
            type='button'
            className='rounded-md p-1 hover:bg-gray-100 dark:hover:bg-gray-800'>
            ⋯
          </button>
        </div>
      </div>
      <div className='space-y-3 p-4'>
        <p className='text-sm text-gray-600 dark:text-gray-400'>A quick and delicious pasta dish with fresh salmon and herbs.</p>
        <div>
          <h4 className='text-xs font-semibold text-gray-500'>Ingredients</h4>
          <ul className='mt-1 list-inside list-disc text-sm text-gray-600 dark:text-gray-400'>
            <li>Pasta (200g)</li>
            <li>Fresh Salmon (150g)</li>
            <li>Olive Oil</li>
            <li className='text-blue-600 dark:text-blue-400'>+2 more...</li>
          </ul>
        </div>
        <div className='flex gap-4 text-xs text-gray-500'>
          <span>⏱ Prep: 10 min</span>
          <span>🍳 Cook: 20 min</span>
        </div>
      </div>
      <div className='flex items-center justify-center gap-2 border-t bg-gray-50 px-4 py-2 dark:bg-gray-800'>
        <button
          type='button'
          className='text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400'>
          Visit Reference 🔗
        </button>
        <button
          type='button'
          className='rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700'>
          View Recipe
        </button>
      </div>
    </div>
  ),
};

/** Preview of a hard recipe card. */
export const HardRecipe: Story = {
  render: () => (
    <div className='overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <div>
          <h3 className='text-lg font-semibold'>Beef Wellington</h3>
          <span className='mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900 dark:text-red-200'>
            Hard
          </span>
        </div>
      </div>
      <div className='space-y-3 p-4'>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          A classic British dish featuring beef fillet wrapped in pâté and puff pastry.
        </p>
        <div className='flex gap-4 text-xs text-gray-500'>
          <span>⏱ Prep: 45 min</span>
          <span>🍳 Cook: 90 min</span>
        </div>
      </div>
    </div>
  ),
};
