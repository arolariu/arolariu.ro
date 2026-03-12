import type {Meta, StoryObj} from "@storybook/react";

/**
 * HomeInventoryCard displays home inventory insights including supply
 * stock levels, eco-friendliness scores, and bulk-buying suggestions.
 * Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the home inventory card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/HomeInventoryCard",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the home inventory insights card. */
export const Preview: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='flex items-center gap-2 text-lg font-semibold'>🏠 Home Inventory</h3>
      </div>
      <div className='space-y-4 p-4'>
        {/* Supply Stock Levels */}
        <div>
          <p className='mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase'>Supply Stock Levels</p>
          <div className='space-y-3'>
            {[
              {name: "Laundry Detergent", icon: "💧", days: 45, max: 60, color: "bg-green-500"},
              {name: "Dish Soap", icon: "✨", days: 18, max: 30, color: "bg-yellow-500"},
              {name: "Paper Products", icon: "🧻", days: 30, max: 45, color: "bg-green-500"},
              {name: "Floor Cleaner", icon: "🧴", days: 60, max: 90, color: "bg-green-500"},
            ].map((supply) => (
              <div key={supply.name}>
                <div className='flex justify-between text-xs'>
                  <div className='flex items-center gap-1'>
                    <span>{supply.icon}</span>
                    <span>{supply.name}</span>
                  </div>
                  <span className='text-gray-500'>{supply.days} days remaining</span>
                </div>
                <div className='mt-1 h-1.5 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700'>
                  <div
                    className={`h-full rounded ${supply.color}`}
                    style={{width: `${String(Math.round((supply.days / supply.max) * 100))}%`}}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Eco Score */}
        <div className='rounded-md bg-green-50 p-3 dark:bg-green-900/20'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-1'>
              <span>🌱</span>
              <span className='text-sm font-medium'>Eco-Friendliness</span>
            </div>
            <div className='flex gap-0.5'>
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-sm ${star <= 3 ? "text-green-500" : "text-gray-300"}`}>
                  ⭐
                </span>
              ))}
            </div>
          </div>
          <ul className='mt-2 space-y-1 text-xs text-gray-600 dark:text-gray-400'>
            <li>• 2 products with eco-labels</li>
            <li>• 1 recyclable packaging</li>
            <li className='text-green-600 dark:text-green-400'>• Tip: Try concentrated versions to reduce plastic</li>
          </ul>
        </div>

        {/* Bulk Savings */}
        <div className='flex gap-2 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20'>
          <span>📦</span>
          <div>
            <p className='text-sm font-medium'>Bulk Buying Opportunity</p>
            <p className='text-xs text-gray-600 dark:text-gray-400'>Save ~120 RON/year by buying in bulk</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  render: Preview.render,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};

/** Mobile viewport variant. */
export const MobileViewport: Story = {
  render: Preview.render,
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
