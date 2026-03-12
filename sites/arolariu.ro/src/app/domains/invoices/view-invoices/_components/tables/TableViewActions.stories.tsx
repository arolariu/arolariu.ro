import type {Meta, StoryObj} from "@storybook/react";

/**
 * TableViewActions renders a dropdown menu with edit, share, and
 * delete actions for individual invoice rows. Depends on
 * `useDialog` context and `useTranslations`.
 *
 * This story renders a static preview of the actions dropdown.
 */
const meta = {
  title: "Invoices/ViewInvoices/Views/TableViewActions",
  component: undefined as never,
  decorators: [
    (Story) => (
      <div className='flex min-h-[200px] items-start justify-center pt-8'>
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

/** Preview of the actions dropdown menu (expanded). */
export const Preview: Story = {
  render: () => (
    <div className='w-40 rounded-lg border bg-white shadow-lg dark:border-gray-700 dark:bg-gray-900'>
      <div className='p-1'>
        <button
          type='button'
          className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>
          ✏️ Edit
        </button>
        <button
          type='button'
          className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800'>
          🔗 Share
        </button>
        <hr className='my-1 border-gray-200 dark:border-gray-700' />
        <button
          type='button'
          className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'>
          🗑 Delete
        </button>
      </div>
    </div>
  ),
};

/** Collapsed state — just the trigger button. */
export const Collapsed: Story = {
  render: () => (
    <button
      type='button'
      className='rounded-md border bg-white p-2 shadow-sm dark:border-gray-700 dark:bg-gray-900'>
      <span className='text-gray-500'>☰</span>
    </button>
  ),
};

/** Dark mode variant. */
export const DarkMode: Story = {
  render: Preview.render,
  parameters: {
    themes: {themeOverride: "dark"},
  },
};
