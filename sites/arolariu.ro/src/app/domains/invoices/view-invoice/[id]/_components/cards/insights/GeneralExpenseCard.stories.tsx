import type {Meta, StoryObj} from "@storybook/react";

/**
 * GeneralExpenseCard displays general expense insights including auto-detected
 * category, budget impact analysis, tax/business options, and similar past purchases.
 * Depends on `useInvoiceContext`.
 *
 * This story renders a static preview of the general expense card layout.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/GeneralExpenseCard",
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Preview of the general expense insights card. */
export const Preview: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <h3 className='flex items-center gap-2 text-lg font-semibold'>📊 General Expense Insights</h3>
      </div>
      <div className='space-y-4 p-4'>
        {/* Auto-detected Category */}
        <div>
          <p className='mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase'>Auto-Detected Category</p>
          <div className='flex items-center justify-between rounded-md border p-3 dark:border-gray-700'>
            <div className='flex items-center gap-2'>
              <span>🏷️</span>
              <span className='text-sm font-medium'>Electronics &amp; Gadgets</span>
            </div>
            <span className='rounded-full bg-gray-100 px-2 py-0.5 text-xs dark:bg-gray-800'>87% confidence</span>
          </div>
          <div className='mt-2 flex gap-2'>
            <button
              type='button'
              className='rounded border px-3 py-1 text-xs'>
              ✓ Correct
            </button>
            <button
              type='button'
              className='rounded px-3 py-1 text-xs text-gray-500'>
              ↻ Change
            </button>
          </div>
        </div>

        {/* Budget Impact */}
        <div>
          <p className='mb-2 text-xs font-semibold tracking-wider text-gray-500 uppercase'>Budget Impact</p>
          <div className='space-y-3'>
            {[
              {name: "Electronics", spent: 450, limit: 500, pct: 90},
              {name: "Entertainment", spent: 120, limit: 300, pct: 40},
              {name: "Shopping", spent: 280, limit: 400, pct: 70},
            ].map((b) => (
              <div key={b.name}>
                <div className='flex justify-between text-xs'>
                  <span>{b.name}</span>
                  <span className={b.pct >= 90 ? "text-red-500" : "text-gray-500"}>
                    {b.spent} / {b.limit} RON
                  </span>
                </div>
                <div className='mt-1 h-2 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700'>
                  <div
                    className={`h-full rounded ${b.pct >= 90 ? "bg-red-500" : b.pct >= 60 ? "bg-yellow-500" : "bg-green-500"}`}
                    style={{width: `${String(b.pct)}%`}}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className='mt-2 text-xs text-red-500'>⚠ Electronics budget at 90% — nearing limit!</p>
        </div>

        {/* Tax Options */}
        <div>
          <p className='mb-2 flex items-center gap-1 text-xs font-semibold tracking-wider text-gray-500 uppercase'>📄 Tax &amp; Business</p>
          <div className='space-y-2'>
            {["Mark as business expense", "Track warranty", "Add to insurance inventory"].map((label) => (
              <label
                key={label}
                className='flex items-center gap-2 text-sm'>
                <input
                  type='checkbox'
                  className='rounded'
                />
                {label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  ),
};
