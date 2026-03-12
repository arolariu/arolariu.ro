import type {Meta, StoryObj} from "@storybook/react";

/**
 * ShoppingCalendarCard shows a calendar heat map of spending by day with
 * month statistics and shopping pattern insights. Depends on `useInvoiceContext`
 * and `useInvoicesStore`.
 *
 * This story renders a static preview of the shopping calendar card.
 */
const meta = {
  title: "Invoices/ViewInvoice/Cards/ShoppingCalendar",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the shopping calendar with heat map legend and stats. */
export const Preview: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='flex items-center gap-2 text-lg font-semibold'>
          📅 Shopping Calendar
          <span
            className='text-gray-400'
            title='Based on cached invoices'>
            ℹ️
          </span>
        </h3>
      </div>
      <div className='flex flex-col items-center space-y-4 p-4'>
        {/* Calendar placeholder */}
        <div className='grid w-full grid-cols-7 gap-1 rounded-md border p-3 dark:border-gray-700'>
          {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
            <div
              key={`header-${String(i)}`}
              className='py-1 text-center text-xs font-medium text-gray-500'>
              {day}
            </div>
          ))}
          {Array.from({length: 31}, (_, i) => {
            const intensity = [0, 0, 1, 0, 2, 0, 0, 0, 3, 0, 0, 1, 0, 0, 4, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 3, 0, 0, 0, 0, 2];
            const bgClasses = [
              "bg-transparent",
              "bg-green-100 dark:bg-green-900/30",
              "bg-green-200 dark:bg-green-800/40",
              "bg-green-400 dark:bg-green-600/50",
              "bg-green-600 text-white dark:bg-green-500",
            ];
            return (
              <div
                key={`day-${String(i)}`}
                className={`flex h-8 w-8 items-center justify-center rounded text-xs ${bgClasses[intensity[i]!]}`}>
                {i + 1}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className='flex items-center gap-2 text-xs text-gray-500'>
          <span>Less</span>
          <div className='flex gap-0.5'>
            <div className='h-3 w-3 rounded bg-gray-200 dark:bg-gray-700' />
            <div className='h-3 w-3 rounded bg-green-200 dark:bg-green-800' />
            <div className='h-3 w-3 rounded bg-green-400 dark:bg-green-600' />
            <div className='h-3 w-3 rounded bg-green-600 dark:bg-green-500' />
          </div>
          <span>More</span>
        </div>

        <hr className='w-full' />

        {/* Stats */}
        <div className='grid w-full grid-cols-2 gap-3'>
          <div className='flex items-center gap-2 rounded-md border p-3 dark:border-gray-700'>
            <span className='text-gray-400'>🛒</span>
            <div>
              <p className='text-xs text-gray-500'>Month Total</p>
              <p className='text-sm font-semibold'>$485.30</p>
            </div>
          </div>
          <div className='flex items-center gap-2 rounded-md border p-3 dark:border-gray-700'>
            <span className='text-gray-400'>📅</span>
            <div>
              <p className='text-xs text-gray-500'>Shopping Days</p>
              <p className='text-sm font-semibold'>8</p>
            </div>
          </div>
        </div>

        {/* Insight */}
        <div className='flex w-full items-center gap-2 rounded-md border p-3 text-sm dark:border-gray-700'>
          <span className='text-gray-400'>📈</span>
          <p>
            You shop every <strong>4 days</strong> on average, spending <strong>$60.66</strong> per trip.
          </p>
        </div>
      </div>
    </div>
  ),
};
