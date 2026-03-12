import type {Meta, StoryObj} from "@storybook/react";
import {TbClock, TbDisc, TbPlus, TbSparkles, TbToolsKitchen, TbWand, TbX} from "react-icons/tb";

/**
 * Static visual preview of the RecipeDialog component.
 *
 * @remarks Static preview — the real component uses `useDialog` context,
 * `useTranslations`, and complex recipe state management. It renders nothing
 * when the dialog is closed. This story renders a faithful HTML replica of
 * the recipe creation / editing form with sample data.
 *
 * @see {@link RecipeDialog} for the real component implementation
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/RecipeDialog",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleIngredients = ["Chicken breast (500g)", "Olive oil (2 tbsp)", "Garlic (3 cloves)", "Rosemary (fresh)", "Salt & pepper"];

/** Static preview of the create-recipe dialog form. */
export const CreateRecipe: Story = {
  render: () => (
    <div className='w-full max-w-lg rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Create Recipe</h2>
        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>Create a new recipe from your invoice ingredients.</p>
      </div>

      <div className='space-y-4 p-6'>
        {/* Recipe name */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <label className='text-sm font-medium'>Recipe Name</label>
            <button className='flex items-center gap-1 rounded-md border px-2 py-1 text-xs'>
              <TbSparkles className='h-3 w-3' />
              Generate Name
            </button>
          </div>
          <input
            className='w-full rounded-md border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'
            defaultValue='Herb-Roasted Chicken'
            readOnly
          />
        </div>

        {/* Description */}
        <div className='space-y-2'>
          <label className='text-sm font-medium'>Description</label>
          <textarea
            className='w-full rounded-md border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'
            rows={2}
            defaultValue='A simple and delicious herb-roasted chicken with garlic and rosemary.'
            readOnly
          />
        </div>

        {/* Ingredients */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <label className='text-sm font-medium'>Ingredients</label>
            <button className='flex items-center gap-1 rounded-md border px-2 py-1 text-xs'>
              <TbPlus className='h-3 w-3' />
              Add
            </button>
          </div>
          <div className='space-y-2'>
            {sampleIngredients.map((ingredient) => (
              <div
                key={ingredient}
                className='flex items-center gap-2'>
                <input
                  className='flex-1 rounded-md border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'
                  defaultValue={ingredient}
                  readOnly
                />
                <button className='rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-800'>
                  <TbX className='h-4 w-4 text-gray-400' />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Difficulty */}
        <div className='space-y-2'>
          <label className='text-sm font-medium'>Difficulty</label>
          <div className='w-full rounded-md border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'>Easy</div>
        </div>

        {/* Instructions */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <label className='text-sm font-medium'>Instructions</label>
            <button className='flex items-center gap-1 rounded-md border px-2 py-1 text-xs'>
              <TbWand className='h-3 w-3' />
              Enhance
            </button>
          </div>
          <textarea
            className='w-full rounded-md border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'
            rows={4}
            defaultValue={
              "1. Preheat oven to 200°C.\n2. Season chicken with salt, pepper, and rosemary.\n3. Heat olive oil, sear chicken 3 min per side.\n4. Transfer to oven, roast 25 min until golden."
            }
            readOnly
          />
        </div>

        {/* Prep & Cook Time */}
        <div className='grid grid-cols-2 gap-4'>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Prep Time</label>
            <div className='flex items-center'>
              <TbClock className='mr-2 h-4 w-4 text-gray-400' />
              <input
                className='w-full rounded-md border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'
                defaultValue='15 min'
                readOnly
              />
            </div>
          </div>
          <div className='space-y-2'>
            <label className='text-sm font-medium'>Cook Time</label>
            <div className='flex items-center'>
              <TbToolsKitchen className='mr-2 h-4 w-4 text-gray-400' />
              <input
                className='w-full rounded-md border px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800'
                defaultValue='25 min'
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
          <TbDisc className='h-4 w-4' />
          Create Recipe
        </button>
      </div>
    </div>
  ),
};

/** Static preview of a read-only recipe view. */
export const ViewRecipe: Story = {
  render: () => (
    <div className='w-full max-w-lg rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      <div className='border-b p-6'>
        <h2 className='text-lg font-semibold'>Herb-Roasted Chicken</h2>
        <p className='mt-1 text-sm text-gray-500 dark:text-gray-400'>
          A simple and delicious herb-roasted chicken with garlic and rosemary.
        </p>
      </div>

      <div className='space-y-4 p-6'>
        {/* Meta badges */}
        <div className='flex flex-wrap gap-2'>
          <span className='flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400'>
            Easy
          </span>
          <span className='flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'>
            <TbClock className='h-3 w-3' />
            15 min prep
          </span>
          <span className='flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'>
            <TbToolsKitchen className='h-3 w-3' />
            25 min cook
          </span>
        </div>

        {/* Ingredients */}
        <div>
          <h3 className='mb-2 text-sm font-semibold'>Ingredients</h3>
          <ul className='list-disc space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300'>
            {sampleIngredients.map((ingredient) => (
              <li key={ingredient}>{ingredient}</li>
            ))}
          </ul>
        </div>

        {/* Instructions */}
        <div>
          <h3 className='mb-2 text-sm font-semibold'>Instructions</h3>
          <ol className='list-decimal space-y-1 pl-5 text-sm text-gray-600 dark:text-gray-300'>
            <li>Preheat oven to 200°C.</li>
            <li>Season chicken with salt, pepper, and rosemary.</li>
            <li>Heat olive oil, sear chicken 3 min per side.</li>
            <li>Transfer to oven, roast 25 min until golden.</li>
          </ol>
        </div>
      </div>
    </div>
  ),
};
