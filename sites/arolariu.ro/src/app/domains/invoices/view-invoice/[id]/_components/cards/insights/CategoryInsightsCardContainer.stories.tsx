import type {Meta, StoryObj} from "@storybook/react";
import {TbChefHat, TbLeaf, TbShoppingCart, TbToolsKitchen2, TbTruck} from "react-icons/tb";

/**
 * Static visual preview of the CategoryInsightsCardContainer component.
 *
 * The actual component depends on `useInvoiceContext` and switches between
 * NutritionCard, DiningCard, HomeInventoryCard, VehicleCard,
 * CategorySuggestionCard, and GeneralExpenseCard based on the invoice category.
 *
 * This story shows a representative card for each category.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/CategoryInsightsContainer",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Grocery category — nutrition-focused insights. */
export const GroceryCategory: Story = {
  render: () => (
    <div className='rounded-xl border p-5'>
      <div className='mb-4 flex items-center gap-2'>
        <div className='rounded-lg bg-green-100 p-2 dark:bg-green-900/50'>
          <TbLeaf className='h-5 w-5 text-green-600' />
        </div>
        <div>
          <h3 className='font-semibold'>Nutrition Insights</h3>
          <p className='text-xs text-gray-500'>Based on your grocery purchase</p>
        </div>
      </div>
      <div className='space-y-3'>
        <div className='rounded-lg bg-green-50 p-3 dark:bg-green-900/20'>
          <p className='text-sm font-medium'>Estimated Calories</p>
          <p className='text-2xl font-bold text-green-600'>~2,450 kcal</p>
        </div>
        <div className='grid grid-cols-3 gap-2 text-center text-xs'>
          <div className='rounded-md bg-gray-50 p-2 dark:bg-gray-800'>
            <p className='font-medium'>Protein</p>
            <p className='text-sm font-bold'>85g</p>
          </div>
          <div className='rounded-md bg-gray-50 p-2 dark:bg-gray-800'>
            <p className='font-medium'>Carbs</p>
            <p className='text-sm font-bold'>320g</p>
          </div>
          <div className='rounded-md bg-gray-50 p-2 dark:bg-gray-800'>
            <p className='font-medium'>Fat</p>
            <p className='text-sm font-bold'>65g</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

/** Dining category — restaurant insights. */
export const DiningCategory: Story = {
  render: () => (
    <div className='rounded-xl border p-5'>
      <div className='mb-4 flex items-center gap-2'>
        <div className='rounded-lg bg-orange-100 p-2 dark:bg-orange-900/50'>
          <TbToolsKitchen2 className='h-5 w-5 text-orange-600' />
        </div>
        <div>
          <h3 className='font-semibold'>Dining Insights</h3>
          <p className='text-xs text-gray-500'>Restaurant spending analysis</p>
        </div>
      </div>
      <div className='space-y-2 text-sm'>
        <div className='flex justify-between'>
          <span className='text-gray-500'>Tip amount</span>
          <span className='font-medium'>$8.50 (18%)</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-500'>Avg. per person</span>
          <span className='font-medium'>$24.50</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-500'>Cuisine type</span>
          <span className='font-medium'>Italian</span>
        </div>
      </div>
    </div>
  ),
};

/** Vehicle category — auto expense insights. */
export const VehicleCategory: Story = {
  render: () => (
    <div className='rounded-xl border p-5'>
      <div className='mb-4 flex items-center gap-2'>
        <div className='rounded-lg bg-blue-100 p-2 dark:bg-blue-900/50'>
          <TbTruck className='h-5 w-5 text-blue-600' />
        </div>
        <div>
          <h3 className='font-semibold'>Vehicle Insights</h3>
          <p className='text-xs text-gray-500'>Auto expense analysis</p>
        </div>
      </div>
      <div className='space-y-2 text-sm'>
        <div className='flex justify-between'>
          <span className='text-gray-500'>Fuel cost/gallon</span>
          <span className='font-medium'>$3.45</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-500'>Total gallons</span>
          <span className='font-medium'>14.2 gal</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-500'>Monthly avg.</span>
          <span className='font-medium'>$180.00</span>
        </div>
      </div>
    </div>
  ),
};

/** Undefined category — suggestion card. */
export const CategorySuggestion: Story = {
  render: () => (
    <div className='rounded-xl border p-5'>
      <div className='mb-4 flex items-center gap-2'>
        <div className='rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900/50'>
          <TbShoppingCart className='h-5 w-5 text-yellow-600' />
        </div>
        <div>
          <h3 className='font-semibold'>Category Not Set</h3>
          <p className='text-xs text-gray-500'>We detected this might be a grocery purchase</p>
        </div>
      </div>
      <div className='space-y-3'>
        <p className='text-sm text-gray-600 dark:text-gray-400'>
          Set a category to unlock detailed insights for this invoice.
        </p>
        <div className='flex gap-2'>
          {["Grocery", "Dining", "Home"].map((cat) => (
            <button
              key={cat}
              className='rounded-full border px-3 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800'>
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  ),
};

/** General expense fallback. */
export const GeneralExpense: Story = {
  render: () => (
    <div className='rounded-xl border p-5'>
      <div className='mb-4 flex items-center gap-2'>
        <div className='rounded-lg bg-gray-100 p-2 dark:bg-gray-800'>
          <TbChefHat className='h-5 w-5 text-gray-600' />
        </div>
        <div>
          <h3 className='font-semibold'>General Expense</h3>
          <p className='text-xs text-gray-500'>Basic spending analysis</p>
        </div>
      </div>
      <div className='space-y-2 text-sm'>
        <div className='flex justify-between'>
          <span className='text-gray-500'>Total spent</span>
          <span className='font-medium'>$67.30</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-gray-500'>Items count</span>
          <span className='font-medium'>8 items</span>
        </div>
      </div>
    </div>
  ),
};
