import type {Meta, StoryObj} from "@storybook/react";

/**
 * CategorySuggestionCard allows users to categorize their invoice by selecting
 * from main and extended category options. Uses a step-based UI with progress.
 * Depends on `useTranslations` and category utility data.
 *
 * This story renders a static preview of the category suggestion card.
 */
const meta = {
  title: "Invoices/ViewInvoice/Insights/CategorySuggestionCard",
  component: undefined as never,
  parameters: {
    layout: "centered",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Step 1 — main category selection. */
export const MainCategoryStep: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <div className='flex items-center justify-between'>
          <h3 className='flex items-center gap-2 text-lg font-semibold'>🎁 Categorize Invoice</h3>
          <span className='text-xs text-gray-500'>Step 1 of 2</span>
        </div>
        <div className='mt-2 h-1.5 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700'>
          <div
            className='h-full rounded bg-blue-600'
            style={{width: "50%"}}
          />
        </div>
      </div>
      <div className='space-y-3 p-4'>
        <p className='text-sm text-gray-500'>What type of purchase is this?</p>
        <div className='grid grid-cols-3 gap-2'>
          {[
            {icon: "🛒", label: "Groceries"},
            {icon: "🍽", label: "Dining"},
            {icon: "🏠", label: "Home"},
            {icon: "🚗", label: "Vehicle"},
            {icon: "🏥", label: "Healthcare"},
            {icon: "🎭", label: "Entertainment"},
          ].map((cat) => (
            <button
              key={cat.label}
              type='button'
              className='flex flex-col items-center gap-1 rounded-lg border p-3 text-sm hover:border-blue-500 dark:border-gray-700'>
              <span className='text-xl'>{cat.icon}</span>
              <span className='text-xs'>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  ),
};

/** Step 1 with a selection made. */
export const WithSelection: Story = {
  render: () => (
    <div className='rounded-lg border bg-white shadow-sm dark:bg-gray-900'>
      <div className='border-b p-4'>
        <div className='flex items-center justify-between'>
          <h3 className='flex items-center gap-2 text-lg font-semibold'>🎁 Categorize Invoice</h3>
          <span className='text-xs text-gray-500'>Step 1 of 2</span>
        </div>
        <div className='mt-2 h-1.5 w-full overflow-hidden rounded bg-gray-200 dark:bg-gray-700'>
          <div
            className='h-full rounded bg-blue-600'
            style={{width: "50%"}}
          />
        </div>
      </div>
      <div className='space-y-3 p-4'>
        <p className='text-sm text-gray-500'>What type of purchase is this?</p>
        <div className='grid grid-cols-3 gap-2'>
          {[
            {icon: "🛒", label: "Groceries", selected: true},
            {icon: "🍽", label: "Dining", selected: false},
            {icon: "🏠", label: "Home", selected: false},
          ].map((cat) => (
            <button
              key={cat.label}
              type='button'
              className={`flex flex-col items-center gap-1 rounded-lg border p-3 text-sm ${
                cat.selected ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200 dark:bg-blue-900/20" : "dark:border-gray-700"
              }`}>
              <span className='text-xl'>{cat.icon}</span>
              <span className='text-xs'>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  ),
};
