import type {Meta, StoryObj} from "@storybook/react";

/**
 * InvoicesHeader renders the header for the invoices list page with title,
 * description, and action buttons (import, export, print, new invoice).
 * Depends on `useDialog`.
 *
 * This story renders a static preview of the invoices header.
 */
const meta = {
  title: "Invoices/ViewInvoices/InvoicesHeader",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default invoices header with all action buttons. */
export const Preview: Story = {
  render: () => (
    <div className='flex flex-col gap-4 border-b bg-white px-6 py-4 md:flex-row md:items-center md:justify-between dark:bg-gray-900'>
      <div>
        <h1 className='text-2xl font-bold tracking-tight'>My Invoices</h1>
        <p className='text-sm text-gray-500 dark:text-gray-400'>View and manage all your invoices</p>
      </div>
      <div className='flex gap-2'>
        <button
          type='button'
          className='flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600'>
          📤 Import
        </button>
        <button
          type='button'
          className='flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600'>
          📥 Export
        </button>
        <button
          type='button'
          className='flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-600'>
          🖨 Print
        </button>
        <button
          type='button'
          className='flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700'>
          ➕ New Invoice
        </button>
      </div>
    </div>
  ),
};
