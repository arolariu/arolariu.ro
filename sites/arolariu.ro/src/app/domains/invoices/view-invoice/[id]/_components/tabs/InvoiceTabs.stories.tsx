import type {Meta, StoryObj} from "@storybook/react";
import {TbChefHat, TbClock, TbExternalLink, TbInfoCircle} from "react-icons/tb";

/**
 * Static visual preview of the InvoiceTabs component.
 *
 * @remarks Static preview — component uses `useInvoice` hook which imports "use server"
 * action (fetchInvoice from `@/lib/actions/invoices/fetchInvoice`) that cannot be bundled
 * by Storybook's Vite/Rollup. Also depends on `useInvoiceContext` for recipes and metadata.
 * This story renders a faithful HTML replica showing the "Possible Recipes" and
 * "Additional Info" tabs.
 */
const meta = {
  title: "Invoices/ViewInvoice/InvoiceTabs",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default with recipe cards visible. */
export const WithRecipes: Story = {
  render: () => (
    <div className='rounded-xl border transition-shadow duration-300 hover:shadow-md'>
      <div className='p-6 pb-0'>
        <div className='grid w-full grid-cols-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800'>
          <button className='flex items-center justify-center gap-2 rounded-md bg-white py-1.5 text-sm font-medium shadow-sm dark:bg-gray-700'>
            <TbChefHat className='h-4 w-4' />
            Possible Recipes
          </button>
          <button className='flex items-center justify-center gap-2 py-1.5 text-sm text-gray-500'>
            <TbInfoCircle className='h-4 w-4' />
            Additional Info
          </button>
        </div>
      </div>

      <div className='space-y-3 p-6'>
        {[
          {name: "Pasta Carbonara", complexity: "Normal", duration: 35, prep: 15, cook: 20},
          {name: "Caesar Salad", complexity: "Easy", duration: 15, prep: 15, cook: 0},
        ].map((recipe) => (
          <div
            key={recipe.name}
            className='rounded-lg border p-4 transition-shadow hover:shadow-md'>
            <div className='flex items-center justify-between'>
              <h4 className='font-semibold'>{recipe.name}</h4>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  recipe.complexity === "Easy"
                    ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                }`}>
                {recipe.complexity}
              </span>
            </div>
            <p className='mt-1 text-sm text-gray-500'>A classic recipe using ingredients from your purchase.</p>
            <div className='mt-2 flex items-center gap-2 text-xs text-gray-500'>
              <TbClock className='h-4 w-4' />
              <span>{recipe.duration} min</span>
              <span className='text-gray-300'>•</span>
              <span>
                Prep: {recipe.prep}m, Cook: {recipe.cook}m
              </span>
            </div>
            <button className='mt-2 flex items-center gap-1 text-sm text-blue-600 hover:underline'>
              View Recipe
              <TbExternalLink className='h-3 w-3' />
            </button>
          </div>
        ))}
      </div>
    </div>
  ),
};

/** Empty recipes state. */
export const EmptyRecipes: Story = {
  render: () => (
    <div className='rounded-xl border'>
      <div className='p-6 pb-0'>
        <div className='grid w-full grid-cols-2 rounded-lg bg-gray-100 p-1 dark:bg-gray-800'>
          <button className='flex items-center justify-center gap-2 rounded-md bg-white py-1.5 text-sm font-medium shadow-sm dark:bg-gray-700'>
            <TbChefHat className='h-4 w-4' />
            Possible Recipes
          </button>
          <button className='flex items-center justify-center gap-2 py-1.5 text-sm text-gray-500'>
            <TbInfoCircle className='h-4 w-4' />
            Additional Info
          </button>
        </div>
      </div>
      <div className='flex flex-col items-center justify-center p-12'>
        <TbChefHat className='text-muted-foreground/50 h-12 w-12' />
        <p className='mt-2 text-sm text-gray-500'>No recipes available for this invoice.</p>
      </div>
    </div>
  ),
};
