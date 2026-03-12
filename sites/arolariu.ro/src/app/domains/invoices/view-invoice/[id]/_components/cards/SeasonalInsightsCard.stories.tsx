import type {Meta, StoryObj} from "@storybook/react";

/**
 * SeasonalInsightsCard detects and displays seasonal spending patterns
 * and provides actionable insights. Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the seasonal insights card.
 */
const meta = {
  title: "Invoices/ViewInvoice/Cards/SeasonalInsights",
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

/** December holiday season insights. */
export const HolidaySeason: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='flex items-center gap-2 text-lg font-semibold'>✨ Seasonal Insights</h3>
      </div>
      <div className='space-y-4 p-4'>
        <div>
          <div className='flex justify-between text-sm'>
            <span className='text-gray-500'>Spending so far in December</span>
            <span className='font-medium'>$1,245.00</span>
          </div>
          <div className='mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700'>
            <div
              className='h-full rounded-full bg-blue-600'
              style={{width: "69%"}}
            />
          </div>
          <div className='mt-1 flex justify-between text-xs text-gray-500'>
            <span>vs. December average: $1,800.00</span>
            <span>69%</span>
          </div>
        </div>
        <div className='space-y-2'>
          <div className='flex items-start gap-3 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20'>
            <span className='mt-0.5 text-blue-600'>✨</span>
            <div>
              <p className='text-sm font-medium'>Holiday Season</p>
              <p className='text-xs text-gray-600 dark:text-gray-400'>Spending tends to increase during the holiday season.</p>
            </div>
          </div>
          <div className='flex items-start gap-3 rounded-md bg-green-50 p-3 dark:bg-green-900/20'>
            <span className='mt-0.5 text-green-600'>💡</span>
            <div>
              <p className='text-sm font-medium'>Stock Up Tip</p>
              <p className='text-xs text-gray-600 dark:text-gray-400'>Consider buying non-perishables early for better deals.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  ),
};

/** Normal spending pattern. */
export const NormalPattern: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='flex items-center gap-2 text-lg font-semibold'>✨ Seasonal Insights</h3>
      </div>
      <div className='space-y-4 p-4'>
        <div className='flex items-start gap-3 rounded-md bg-green-50 p-3 dark:bg-green-900/20'>
          <span className='mt-0.5 text-green-600'>🛍</span>
          <div>
            <p className='text-sm font-medium'>Normal Spending</p>
            <p className='text-xs text-gray-600 dark:text-gray-400'>Your spending patterns look consistent with your historical average.</p>
          </div>
        </div>
      </div>
    </div>
  ),
};
