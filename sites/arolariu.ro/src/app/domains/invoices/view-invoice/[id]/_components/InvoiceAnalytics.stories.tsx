import type {Meta, StoryObj} from "@storybook/react";
import {TbChartBar, TbTrendingUp} from "react-icons/tb";

/**
 * Static visual preview of the InvoiceAnalytics component.
 *
 * @remarks Static preview — component uses `useInvoice` hook which imports "use server"
 * action (fetchInvoice from `@/lib/actions/invoices/fetchInvoice`) that cannot be bundled
 * by Storybook's Vite/Rollup. Also depends on `useInvoiceContext` and `useUserInformation`.
 * This story renders a faithful HTML replica of the analytics dashboard with summary stats
 * and chart placeholders.
 */
const meta = {
  title: "Invoices/ViewInvoice/InvoiceAnalytics",
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className='max-w-5xl p-4'>
        <Story />
      </div>
    ),
  ],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default analytics dashboard with current invoice tab. */
export const Default: Story = {
  render: () => (
    <div className='rounded-xl border bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900'>
      {/* Tab Header */}
      <div className='flex items-center justify-between border-b p-6'>
        <div className='flex items-center gap-2'>
          <TbChartBar className='h-5 w-5 text-gray-400' />
          <h2 className='text-lg font-semibold'>Invoice Analytics</h2>
        </div>
        <div className='flex rounded-lg border'>
          <button className='flex items-center gap-1.5 rounded-l-lg bg-gray-100 px-3 py-1.5 text-sm font-medium dark:bg-gray-800'>
            <TbChartBar className='h-3.5 w-3.5' />
            Current
          </button>
          <button className='flex items-center gap-1.5 rounded-r-lg px-3 py-1.5 text-sm text-gray-500'>
            <TbTrendingUp className='h-3.5 w-3.5' />
            Compare
          </button>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className='grid gap-4 p-6 md:grid-cols-2'>
        {/* Summary Stats */}
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 text-sm font-medium text-gray-500'>Summary</h3>
          <div className='grid grid-cols-2 gap-4'>
            <div>
              <p className='text-2xl font-bold'>€42.75</p>
              <p className='text-xs text-gray-500'>Total Amount</p>
            </div>
            <div>
              <p className='text-2xl font-bold'>12</p>
              <p className='text-xs text-gray-500'>Items Purchased</p>
            </div>
            <div>
              <p className='text-2xl font-bold'>€3.56</p>
              <p className='text-xs text-gray-500'>Average Price</p>
            </div>
            <div>
              <p className='text-2xl font-bold'>4</p>
              <p className='text-xs text-gray-500'>Categories</p>
            </div>
          </div>
        </div>

        {/* Spending by Category */}
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 text-sm font-medium text-gray-500'>Spending by Category</h3>
          <div className='space-y-2'>
            {[
              {name: "Dairy", pct: 35, color: "bg-blue-500"},
              {name: "Bakery", pct: 25, color: "bg-green-500"},
              {name: "Produce", pct: 22, color: "bg-orange-500"},
              {name: "Other", pct: 18, color: "bg-gray-400"},
            ].map((cat) => (
              <div key={cat.name}>
                <div className='flex justify-between text-xs'>
                  <span>{cat.name}</span>
                  <span className='text-gray-500'>{cat.pct}%</span>
                </div>
                <div className='mt-1 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800'>
                  <div
                    className={`h-full rounded-full ${cat.color}`}
                    style={{width: `${String(cat.pct)}%`}}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Price Distribution */}
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 text-sm font-medium text-gray-500'>Price Distribution</h3>
          <div className='flex h-32 items-end justify-around'>
            {[30, 55, 80, 45, 65, 40, 25].map((h, i) => (
              <div
                key={i}
                className='w-6 rounded-t bg-purple-400 dark:bg-purple-600'
                style={{height: `${String(h)}%`}}
              />
            ))}
          </div>
          <div className='mt-2 flex justify-between text-xs text-gray-400'>
            <span>€0</span>
            <span>€5</span>
            <span>€10</span>
            <span>€15</span>
            <span>€20+</span>
          </div>
        </div>

        {/* Items Breakdown (full width) */}
        <div className='rounded-lg border p-4 md:col-span-2'>
          <h3 className='mb-3 text-sm font-medium text-gray-500'>Items Breakdown</h3>
          <div className='grid grid-cols-4 gap-2'>
            {["Whole Milk", "Bread", "Eggs", "Bananas", "Cheese", "Butter", "Yogurt", "Apples"].map((item) => (
              <div
                key={item}
                className='rounded-md border p-2 text-center text-xs'>
                {item}
              </div>
            ))}
          </div>
        </div>
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
