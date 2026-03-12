import type {Meta, StoryObj} from "@storybook/react";
import {TbClock, TbDisc, TbPlus, TbSparkles, TbToolsKitchen3, TbWand} from "react-icons/tb";

/**
 * Static visual preview of the RecipeDialog component.
 *
 * The actual component is multi-mode (create/view/edit) and depends on
 * `useDialog` context, so this story renders a faithful HTML replica
 * of the "Create Recipe" form variant with ingredients and steps.
 */
const meta = {
  title: "Invoices/EditInvoice/Dialogs/RecipeDialog",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-2xl p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default "Create Recipe" form with fields and AI generation option. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Header */}
      <div className='border-b p-6'>
        <h2 className='flex items-center gap-2 text-lg font-semibold'>
          <TbToolsKitchen3 className='h-5 w-5 text-orange-500' />
          Create Recipe
        </h2>
        <p className='mt-1 text-sm text-gray-500'>Create a recipe from the items in this invoice.</p>
      </div>

      <div className='space-y-4 p-6'>
        {/* AI Generate Banner */}
        <div className='flex items-center justify-between rounded-lg border border-purple-200 bg-purple-50 p-3 dark:border-purple-800 dark:bg-purple-900/20'>
          <div className='flex items-center gap-2'>
            <TbSparkles className='h-5 w-5 text-purple-500' />
            <div>
              <p className='text-sm font-medium text-purple-800 dark:text-purple-300'>AI Recipe Generation</p>
              <p className='text-xs text-purple-600 dark:text-purple-400'>Automatically create a recipe from invoice items</p>
            </div>
          </div>
          <button className='flex items-center gap-1 rounded-md bg-purple-600 px-3 py-1.5 text-xs text-white hover:bg-purple-700'>
            <TbWand className='h-3.5 w-3.5' />
            Generate
          </button>
        </div>

        {/* Recipe Name */}
        <div className='space-y-1.5'>
          <label className='text-sm font-medium'>Recipe Name</label>
          <input
            className='w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none'
            placeholder='e.g., Pasta Carbonara'
            readOnly
          />
        </div>

        {/* Description */}
        <div className='space-y-1.5'>
          <label className='text-sm font-medium'>Description</label>
          <textarea
            className='w-full rounded-md border bg-transparent p-3 text-sm outline-none'
            rows={2}
            placeholder='A brief description of the recipe...'
            readOnly
          />
        </div>

        {/* Duration & Complexity */}
        <div className='grid grid-cols-2 gap-3'>
          <div className='space-y-1.5'>
            <label className='flex items-center gap-1 text-sm font-medium'>
              <TbClock className='h-4 w-4' />
              Duration (min)
            </label>
            <input
              type='number'
              className='w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none'
              placeholder='30'
              readOnly
            />
          </div>
          <div className='space-y-1.5'>
            <label className='text-sm font-medium'>Complexity</label>
            <select
              className='w-full rounded-md border bg-transparent px-3 py-2 text-sm outline-none'
              disabled>
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>
        </div>

        {/* Ingredients */}
        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <label className='text-sm font-medium'>Ingredients</label>
            <button className='flex items-center gap-1 text-xs text-purple-600'>
              <TbPlus className='h-3 w-3' />
              Add
            </button>
          </div>
          <div className='rounded-lg border p-2'>
            <div className='flex items-center gap-2 rounded-md bg-gray-50 px-2 py-1.5 text-sm dark:bg-gray-800'>
              <span className='text-gray-400'>1.</span>
              <span>Whole Milk 1L</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className='flex justify-end gap-2 border-t p-4'>
        <button className='rounded-md border px-4 py-2 text-sm'>Cancel</button>
        <button className='flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm text-white dark:bg-gray-100 dark:text-gray-900'>
          <TbDisc className='h-4 w-4' />
          Save Recipe
        </button>
      </div>
    </div>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  ...Default,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
