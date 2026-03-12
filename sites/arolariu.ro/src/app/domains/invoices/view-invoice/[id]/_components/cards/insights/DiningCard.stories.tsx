import type {Meta, StoryObj} from "@storybook/react";

/**
 * DiningCard displays dining-related insights from restaurant/fast-food invoices,
 * including estimated calories, cost per person, and dining tips.
 * Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the dining card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/DiningCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the dining insights card. */
export const Preview: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='flex items-center gap-2 text-lg font-semibold'>🍽 Dining Insights</h3>
      </div>
      <div className='space-y-4 p-4'>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-md border p-3 text-center dark:border-gray-700'>
            <span className='text-2xl'>🔥</span>
            <p className='text-lg font-bold'>1,820</p>
            <p className='text-xs text-gray-500'>Est. Calories</p>
          </div>
          <div className='rounded-md border p-3 text-center dark:border-gray-700'>
            <span className='text-2xl'>👥</span>
            <p className='text-lg font-bold'>$18.50</p>
            <p className='text-xs text-gray-500'>Cost / Person</p>
          </div>
        </div>
        <div className='space-y-2'>
          <div className='flex items-start gap-2 rounded-md bg-amber-50 p-3 dark:bg-amber-900/20'>
            <span className='mt-0.5'>⚠️</span>
            <div>
              <p className='text-sm font-medium'>High Calorie Meal</p>
              <p className='text-xs text-gray-600 dark:text-gray-400'>This meal exceeds typical recommended intake.</p>
            </div>
          </div>
          <div className='flex items-start gap-2 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20'>
            <span className='mt-0.5'>💡</span>
            <div>
              <p className='text-sm font-medium'>Budget Tip</p>
              <p className='text-xs text-gray-600 dark:text-gray-400'>Cooking at home could save up to 60% per meal.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};
