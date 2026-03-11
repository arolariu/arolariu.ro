import type {Meta, StoryObj} from "@storybook/react";

/**
 * BudgetImpactCard shows the monthly budget impact of an invoice including
 * progress bar, daily allowance, and remaining budget. Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the budget impact card.
 */
const meta = {
  title: "Invoices/ViewInvoice/BudgetImpactCard",
  decorators: [
    (Story) => (
      <div className='max-w-md'>
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

/** Under budget — healthy spending. */
export const UnderBudget: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='flex items-center gap-2 text-lg font-semibold'>💳 Budget Impact — January</h3>
      </div>
      <div className='space-y-4 p-4'>
        <div>
          <div className='flex justify-between text-sm'>
            <span>Monthly Budget</span>
            <span className='font-medium'>$2,000.00</span>
          </div>
          <div className='mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700'>
            <div
              className='h-full rounded-full bg-blue-600'
              style={{width: "45%"}}
            />
          </div>
          <div className='mt-1 flex justify-between text-xs text-gray-500'>
            <span>Spent: $900.00</span>
            <span>45%</span>
          </div>
        </div>
        <div className='rounded-md bg-blue-50 p-3 text-center dark:bg-blue-900/20'>
          <p className='text-xs text-gray-500'>This invoice used</p>
          <p className='text-2xl font-bold text-blue-600'>6.3%</p>
          <p className='text-xs text-gray-500'>of monthly budget</p>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-md border p-3 text-center dark:border-gray-700'>
            <p className='text-xs text-gray-500'>Remaining</p>
            <p className='text-lg font-bold text-green-600'>$1,100.00</p>
          </div>
          <div className='rounded-md border p-3 text-center dark:border-gray-700'>
            <p className='text-xs text-gray-500'>Days Left</p>
            <p className='text-lg font-bold'>16</p>
          </div>
        </div>
        <div className='flex items-center justify-between rounded-md border p-3 dark:border-gray-700'>
          <div>
            <p className='text-xs text-gray-500'>Daily Allowance</p>
            <p className='text-sm font-medium'>$68.75/day</p>
          </div>
          <span className='text-emerald-500'>📈</span>
        </div>
      </div>
    </div>
  ),
};

/** Over budget — warning state. */
export const OverBudget: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='flex items-center gap-2 text-lg font-semibold'>💳 Budget Impact — December</h3>
      </div>
      <div className='space-y-4 p-4'>
        <div>
          <div className='flex justify-between text-sm'>
            <span>Monthly Budget</span>
            <span className='font-medium'>$1,500.00</span>
          </div>
          <div className='mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700'>
            <div
              className='h-full rounded-full bg-red-500'
              style={{width: "100%"}}
            />
          </div>
          <div className='mt-1 flex justify-between text-xs text-gray-500'>
            <span>Spent: $1,680.00</span>
            <span>112%</span>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-md border p-3 text-center dark:border-gray-700'>
            <p className='text-xs text-gray-500'>Remaining</p>
            <p className='text-lg font-bold text-red-500'>$180.00</p>
            <p className='text-xs text-red-500'>Over Budget</p>
          </div>
          <div className='rounded-md border p-3 text-center dark:border-gray-700'>
            <p className='text-xs text-gray-500'>Days Left</p>
            <p className='text-lg font-bold'>5</p>
          </div>
        </div>
      </div>
    </div>
  ),
};

/** Budget impact card at mobile viewport width. */
export const MobileViewport: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='flex items-center gap-2 text-lg font-semibold'>💳 Budget Impact — January</h3>
      </div>
      <div className='space-y-4 p-4'>
        <div>
          <div className='flex justify-between text-sm'>
            <span>Monthly Budget</span>
            <span className='font-medium'>$2,000.00</span>
          </div>
          <div className='mt-2 h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700'>
            <div
              className='h-full rounded-full bg-blue-600'
              style={{width: "45%"}}
            />
          </div>
          <div className='mt-1 flex justify-between text-xs text-gray-500'>
            <span>Spent: $900.00</span>
            <span>45%</span>
          </div>
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <div className='rounded-md border p-3 text-center dark:border-gray-700'>
            <p className='text-xs text-gray-500'>Remaining</p>
            <p className='text-lg font-bold text-green-600'>$1,100.00</p>
          </div>
          <div className='rounded-md border p-3 text-center dark:border-gray-700'>
            <p className='text-xs text-gray-500'>Days Left</p>
            <p className='text-lg font-bold'>16</p>
          </div>
        </div>
      </div>
    </div>
  ),
  parameters: {
    viewport: {defaultViewport: "mobile1"},
  },
};
