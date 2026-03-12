import type {Meta, StoryObj} from "@storybook/react";

/**
 * NutritionCard displays nutritional insights from grocery invoice items,
 * showing food group breakdowns, balance scores, and dietary suggestions.
 * Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the nutrition card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/NutritionCard",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the nutrition insights card. */
export const Preview: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='flex items-center gap-2 text-lg font-semibold'>🥗 Nutrition Insights</h3>
      </div>
      <div className='space-y-4 p-4'>
        <div className='grid grid-cols-2 gap-3'>
          {[
            {name: "Dairy", icon: "🥛", items: 3, pct: 25},
            {name: "Fruits", icon: "🍎", items: 4, pct: 30},
            {name: "Meat", icon: "🥩", items: 2, pct: 20},
            {name: "Grains", icon: "🌾", items: 3, pct: 25},
          ].map((group) => (
            <div
              key={group.name}
              className='rounded-md border p-3 dark:border-gray-700'>
              <div className='flex items-center gap-2'>
                <span>{group.icon}</span>
                <span className='text-sm font-medium'>{group.name}</span>
              </div>
              <p className='text-xs text-gray-500'>{group.items} items</p>
              <div className='mt-1 h-1.5 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700'>
                <div
                  className='h-full rounded bg-green-500'
                  style={{width: `${String(group.pct)}%`}}
                />
              </div>
            </div>
          ))}
        </div>
        <div className='rounded-md bg-green-50 p-3 text-center dark:bg-green-900/20'>
          <p className='text-sm font-medium text-green-700 dark:text-green-300'>Balance Score: Good</p>
          <p className='text-xs text-gray-500'>Your grocery selection is well-balanced</p>
        </div>
      </div>
    </div>
  ),
};
